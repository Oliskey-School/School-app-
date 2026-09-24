/**
 * SEO and brand-entity guard rails.
 *
 * These assert the things that silently rot: a title someone "temporarily"
 * changes, a second meta description, an og:image that no longer exists, a
 * private route slipping into the sitemap, or the company/product entities
 * being conflated again in the structured data.
 *
 * Everything is checked against the files that actually ship, with no network.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

const html = read('index.html');
const APP = 'https://app.oliskey.com/';
const COMPANY_HOST = 'oliskey.com';

describe('index.html metadata', () => {
    it('has exactly one title, and it is the product title', () => {
        const titles = html.match(/<title>([\s\S]*?)<\/title>/g) ?? [];
        expect(titles.length, 'there must be exactly one <title>').toBe(1);
        const title = titles[0].replace(/<\/?title>/g, '').trim();
        expect(title).toBe('Oliskey School App | School Management &amp; Engagement Platform');
        expect(title.length, 'title is too long for a search result').toBeLessThanOrEqual(70);
        expect(title).not.toMatch(/^(React App|Vite App|Dashboard|School App)$/i);
    });

    it('has exactly one meta description of a sensible length', () => {
        const descs = [...html.matchAll(/<meta\s+name="description"[\s\S]*?content="([\s\S]*?)"/g)];
        expect(descs.length, 'duplicate meta descriptions confuse search engines').toBe(1);
        const d = descs[0][1].trim();
        expect(d).toContain('Oliskey School App');
        expect(d.length).toBeGreaterThan(80);
        expect(d.length).toBeLessThanOrEqual(320);
    });

    it('declares a single canonical pointing at the application root', () => {
        const canon = [...html.matchAll(/<link\s+rel="canonical"[^>]*href="([^"]+)"/g)];
        expect(canon.length).toBe(1);
        expect(canon[0][1]).toBe(APP);
    });

    it('is indexable and mobile-ready', () => {
        expect(html).toMatch(/<meta\s+name="robots"\s+content="index, follow"/);
        expect(html).toMatch(/name="viewport"/);
        expect(html).toMatch(/<html lang="[a-z]{2}/i);
    });

    it('carries the Open Graph and Twitter tags a share preview needs', () => {
        for (const tag of ['og:title', 'og:description', 'og:url', 'og:type', 'og:image', 'og:site_name']) {
            expect(html, `missing ${tag}`).toContain(`property="${tag}"`);
        }
        for (const tag of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
            expect(html, `missing ${tag}`).toContain(`name="${tag}"`);
        }
    });

    it('the og:image is a real file, local, and large enough for summary_large_image', () => {
        const src = html.match(/property="og:image"\s+content="([^"]+)"/)?.[1];
        expect(src, 'og:image missing').toBeTruthy();
        expect(src!.startsWith(APP), 'og:image must be served from the app origin').toBe(true);
        const file = src!.replace(APP, 'public/');
        expect(existsSync(join(root, file)), `og:image file missing: ${file}`).toBe(true);

        // A summary_large_image card needs roughly 1200x630; the PWA icon does not qualify.
        const w = Number(html.match(/property="og:image:width"\s+content="(\d+)"/)?.[1] ?? 0);
        const h = Number(html.match(/property="og:image:height"\s+content="(\d+)"/)?.[1] ?? 0);
        expect(w).toBeGreaterThanOrEqual(1200);
        expect(h).toBeGreaterThanOrEqual(630);
        expect(readFileSync(join(root, file)).length, 'og:image looks too small to be a real card').toBeGreaterThan(20_000);
    });
});

describe('structured data', () => {
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => m[1]);

    it('has exactly one JSON-LD block and it parses', () => {
        expect(blocks.length, 'duplicate JSON-LD blocks can conflict').toBe(1);
        expect(() => JSON.parse(blocks[0])).not.toThrow();
    });

    it('separates the company from the product', () => {
        const graph = JSON.parse(blocks[0])['@graph'] as any[];
        const byType = (t: string) => graph.find(n => n['@type'] === t);

        const org = byType('Organization');
        expect(org, 'no Organization node').toBeTruthy();
        expect(org.name).toBe('Oliskey');
        // The company is oliskey.com. Pointing it at app.oliskey.com tells search
        // engines the application IS the company — the bug this guards against.
        expect(new URL(org.url).hostname.endsWith(COMPANY_HOST)).toBe(true);
        expect(new URL(org.url).hostname.startsWith('app.'), 'Organization must not be the app origin').toBe(false);

        const app = byType('SoftwareApplication');
        expect(app, 'no SoftwareApplication node').toBeTruthy();
        expect(app.name).toBe('Oliskey School App');
        expect(app.url).toBe(APP);
        expect(app.applicationCategory).toBe('EducationalApplication');
        expect(app.publisher['@id']).toBe(org['@id']);

        const site = byType('WebSite');
        expect(site?.url).toBe(APP);
    });

    it('links third-party product profiles by identity only (sameAs), never by rating', () => {
        const graph = JSON.parse(blocks[0])['@graph'] as any[];
        const app = graph.find(n => n['@type'] === 'SoftwareApplication');
        const sameAs: string[] = app.sameAs ?? [];
        // The G2 listing is the same product entity, so sameAs is the right
        // (and only) way to reference it from here.
        expect(sameAs, 'G2 profile missing from sameAs').toContain('https://www.g2.com/products/oliskey-school-app/reviews');
        for (const url of sameAs) {
            expect(() => new URL(url), `sameAs entry is not a valid URL: ${url}`).not.toThrow();
            expect(url.startsWith('https://'), `sameAs must be https: ${url}`).toBe(true);
        }
        // Referencing a reviews page must never turn into publishing its numbers.
        expect(JSON.stringify(app), 'a rating was attached to the product entity').not.toMatch(/aggregateRating|ratingValue|reviewCount|bestRating/);
    });

    it('claims nothing that cannot be verified', () => {
        // Checked as PROPERTY NAMES, not substrings: a legitimate sameAs URL may
        // legitimately contain the word "reviews" (the G2 profile does) without
        // the page claiming any rating of its own.
        const forbidden = ['aggregateRating', 'ratingValue', 'reviewCount', 'review', 'award', 'bestRating'];
        const found: string[] = [];
        const walk = (node: any, path: string) => {
            if (!node || typeof node !== 'object') return;
            if (Array.isArray(node)) return node.forEach((n, i) => walk(n, `${path}[${i}]`));
            for (const [key, value] of Object.entries(node)) {
                if (forbidden.includes(key)) found.push(`${path}.${key}`);
                walk(value, `${path}.${key}`);
            }
        };
        walk(JSON.parse(blocks[0]), '$');
        expect(found, `unverifiable rating/award claims in structured data: ${found.join(', ')}`).toEqual([]);
    });
});

describe('unverified marketing claims', () => {
    it('no superlative or rating language appears in the page metadata', () => {
        // Title, description, OG/Twitter text and JSON-LD are the strings search
        // engines and social cards quote. Until a verified rating exists on a
        // third-party profile, none of these may imply one.
        const banned = [
            /top[- ]rated/i, /best[- ](school|platform|app|software)/i,
            /[0-9](\.[0-9])?\s*(\/\s*5|stars?)/i, /five[- ]star/i,
            /#\s*1/, /number one/i, /award[- ]winning/i,
            /most popular/i, /leading/i, /highest[- ]rated/i,
        ];
        const head = html.slice(0, html.indexOf('</head>'));
        const quoted = [
            ...[...head.matchAll(/<title>([\s\S]*?)<\/title>/g)].map(m => m[1]),
            ...[...head.matchAll(/<meta[^>]+content="([^"]*)"/g)].map(m => m[1]),
            ...[...head.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => m[1]),
        ].join(String.fromCharCode(10));
        const hits = banned.filter(rx => rx.test(quoted)).map(rx => String(rx));
        expect(hits, `unverified claim language in metadata: ${hits.join(', ')}`).toEqual([]);
    });
});

describe('robots.txt and sitemap.xml', () => {
    const robots = read('public/robots.txt');
    const sitemap = read('public/sitemap.xml');

    it('robots.txt keeps the application private by default and points at the sitemap', () => {
        expect(robots).toMatch(/^Disallow: \/$/m);
        expect(robots).toMatch(/Sitemap:\s*https:\/\/app\.oliskey\.com\/sitemap\.xml/);
        expect(robots).toMatch(/^Allow: \/\$$/m);
    });

    it('the sitemap contains only public entry URLs on the app origin', () => {
        const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
        expect(locs.length).toBeGreaterThan(0);
        for (const loc of locs) {
            expect(loc.startsWith(APP), `${loc} is not on the app origin`).toBe(true);
        }
        // Anything behind a login must never be advertised for crawling.
        const PRIVATE = ['dashboard', 'students', 'teachers', 'parents', 'attendance', 'results',
            'report-card', 'payments', 'messages', 'admin', 'settings', 'analytics', 'uploads', 'profile'];
        for (const loc of locs) {
            const path = new URL(loc).pathname.toLowerCase();
            for (const seg of PRIVATE) {
                expect(path.includes(seg), `private route "${seg}" is listed in the sitemap: ${loc}`).toBe(false);
            }
        }
    });

    it('every sitemap URL is a public entry screen robots.txt actually allows', () => {
        const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname);
        const allowed = [...robots.matchAll(/^Allow:\s*(\S+)$/gm)].map(m => m[1].replace(/\$$/, ''));
        for (const path of locs) {
            const ok = allowed.some(a => (a === '/' ? path === '/' : path.startsWith(a)));
            expect(ok, `${path} is in the sitemap but not allowed by robots.txt`).toBe(true);
        }
    });
});

describe('PWA manifest', () => {
    const manifest = JSON.parse(read('public/manifest.json'));

    it('names the product correctly and starts in scope', () => {
        expect(manifest.name).toBe('Oliskey School App');
        expect(manifest.short_name).toBe('Oliskey');
        expect(manifest.start_url).toBe('/');
        expect(manifest.scope).toBe('/');
        expect(String(manifest.description).length).toBeGreaterThan(30);
    });

    it('every declared icon file exists', () => {
        expect(manifest.icons.length).toBeGreaterThan(0);
        for (const icon of manifest.icons) {
            const p = join(root, 'public', icon.src.replace(/^\//, ''));
            expect(existsSync(p), `manifest icon missing: ${icon.src}`).toBe(true);
        }
        const sizes = manifest.icons.map((i: any) => i.sizes);
        expect(sizes, 'a 192x192 icon is required for installability').toContain('192x192');
        expect(sizes, 'a 512x512 icon is required for installability').toContain('512x512');
    });
});

describe('README', () => {
    it('exists and describes the product and both URLs', () => {
        const readme = read('README.md');
        expect(readme).toContain('# Oliskey School App');
        expect(readme).toContain('app.oliskey.com');
        expect(readme).toContain('oliskey.com');
        expect(readme).toContain('Change how school feels');
    });
});
