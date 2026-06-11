import { Request, Response } from 'express';
import { translateBatch } from '../services/translate.service';

const MAX_TEXTS = 200;       // per request
const MAX_LEN = 5000;        // per string (Google segment limit guard)

/**
 * POST /api/translate
 * Body: { texts: string[], target: string }
 * Returns: { translations: string[] }  (1:1 with input, English passthrough)
 *
 * Public + rate-limited: UI strings are not sensitive, and the demo/login
 * screens need translation before a user is ever authenticated.
 */
export async function translate(req: Request, res: Response) {
    try {
        const { texts, target } = req.body || {};

        if (!Array.isArray(texts)) {
            return res.status(400).json({ error: 'texts must be an array of strings' });
        }
        if (typeof target !== 'string' || !target.trim()) {
            return res.status(400).json({ error: 'target language is required' });
        }
        if (texts.length === 0) {
            return res.json({ translations: [] });
        }
        if (texts.length > MAX_TEXTS) {
            return res.status(413).json({ error: `too many texts (max ${MAX_TEXTS})` });
        }

        const clean = texts.map((t) =>
            typeof t === 'string' ? t.slice(0, MAX_LEN) : String(t ?? '').slice(0, MAX_LEN)
        );

        const translations = await translateBatch(clean, target);
        return res.json({ translations });
    } catch (err: any) {
        console.error('[translate] failed:', err?.message || err);
        // Soft-fail: return originals so the UI degrades to English, never errors.
        const texts = Array.isArray(req.body?.texts) ? req.body.texts : [];
        return res.status(200).json({ translations: texts, degraded: true });
    }
}
