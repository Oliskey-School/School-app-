import { Request, Response } from 'express';
import sharp from 'sharp';
import prisma from '../config/database';

/**
 * Per-school PWA branding: when a signed-in user installs the app ("Download"),
 * the home-screen icon and name are the SCHOOL's, not the generic Oliskey ones.
 *
 * The browser reads <link rel="manifest"> and fetches its icons WITHOUT auth,
 * so these two endpoints are public. They only ever expose a school's name and
 * logo — both already shown on public pages — never anything else. A school
 * without a logo (or whose logo cannot be fetched) gets the default Oliskey
 * icons, so installing never fails.
 *
 * Icons are rendered from the logo with sharp into square PNGs (padded, white
 * background) because manifest icons must be PNG at fixed sizes and the logo
 * may be any size or format. Rendered icons are cached per school+logo URL.
 */
const DEFAULT_ICON = (size: number) => `/icons/app-icon-${size}.png`;
const ALLOWED_SIZES = new Set([180, 192, 512]);
const FETCH_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type CacheEntry = { logoUrl: string; png: Buffer; at: number };
const iconCache = new Map<string, CacheEntry>();

async function loadSchool(id: string) {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return null;
    return prisma.school.findUnique({ where: { id }, select: { id: true, name: true, logo_url: true, is_active: true } });
}

/** Only http(s) logos are rendered; data: URLs and anything else fall back. */
const usableLogo = (url: string | null | undefined) => !!url && /^https?:\/\//.test(url);

export const schoolManifest = async (req: Request, res: Response) => {
    const school = await loadSchool(String(req.params.id));
    const base = { start_url: '/', id: '/', scope: '/', display: 'standalone', orientation: 'portrait', background_color: '#ffffff', theme_color: '#4F46E5' };
    const name = school?.name?.trim() || 'Oliskey School App';
    const hasLogo = !!school && usableLogo(school.logo_url);
    const icon = (size: number, purpose: string) => ({
        src: hasLogo ? `/api/schools/${school!.id}/icon/${size}` : DEFAULT_ICON(size),
        sizes: `${size}x${size}`,
        type: 'image/png',
        purpose,
    });
    res.setHeader('Content-Type', 'application/manifest+json');
    // Short-lived so a newly uploaded logo shows on the next install.
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({
        ...base,
        name,
        short_name: name.length > 12 ? name.slice(0, 12).trim() : name,
        description: `${name} on the Oliskey School App`,
        icons: [icon(192, 'any'), icon(512, 'any'), icon(192, 'maskable'), icon(512, 'maskable')],
    });
};

export const schoolIcon = async (req: Request, res: Response) => {
    const size = Number(req.params.size);
    if (!ALLOWED_SIZES.has(size)) return res.redirect(302, DEFAULT_ICON(192));
    const school = await loadSchool(String(req.params.id));
    if (!school || !usableLogo(school.logo_url)) return res.redirect(302, DEFAULT_ICON(size));

    const key = `${school.id}:${size}`;
    const cached = iconCache.get(key);
    if (cached && cached.logoUrl === school.logo_url && Date.now() - cached.at < CACHE_TTL_MS) {
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.end(cached.png);
    }

    try {
        const upstream = await fetch(school.logo_url!, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
        if (!upstream.ok) throw new Error(`logo fetch ${upstream.status}`);
        const source = Buffer.from(await upstream.arrayBuffer());
        // Fit the logo inside a square with ~10% padding so "maskable" crops
        // (rounded/circular launchers) don't cut into it.
        const inner = Math.round(size * 0.8);
        const logo = await sharp(source, { failOn: 'none', limitInputPixels: 30_000_000 })
            .rotate()
            .resize({ width: inner, height: inner, fit: 'inside', withoutEnlargement: false })
            .png()
            .toBuffer();
        const png = await sharp({ create: { width: size, height: size, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } })
            .composite([{ input: logo, gravity: 'centre' }])
            .png({ compressionLevel: 9 })
            .toBuffer();
        iconCache.set(key, { logoUrl: school.logo_url!, png, at: Date.now() });
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.end(png);
    } catch (err: any) {
        // Never break an install over a bad logo — fall back to the default icon.
        console.warn(`[branding] icon for school ${school.id} fell back to default: ${err?.message}`);
        return res.redirect(302, DEFAULT_ICON(size));
    }
};
