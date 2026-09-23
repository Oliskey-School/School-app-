/**
 * Generate the social preview image for app.oliskey.com.
 *
 * The page declares twitter:card=summary_large_image, but og:image pointed at
 * the 180x180 PWA icon — far below the ~1200x630 a large card needs, so the
 * preview rendered as a tiny logo or was dropped entirely. This renders a
 * proper 1200x630 card from SVG (no external assets, no invented claims —
 * just the product name, the real positioning line, and the two URLs).
 *
 * Run: node scripts/generate-og-image.mjs
 */
import sharp from 'sharp';
import { writeFileSync } from 'fs';

const W = 1200, H = 630;
const INDIGO = '#4F46E5';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#312E81"/>
      <stop offset="55%" stop-color="${INDIGO}"/>
      <stop offset="100%" stop-color="#6366F1"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="1060" cy="120" r="240" fill="#ffffff" opacity="0.06"/>
  <circle cx="150" cy="560" r="180" fill="#ffffff" opacity="0.05"/>

  <g transform="translate(86, 150)">
    <text font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="30" font-weight="600"
          fill="#C7D2FE" letter-spacing="3">${esc('OLISKEY')}</text>

    <text y="96" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="78" font-weight="700"
          fill="#FFFFFF">${esc('Oliskey School App')}</text>

    <text y="168" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="40" font-weight="500"
          fill="#E0E7FF">${esc('Change how school feels.')}</text>

    <text y="232" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="29"
          fill="#C7D2FE">${esc('Administrators · Teachers · Students · Parents')}</text>

    <rect y="292" width="360" height="4" rx="2" fill="#A5B4FC" opacity="0.7"/>

    <text y="352" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="26"
          fill="#E0E7FF">${esc('app.oliskey.com')}</text>
  </g>
</svg>`;

const out = 'public/oliskey-school-app-social-card.png';
const buf = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
writeFileSync(out, buf);
const meta = await sharp(buf).metadata();
console.log(`wrote ${out} — ${meta.width}x${meta.height}, ${buf.length} bytes`);
