const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync('public/manifest.json','utf8'));
console.log('manifest loaded');
manifest.icons.forEach(icon => {
  const p = icon.src.startsWith('/') ? icon.src.slice(1) : icon.src;
  console.log(p, fs.existsSync(p));
});
const html = fs.readFileSync('index.html','utf8');
console.log('favicon', html.includes('/favicon.ico'));
console.log('apple-touch-icon', html.includes('/icons/app-icon-180.png'));
