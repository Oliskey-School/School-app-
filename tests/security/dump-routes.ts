/**
 * Walks the live Express app's route tree and writes every registered
 * METHOD + path to tmp-routes.json, which attack.ts reads to know what to
 * fire at. Needed because attack.ts has no other way to enumerate routes
 * without hand-maintaining a list that drifts from the real router.
 *
 * Usage: npx tsx --tsconfig backend/tsconfig.json tests/security/dump-routes.ts
 * Output: ./tmp-routes.json (gitignored — regenerate whenever routes change)
 */
import fs from 'fs';
import path from 'path';

(async () => {
    process.env.NODE_ENV = process.env.NODE_ENV || 'development';
    const { app } = await import('../../backend/src/app');

    // Express 5's internal Layer has no public "what path is this mounted
    // at" API, so recover it by testing candidate mount strings (collected
    // from every literal .use('/foo', ...) in the route source) against each
    // layer's own matcher.
    const candidates = new Set<string>(['/api']);
    const walkDir = (dir: string) => {
        for (const f of fs.readdirSync(dir)) {
            const p = path.join(dir, f);
            if (fs.statSync(p).isDirectory()) walkDir(p);
            else if (p.endsWith('.ts')) {
                const src = fs.readFileSync(p, 'utf8');
                for (const m of src.matchAll(/\.use\(\s*['"]([^'"]+)['"]/g)) candidates.add(m[1]);
            }
        }
    };
    walkDir(path.join(__dirname, '../../backend/src/routes'));
    walkDir(path.join(__dirname, '../../backend/src'));
    const candidateList = [...candidates].sort((a, b) => b.length - a.length);

    const out: { method: string; path: string }[] = [];
    function mountOf(layer: any): string {
        for (const c of candidateList) {
            try { if (layer.match(c + '/__probe__') && layer.path === c) return c; } catch { /* not this one */ }
            try { if (layer.match(c) && layer.path === c) return c; } catch { /* not this one */ }
        }
        return '';
    }
    function walk(stack: any[], prefix: string, depth: number) {
        if (depth > 6) return; // guards against a cyclic/misbehaving router tree
        for (const layer of stack) {
            if (layer.route) {
                for (const m of Object.keys(layer.route.methods)) {
                    out.push({ method: m.toUpperCase(), path: (prefix + layer.route.path).replace(/\/+/g, '/') });
                }
            } else if (layer.handle && layer.handle.stack) {
                walk(layer.handle.stack, prefix + mountOf(layer), depth + 1);
            }
        }
    }

    const router = (app as any).router || (app as any)._router;
    walk(router.stack, '', 0);

    const uniq = [...new Map(out.map((r) => [r.method + ' ' + r.path, r])).values()]
        .sort((a, b) => (a.path + a.method).localeCompare(b.path + b.method));

    const outPath = path.join(process.cwd(), 'tmp-routes.json');
    fs.writeFileSync(outPath, JSON.stringify(uniq, null, 1));
    console.log(`ROUTES: ${uniq.length} -> ${outPath}`);
    process.exit(0);
})().catch((e) => {
    console.error('dump-routes failed:', e && (e.stack || e.message));
    process.exit(1);
});
