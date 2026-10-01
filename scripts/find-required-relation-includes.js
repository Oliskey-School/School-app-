/**
 * Find every `include:` of a REQUIRED (non-nullable) Prisma relation.
 *
 * Under RLS a required relation can legitimately come back empty, and Prisma
 * then throws "Inconsistent query result: Field X is required to return data,
 * got null" instead of returning null — turning a hidden row into a 500.
 */
const fs = require('fs');
const path = require('path');

const schema = fs.readFileSync('backend/prisma/schema.prisma', 'utf8');

// model -> { relationField: {target, required} }
const models = {};
for (const m of schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)) {
  const [, name, body] = m;
  const rels = {};
  for (const line of body.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('//') || t.startsWith('@@')) continue;
    const parts = t.split(/\s+/);
    if (parts.length < 2) continue;
    const [field, type] = parts;
    const bare = type.replace(/[\[\]?]/g, '');
    if (!/^[A-Z]/.test(bare)) continue;
    if (['String','Int','Float','Boolean','DateTime','Json','Decimal','BigInt','Bytes'].includes(bare)) continue;
    const isList = type.endsWith('[]');
    const optional = type.endsWith('?');
    if (isList) continue;                      // lists come back as [] — safe
    rels[field] = { target: bare, required: !optional };
  }
  models[name] = rels;
}

const requiredByField = new Map();             // field name -> [models it is required on]
for (const [model, rels] of Object.entries(models)) {
  for (const [field, info] of Object.entries(rels)) {
    if (!info.required) continue;
    if (!requiredByField.has(field)) requiredByField.set(field, []);
    requiredByField.get(field).push(model);
  }
}

function walk(dir) {
  return fs.readdirSync(dir).flatMap(f => {
    const p = path.join(dir, f);
    return fs.statSync(p).isDirectory() ? walk(p) : (p.endsWith('.ts') ? [p] : []);
  });
}

const hits = [];
for (const file of walk('backend/src')) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    // `field: true` or `field: {` inside an include block
    const m = line.match(/^\s*(\w+):\s*(true|\{)/);
    if (!m) return;
    const field = m[1];
    const owners = requiredByField.get(field);
    if (!owners) return;
    // Ignore obvious non-include contexts (where/data/select-of-scalar).
    const ctx = lines.slice(Math.max(0, i - 6), i).join(' ');
    if (!/include\s*:/.test(ctx)) return;
    hits.push(`${file.replace(/\\/g, '/')}:${i + 1}  ${field} (required on ${owners.slice(0, 3).join(',')})`);
  });
}

console.log('required-relation includes found:', hits.length);
hits.slice(0, 40).forEach(h => console.log('  ' + h));
