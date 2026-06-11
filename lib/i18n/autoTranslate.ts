/**
 * Whole-app auto-translation layer.
 *
 * i18next only covers strings explicitly wrapped in t(). This engine covers
 * EVERYTHING ELSE: it watches the rendered DOM and translates every visible
 * text node into the active language, so any screen the user visits appears in
 * their chosen language — even text that was never hand-wired.
 *
 * Design goals (owner-confirmed):
 *  - English-first: text shows immediately in English, then quietly swaps to the
 *    chosen language once translated (never blanks, never blocks render).
 *  - Translate once, forever: every translated phrase is cached in localStorage
 *    per language, so repeat views are instant and work offline.
 *  - Names stay original: anything inside [data-no-translate] (student/teacher/
 *    parent/admin names) plus emails, IDs, numbers and URLs are never translated.
 *  - The Google key is never here — translation goes through our own backend.
 *
 * It is intentionally framework-agnostic (plain DOM) so it survives React
 * re-renders: each text node remembers its English source, so switching language
 * back to English restores the exact original, and React updates are re-detected.
 */
import i18n from 'i18next';
import { DEFAULT_LANGUAGE } from './languages';

const SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA', 'KBD', 'SAMP',
]);

// Per-node memory of {English source, translation we applied}. WeakMap so GC'd
// nodes don't leak. Lets us tell our own writes from fresh React content.
const registry = new WeakMap<Text, { src: string; applied: string }>();

// Active language for the current pass.
let currentLang = DEFAULT_LANGUAGE;

// localStorage-backed cache, lazily loaded per language: src(trimmed) -> translation.
const memCache = new Map<string, Map<string, string>>();

// Texts awaiting a network translation for the current language, and the nodes
// that should be refreshed once each arrives.
let pending = new Set<string>();
const nodesByText = new Map<string, Set<Text>>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let started = false;

// Retry bookkeeping for transient backend failures (cold start / offline).
const retryCounts = new Map<string, number>();
const MAX_RETRIES = 4;
let attemptRound = 1;

/* --------------------------------- cache -------------------------------- */

// Bump this when cache semantics change. v2 discards any English-poisoned
// entries written by an earlier version that cached degraded (failed) responses.
const CACHE_VERSION = 'v2';

function cacheStoreKey(lang: string) {
    return `auto_tr_${CACHE_VERSION}_${lang}`;
}

function langCache(lang: string): Map<string, string> {
    let c = memCache.get(lang);
    if (c) return c;
    c = new Map();
    try {
        const raw = localStorage.getItem(cacheStoreKey(lang));
        if (raw) {
            const obj = JSON.parse(raw) as Record<string, string>;
            for (const k in obj) c.set(k, obj[k]);
        }
    } catch { /* ignore corrupt cache */ }
    memCache.set(lang, c);
    return c;
}

function persistCacheSoon(lang: string) {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        try {
            const c = memCache.get(lang);
            if (!c) return;
            const obj: Record<string, string> = {};
            for (const [k, v] of c) obj[k] = v;
            localStorage.setItem(cacheStoreKey(lang), JSON.stringify(obj));
        } catch { /* storage full / unavailable — fine, mem cache still serves */ }
    }, 800);
}

/* ------------------------------ translatable ----------------------------- */

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RE_URL = /^(https?:\/\/|www\.)/i;
// School Global IDs and code-like tokens: e.g. SCH01_BR02_TCH_005, EXCEL_MAIN_STU_0001
const RE_CODE_ID = /^[A-Z0-9]+(_[A-Z0-9]+)+$/;
// Pure numbers / money / dates / punctuation — nothing to translate.
const RE_NO_LETTERS = /^[^\p{L}]+$/u;

/** Should this trimmed string be sent for translation at all? (exported for tests) */
export function isTranslatable(text: string): boolean {
    if (text.length < 2) return false;
    if (RE_NO_LETTERS.test(text)) return false;
    if (RE_EMAIL.test(text)) return false;
    if (RE_URL.test(text)) return false;
    if (RE_CODE_ID.test(text)) return false;
    return true;
}

/** Walk ancestors: skip if inside a no-translate / code / editable region. */
function isInSkippedSubtree(node: Node): boolean {
    let el: HTMLElement | null = node.parentElement;
    while (el) {
        if (SKIP_TAGS.has(el.tagName)) return true;
        if (el.hasAttribute('data-no-translate')) return true;
        if (el.isContentEditable) return true;
        // translate="no" is the standard HTML opt-out, honour it too.
        if (el.getAttribute('translate') === 'no') return true;
        el = el.parentElement;
    }
    return false;
}

/* ------------------------------- processing ------------------------------ */

function splitWhitespace(raw: string): { lead: string; core: string; trail: string } {
    const lead = raw.match(/^\s*/)?.[0] ?? '';
    const trail = raw.match(/\s*$/)?.[0] ?? '';
    const core = raw.slice(lead.length, raw.length - trail.length);
    return { lead, core, trail };
}

function applyToNode(node: Text) {
    const raw = node.nodeValue ?? '';
    if (!raw) return;

    const rec = registry.get(node);
    // If the DOM still holds the translation we applied, the true source is the
    // remembered English. Otherwise React wrote fresh content — treat as source.
    const isOurs = rec && rec.applied === raw;
    const source = isOurs ? rec!.src : raw;

    const { lead, core, trail } = splitWhitespace(source);
    if (!core || !isTranslatable(core)) {
        registry.delete(node);
        return;
    }

    if (currentLang === DEFAULT_LANGUAGE) {
        // Restore English exactly.
        if (raw !== source) {
            node.nodeValue = source;
        }
        registry.delete(node);
        return;
    }

    const cache = langCache(currentLang);
    const hit = cache.get(core);
    if (hit !== undefined) {
        const desired = lead + hit + trail;
        if (raw !== desired) node.nodeValue = desired;
        registry.set(node, { src: source, applied: desired });
        return;
    }

    // Cache miss: keep English visible now, queue for translation, remember the
    // source so a later React re-render doesn't lose it before the swap.
    registry.set(node, { src: source, applied: raw });
    queue(core, node);
}

function queue(core: string, node: Text) {
    pending.add(core);
    let set = nodesByText.get(core);
    if (!set) { set = new Set(); nodesByText.set(core, set); }
    set.add(node);
    if (!flushTimer) flushTimer = setTimeout(flush, 150);
}

async function flush() {
    flushTimer = null;
    const lang = currentLang;
    if (lang === DEFAULT_LANGUAGE || pending.size === 0) { pending.clear(); return; }

    const texts = Array.from(pending).slice(0, 200);
    pending = new Set(Array.from(pending).slice(200)); // keep overflow for next pass
    if (pending.size > 0 && !flushTimer) flushTimer = setTimeout(flush, 200);

    let translations: string[] = texts;
    let degraded = false;
    try {
        const res = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texts, target: lang }),
        });
        if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json?.translations)) translations = json.translations;
            // Backend signals it fell back to English (cold start / upstream error).
            if (json?.degraded) degraded = true;
        } else {
            degraded = true;
        }
    } catch {
        degraded = true; // offline / network error
    }

    // Language may have changed while the request was in flight.
    if (lang !== currentLang) return;

    // On failure, DO NOT cache (never poison the cache with English) — re-queue
    // for a bounded number of retries with backoff, then give up gracefully.
    if (degraded) {
        texts.forEach((src) => {
            const tries = (retryCounts.get(src) || 0) + 1;
            if (tries <= MAX_RETRIES) {
                retryCounts.set(src, tries);
                pending.add(src); // nodesByText mapping is still intact
            } else {
                nodesByText.delete(src);
            }
        });
        if (pending.size > 0 && !flushTimer) {
            flushTimer = setTimeout(flush, 1500 * Math.min(4, attemptRound++));
        }
        return;
    }

    const cache = langCache(lang);
    texts.forEach((src, i) => {
        const tr = translations[i] ?? src;
        cache.set(src, tr);
        const nodes = nodesByText.get(src);
        if (nodes) {
            for (const node of nodes) {
                // Only swap if our last applied value is still in place.
                const rec = registry.get(node);
                if (!rec) continue;
                if (node.nodeValue !== rec.applied) continue;
                const { lead, trail } = splitWhitespace(rec.src);
                const desired = lead + tr + trail;
                node.nodeValue = desired;
                registry.set(node, { src: rec.src, applied: desired });
            }
            nodesByText.delete(src);
        }
    });
    attemptRound = 1; // healthy again — reset backoff
    persistCacheSoon(lang);
}

/* -------------------------------- scanning ------------------------------- */

function scan(root: Node) {
    if (root.nodeType === Node.TEXT_NODE) {
        const t = root as Text;
        if (!isInSkippedSubtree(t)) applyToNode(t);
        return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
    const el = root as Element;
    if (el.nodeType === Node.ELEMENT_NODE && SKIP_TAGS.has(el.tagName)) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const batch: Text[] = [];
    let n = walker.nextNode();
    while (n) { batch.push(n as Text); n = walker.nextNode(); }
    for (const node of batch) {
        if (!isInSkippedSubtree(node)) applyToNode(node);
    }
}

let scanScheduled = false;
function scheduleFullScan() {
    if (scanScheduled) return;
    scanScheduled = true;
    requestAnimationFrame(() => {
        scanScheduled = false;
        if (document.body) scan(document.body);
    });
}

/* --------------------------------- public -------------------------------- */

/** Re-point the engine at a new language and refresh the whole screen. */
export function setAutoTranslateLanguage(lang: string) {
    currentLang = (lang || DEFAULT_LANGUAGE).toLowerCase().split('-')[0];
    // Drop any in-flight queue from the previous language.
    pending.clear();
    nodesByText.clear();
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    if (started) scheduleFullScan();
}

/** Start watching the DOM. Safe to call once, after i18n init. */
export function startAutoTranslate() {
    if (started || typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
    started = true;
    currentLang = (i18n.language || DEFAULT_LANGUAGE).toLowerCase().split('-')[0];

    const observer = new MutationObserver((mutations) => {
        if (currentLang === DEFAULT_LANGUAGE) {
            // Still process so newly-added nodes get their English restored if needed,
            // but there's nothing to fetch — cheap.
        }
        for (const m of mutations) {
            if (m.type === 'characterData') {
                const t = m.target as Text;
                if (t.nodeType === Node.TEXT_NODE && !isInSkippedSubtree(t)) applyToNode(t);
            } else if (m.type === 'childList') {
                m.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        if (!isInSkippedSubtree(node)) applyToNode(node as Text);
                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                        scan(node);
                    }
                });
            }
        }
    });

    const begin = () => {
        observer.observe(document.body, {
            childList: true, subtree: true, characterData: true,
        });
        scheduleFullScan();
    };

    if (document.body) begin();
    else window.addEventListener('DOMContentLoaded', begin, { once: true });

    // Keep in lock-step with i18next language changes.
    i18n.on('languageChanged', (lng) => setAutoTranslateLanguage(lng));
}
