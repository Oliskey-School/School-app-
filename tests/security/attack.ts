/**
 * Hostile cross-tenant probe. Fires every registered route with School A's
 * credentials aimed at School B's resources (and vice versa) and reports any
 * response that carries the other tenant's canary.
 *
 * Verdict rule: a response LEAKS if it contains any B token that the attacker
 * did NOT put into the request themselves. Echoing back an ID the caller sent
 * ("branch X not authorized") is not a leak; B's canary string, which is never
 * sent, is the purest signal. Status codes are recorded but not judged — 403,
 * 404, 400 and an empty 200 are all acceptable ways to say no.
 *
 * Usage: npx tsx --tsconfig backend/tsconfig.json tests/security/attack.ts
 * Reads tests/security/.fixture.json (from seed-tenants.ts) and tmp-routes.json.
 */
import fs from 'fs';

const API = process.env.API_BASE || 'http://127.0.0.1:5000';
const fx = JSON.parse(fs.readFileSync('tests/security/.fixture.json', 'utf8'));
const routes: { method: string; path: string }[] = JSON.parse(fs.readFileSync('tmp-routes.json', 'utf8'));

type Tenant = typeof fx.A;

// Resolve a path parameter to the VICTIM tenant's matching id.
function paramValue(name: string, segBefore: string, victim: Tenant): string {
    const ids = victim.ids;
    const byName: Record<string, string> = {
        studentId: ids.student, teacherId: ids.teacher, parentId: ids.parent, classId: ids.class,
        userId: ids.studentUser, schoolId: victim.schoolId, branchId: victim.mainBranchId,
        roomId: ids.chatRoom, messageId: ids.chatMessage, invoiceId: ids.invoice, feeId: ids.fee,
        notificationId: ids.notification, documentId: ids.document, timetableId: ids.timetable,
        reportCardId: ids.reportCard, attendanceId: ids.attendance, announcementId: ids.announcement,
        email: victim.adminEmail, code: victim.schoolCode,
    };
    if (byName[name]) return byName[name];
    const bySeg: Record<string, string> = {
        students: ids.student, teachers: ids.teacher, parents: ids.parent, classes: ids.class, users: ids.studentUser,
        schools: victim.schoolId, branches: victim.mainBranchId, rooms: ids.chatRoom, messages: ids.message,
        invoices: ids.invoice, fees: ids.fee, notifications: ids.notification, announcements: ids.announcement,
        notices: ids.announcement, documents: ids.document, timetable: ids.timetable, timetables: ids.timetable,
        attendance: ids.attendance, 'report-cards': ids.reportCard, results: ids.reportCard, chat: ids.chatRoom,
    };
    return bySeg[segBefore] || ids.student;
}

function buildPath(path: string, victim: Tenant): { url: string; sent: string[] } {
    const sent: string[] = [];
    const segs = path.split('/');
    const out = segs.map((s, i) => {
        if (!s.startsWith(':')) return s;
        const name = s.slice(1).replace(/[?*+]/g, '');
        const v = paramValue(name, segs[i - 1] || '', victim);
        sent.push(v);
        return encodeURIComponent(v);
    });
    return { url: out.join('/'), sent };
}

// Everything that would prove B's data reached A (or A's reached B).
function canaries(t: Tenant): string[] {
    return [t.canary, t.schoolId, t.mainBranchId, t.subBranchId, t.adminEmail, t.teacherEmail, t.adminUserId, t.teacherUserId,
        ...Object.values(t.ids as Record<string, string>), ...Object.values(t.generatedIds as Record<string, string | null>).filter(Boolean) as string[]];
}

interface Result { attack: string; method: string; path: string; url: string; status: number; leak: string[]; ms: number }

async function fire(attack: string, method: string, path: string, url: string, token: string, headers: Record<string, string>, body: any, victim: Tenant, sentExtra: string[]): Promise<Result> {
    const t0 = Date.now();
    const sent = new Set<string>([...sentExtra, ...Object.values(headers), ...(body ? Object.values(body).map(String) : [])]);
    let status = 0, text = '';
    try {
        const res = await fetch(API + url, {
            method,
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...headers },
            body: body && method !== 'GET' ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(20000),
        });
        status = res.status;
        text = await res.text();
    } catch (e: any) { status = -1; text = String(e?.message || e); }
    // Only tokens the attacker did not send count as leakage.
    const leak = canaries(victim).filter(c => c && !sent.has(c) && text.includes(c));
    return { attack, method, path, url, status, leak, ms: Date.now() - t0 };
}

async function pool<T>(items: (() => Promise<T>)[], n: number): Promise<T[]> {
    const out: T[] = new Array(items.length); let i = 0;
    await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await items[k](); } }));
    return out;
}

(async () => {
    const A: Tenant = fx.A, B: Tenant = fx.B;
    const forged = (v: Tenant) => ({
        school_id: v.schoolId, schoolId: v.schoolId, branch_id: v.mainBranchId, branchId: v.mainBranchId,
        student_id: v.ids.student, studentId: v.ids.student, teacher_id: v.ids.teacher, class_id: v.ids.class,
        user_id: v.ids.studentUser, room_id: v.ids.chatRoom, receiver_id: v.teacherUserId, id: v.ids.student,
        title: 'probe', name: 'probe', content: 'probe', status: 'present', amount: 1,
    });
    const jobs: (() => Promise<Result>)[] = [];
    // Order matters: reads first, destructive last, so a successful delete cannot
    // hide a read leak that happened earlier in the same run.
    const ordered = [...routes].sort((a, b) => {
        const rank = (m: string) => m === 'GET' ? 0 : m === 'DELETE' ? 2 : 1; return rank(a.method) - rank(b.method);
    });
    for (const r of ordered) {
        if (/\/auth\/(login|register|demo|refresh|logout|forgot|reset|verify|otp|2fa)|\/onboard|\/webhook|\/health|\/live|\/ready/.test(r.path)) continue;
        const pB = buildPath(r.path, B), pA = buildPath(r.path, A);
        const isWrite = r.method !== 'GET';
        // 1. A token + B resource id
        jobs.push(() => fire('A_token+B_id', r.method, r.path, pB.url, A.adminToken, {}, isWrite ? forged(A) : null, B, pB.sent));
        // 2. A token + B headers (+ B id)
        jobs.push(() => fire('A_token+B_header', r.method, r.path, pB.url, A.adminToken, { 'X-School-Id': B.schoolId, 'X-Branch-Id': B.mainBranchId }, isWrite ? forged(A) : null, B, pB.sent));
        // 3. A token + forged body pointing at B
        if (isWrite) jobs.push(() => fire('A_token+forged_body', r.method, r.path, pB.url, A.adminToken, {}, forged(B), B, pB.sent));
        // 4. B token + A resource id
        jobs.push(() => fire('B_token+A_id', r.method, r.path, pA.url, B.adminToken, {}, isWrite ? forged(B) : null, A, pA.sent));
        // 5. A TEACHER (branch-scoped) + B id
        jobs.push(() => fire('A_teacher+B_id', r.method, r.path, pB.url, A.teacherToken, {}, isWrite ? forged(A) : null, B, pB.sent));
        // 6. A TEACHER (main branch) + A's OWN sub-branch resource → branch crossover inside a school
        jobs.push(() => fire('A_teacher+A_subbranch', r.method, r.path,
            buildPath(r.path, { ...A, ids: { ...A.ids, student: A.ids.subStudent }, mainBranchId: A.subBranchId } as any).url,
            A.teacherToken, { 'X-Branch-Id': A.subBranchId }, isWrite ? forged(A) : null,
            { ...A, canary: `${A.canary} SubBranch Student`, ids: { subStudent: A.ids.subStudent } } as any, [A.ids.subStudent, A.subBranchId]));
    }
    console.error(`firing ${jobs.length} requests across ${ordered.length} routes...`);
    const results = await pool(jobs, 8);
    // Two endpoints cross the tenant boundary BY DESIGN and are owner-sanctioned:
    //  - GET /api/schools/public  : the pre-signup directory (id/name/code/logo of
    //    every active school, so a new owner can find theirs). No private data.
    //  - /api/global-forum/*      : the cross-school teacher community. Stores only
    //    message text + a first-name/role label; never school_id, branch, email,
    //    surname or ids. (A fixture canary can appear only because our seed names
    //    literally start with the canary token — that is the author's first name.)
    // A leak anywhere else is a real failure.
    const INTENTIONAL = /^\/api\/schools\/public|^\/api\/global-forum\//;
    const leaks = results.filter(r => r.leak.length && !INTENTIONAL.test(r.path));
    const intentional = results.filter(r => r.leak.length && INTENTIONAL.test(r.path));
    const byAttack: Record<string, { total: number; leaks: number }> = {};
    for (const r of results) { byAttack[r.attack] ||= { total: 0, leaks: 0 }; byAttack[r.attack].total++; if (r.leak.length) byAttack[r.attack].leaks++; }
    const statusHist: Record<string, number> = {}; results.forEach(r => statusHist[r.status] = (statusHist[r.status] || 0) + 1);
    fs.writeFileSync('tests/security/.attack-results.json', JSON.stringify({ results, leaks, intentional }, null, 1));
    console.log('REQUESTS:', results.length, '| ROUTES:', ordered.length, '| LEAKS:', leaks.length, '| intentional (allowlisted):', intentional.length);
    console.log('by attack:', JSON.stringify(byAttack));
    console.log('status histogram:', JSON.stringify(statusHist));
    const uniqRoutes = [...new Set(leaks.map(l => l.method + ' ' + l.path))];
    console.log('LEAKING ROUTES:', uniqRoutes.length);
    for (const l of leaks.slice(0, 60)) console.log(`  LEAK ${l.attack.padEnd(22)} ${l.status} ${l.method} ${l.path}  <- ${l.leak.slice(0, 2).join(',')}`);
    if (leaks.length) { console.log('VERDICT: NOT SAFE'); process.exit(1); }
    console.log('VERDICT: SAFE (this run)');
    process.exit(0);
})();
