const fs = require('fs');
const lines = fs.readFileSync('lib/api.ts', 'utf-8').split('\n');

const methods = [];
let cur = null;
let braceDepth = 0;
let inMethod = false;

const methodStartRe = /^\s{4}(async\s+)?([a-zA-Z_$][\w$]*)\s*\(/;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!inMethod) {
    const m = line.match(methodStartRe);
    if (m && i > 45 /* skip class fields near top */) {
      cur = { name: m[2], startLine: i + 1, async: !!m[1] };
      inMethod = true;
      braceDepth = 0;
      // count braces on this line
      for (const ch of line) {
        if (ch === '{') braceDepth++;
        if (ch === '}') braceDepth--;
      }
      if (braceDepth <= 0 && line.includes('{')) {
        // single-line-ish method, unlikely but guard
      }
      continue;
    }
  } else {
    for (const ch of line) {
      if (ch === '{') braceDepth++;
      if (ch === '}') braceDepth--;
    }
    if (braceDepth <= 0) {
      cur.endLine = i + 1;
      methods.push(cur);
      inMethod = false;
      cur = null;
    }
  }
}

console.log('Total methods found:', methods.length);
fs.writeFileSync('scratch_methods.json', JSON.stringify(methods, null, 0));
// Print a sample
console.log(methods.slice(0, 5));
console.log('...');
console.log(methods.slice(-5));
