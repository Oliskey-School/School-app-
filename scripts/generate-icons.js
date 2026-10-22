// Generates every app icon from the master artwork in brand-source/.
// Run: node scripts/generate-icons.js
//
// - app-icon-{512,192,180,144,32}.png : the icon with see-through corners
//   (browser tabs, install prompts, in-app default logo, Google's logo field).
// - app-icon-maskable-{512,192}.png    : padded onto the brand blue so Android's
//   circle/squircle masks never cut the artwork.
// - apple-touch-icon.png (180)         : opaque; iOS paints transparency black.
// - favicon.ico                        : 32px.
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'brand-source', 'oliskey-app-icon.png');
const dir = path.join(root, 'public', 'icons');
const BRAND_BLUE = { r: 29, g: 78, b: 216, alpha: 1 }; // matches the artwork's blue

(async () => {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Drop the black border around the rounded tile.
    const trimmed = await sharp(src).trim({ background: '#000000', threshold: 40 }).toBuffer();
    const meta = await sharp(trimmed).metadata();
    const side = Math.min(meta.width, meta.height);
    const square = await sharp(trimmed).resize(side, side, { fit: 'cover' }).toBuffer();

    // Rounded-corner mask so the corners are transparent, not black.
    const radius = Math.round(side * 0.22);
    const mask = Buffer.from(`<svg width="${side}" height="${side}"><rect width="${side}" height="${side}" rx="${radius}" ry="${radius}"/></svg>`);
    const rounded = await sharp(square).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();

    for (const size of [512, 192, 180, 144, 32]) {
      await sharp(rounded).resize(size, size).png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 }).toFile(path.join(dir, `app-icon-${size}.png`));
    }

    // Maskable: artwork inside the 80% safe zone on a brand-blue square.
    for (const size of [512, 192]) {
      const inner = Math.round(size * 0.8);
      const art = await sharp(rounded).resize(inner, inner).png().toBuffer();
      await sharp({ create: { width: size, height: size, channels: 4, background: BRAND_BLUE } })
        .composite([{ input: art, gravity: 'center' }]).png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
        .toFile(path.join(dir, `app-icon-maskable-${size}.png`));
    }

    await sharp(rounded).resize(180, 180).flatten({ background: BRAND_BLUE }).png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
      .toFile(path.join(dir, 'apple-touch-icon.png'));

    await sharp(rounded).resize(32, 32).png().toFile(path.join(root, 'public', 'favicon.ico'));
    console.log('Icons generated in public/icons and public/favicon.ico');
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
