/**
 * Numbers shown to schools must come from the database, never from Math.random.
 *
 * Found in production code: components/proprietor/CurriculumToggle.tsx rendered
 *
 *     averagePerformance: Math.random() * 30 + 70   // "Mock for now"
 *
 * as an "Avg Performance" percentage on a school owner's dashboard — a
 * fabricated figure between 70% and 100%, with a progress bar, indistinguishable
 * from a real one. A school could have made decisions on it.
 *
 * Random values are legitimate in plenty of places (games, animations, client
 * ids, retry jitter), so this does not ban Math.random. It bans Math.random
 * flowing into a field whose NAME claims it is a measurement.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..', '..');

/** Product code only: games and tests legitimately randomise. */
const SEARCH_DIRS = ['components', 'lib', 'services'];
const SKIP_DIR = /[\\/](games|adventure|node_modules|__tests__|dist)[\\/]/;

/** Field names that assert a real measurement to a user. */
const STAT_FIELD = new RegExp(
    '\\b(' + [
        'average\\w*', 'avg\\w*', '\\w*performance', '\\w*score', '\\w*rate',
        '\\w*percentage', '\\w*percent', 'total\\w*', '\\w*count', '\\w*revenue',
        '\\w*balance', '\\w*attendance', '\\w*enrolled', '\\w*outstanding',
        '\\w*expenses', '\\w*profit', '\\w*growth',
    ].join('|') + ')\\s*[:=]\\s*[^;,\\n]*Math\\.random', 'i');

function walk(dir: string): string[] {
    let out: string[] = [];
    let entries: string[];
    try { entries = readdirSync(dir); } catch { return out; }
    for (const e of entries) {
        const p = join(dir, e);
        if (SKIP_DIR.test(p + '/')) continue;
        if (statSync(p).isDirectory()) out = out.concat(walk(p));
        else if (/\.(ts|tsx)$/.test(p) && !/\.test\.tsx?$/.test(p)) out.push(p);
    }
    return out;
}

describe('no fabricated statistics in product code', () => {
    it('no displayed metric is generated with Math.random', () => {
        const offenders: string[] = [];
        for (const dir of SEARCH_DIRS) {
            for (const file of walk(join(root, dir))) {
                readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
                    if (line.trim().startsWith('*') || line.trim().startsWith('//')) return; // comments
                    if (STAT_FIELD.test(line)) {
                        offenders.push(`${file.replace(root, '').replace(/\\/g, '/')}:${i + 1}  ${line.trim().slice(0, 100)}`);
                    }
                });
            }
        }
        expect(offenders, `fabricated statistics rendered to users:\n${offenders.join('\n')}`).toEqual([]);
    });

    it('the curriculum performance figure is not invented', () => {
        const file = join(root, 'components', 'proprietor', 'CurriculumToggle.tsx');
        const src = readFileSync(file, 'utf8');
        // It must be null (no verified source) rather than a number pulled from thin air.
        expect(src).toMatch(/averagePerformance:\s*null/);
        expect(src, 'a random performance value came back').not.toMatch(/averagePerformance:\s*Math\.random/);
        // And the UI must say so instead of rendering a confident percentage.
        expect(src).toContain("'No data'");
    });
});
