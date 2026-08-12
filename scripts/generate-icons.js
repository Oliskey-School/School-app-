const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
const sizes = [512, 192, 180, 32];

(async () => {
  try {
    for (const size of sizes) {
      const strokeWidth = Math.max(Math.round(size * 0.14), 22);
      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.18"/>
    </filter>
  </defs>
  <g filter="url(#shadow)">
    <path fill="none" stroke="#ffffff" stroke-width="${strokeWidth}" stroke-linecap="round" d="M ${size * 0.15} ${size * 0.55} A ${size * 0.35} ${size * 0.35} 0 0 1 ${size * 0.53} ${size * 0.15}" />
    <path fill="none" stroke="#ffffff" stroke-width="${strokeWidth}" stroke-linecap="round" d="M ${size * 0.45} ${size * 0.15} A ${size * 0.35} ${size * 0.35} 0 0 1 ${size * 0.85} ${size * 0.47}" />
    <path fill="none" stroke="#ffffff" stroke-width="${strokeWidth}" stroke-linecap="round" d="M ${size * 0.85} ${size * 0.55} A ${size * 0.35} ${size * 0.35} 0 0 1 ${size * 0.47} ${size * 0.85}" />
    <path fill="none" stroke="#167AFF" stroke-width="${strokeWidth}" stroke-linecap="round" d="M ${size * 0.58} ${size * 0.12} A ${size * 0.35} ${size * 0.35} 0 0 1 ${size * 0.88} ${size * 0.45}" />
    <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.14}" fill="rgba(0,0,0,0)" />
  </g>
</svg>`;
      await sharp(Buffer.from(svg)).png().toFile(path.join(dir, `app-icon-${size}.png`));
      console.log(`Created ${path.join(dir, `app-icon-${size}.png`)}`);
    }
    await sharp(path.join(dir, 'app-icon-32.png')).resize(32, 32).toFile(path.join(__dirname, '..', 'public', 'favicon.ico'));
    console.log('Created public/favicon.ico');
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
