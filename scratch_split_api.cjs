const fs = require('fs');

const src = fs.readFileSync('lib/api.ts', 'utf-8');
const L = src.split('\n'); // L[0] === line 1
const line = (n) => L[n - 1];
const slice = (a, b) => L.slice(a - 1, b).join('\n'); // inclusive 1-indexed

// ---- verified boundaries (see investigation) ----
const HEADER = slice(1, 45);          // imports, offline-blocked list, getAuthToken, ApiRequestInit
const INFRA_A = slice(47, 473);       // fields -> delete() (473 = last line before the AUTH banner)
const DOMAIN_A = slice(474, 517);     // AUTH banner + getMe..login
const REFRESH = slice(518, 545);      // refreshToken (infra)
const DOMAIN_B = slice(546, 4266);    // bulk of domain methods
const FROM = slice(4267, 4371);       // chainable shim (infra)
const DOMAIN_C = slice(4372, 4383);   // sync-engine aliases

// sanity assertions so a shifted line can never silently corrupt output
const expect = (cond, msg) => { if (!cond) { console.error('ASSERT FAILED: ' + msg); process.exit(1); } };
expect(line(46).includes('class ExpressApiClient'), 'line 46 is class decl');
expect(line(47).includes('private baseUrl'), 'line 47 is baseUrl field');
expect(line(477).includes('async getMe('), 'line 477 is getMe');
expect(line(518).includes('async refreshToken('), 'line 518 is refreshToken');
expect(line(4267).includes('from(table: string)'), 'line 4267 is from()');
expect(line(4384).trim() === '}', 'line 4384 closes the class');
expect(line(4387).includes('export const api = new ExpressApiClient()'), 'line 4387 exports api');

// ---- eager domain methods: copied verbatim into the lean module ----
const methods = JSON.parse(fs.readFileSync('scratch_methods.json', 'utf-8'));
const EAGER_NAMES = [
  'getMe', 'getMemberships', 'switchSchool', 'demoLogin', 'googleLogin',
  'forgotPassword', 'resetPassword', 'getSchoolById',
  'getActiveBranchId', 'getAuthorizedBranches',
  'updateMyProfile', 'updatePreferredLanguage',
  'getAppVersions', 'aiChat', 'login', 'resendVerification',
  'saveAttendance', 'saveGrade', 'recordPayment', 'createLessonPlan',
];
const byName = new Map(methods.map((m) => [m.name, m]));
const missing = EAGER_NAMES.filter((n) => !byName.has(n));
expect(missing.length === 0, 'all eager methods found (missing: ' + missing.join(',') + ')');

// class method -> exported standalone function, `this.X(` -> `apiCore.X(`
function toStandalone(name) {
  const m = byName.get(name);
  const body = slice(m.startLine, m.endLine);
  return body
    .replace(/^\s{4}/, '')                      // dedent signature
    .replace(/\n\s{4}/g, '\n')                  // dedent body
    .replace(/\bthis\./g, 'apiCore.')           // rebind infra calls to the shared singleton
    .replace(/^(async\s+)?([a-zA-Z_$][\w$]*)\s*\(/, (_, a, n) => `export ${a || ''}function ${n}(`);
}

const eagerFns = EAGER_NAMES.map(toStandalone).join('\n\n');

// ---- core.ts : all shared infrastructure + the single shared state instance ----
const core = `${HEADER}
/**
 * Shared API infrastructure: the request pipeline (auth header, CSRF, offline
 * queueing, 30s timeout, in-flight dedup, response cache), the token-refresh
 * lock, and the chainable query shim.
 *
 * Split out of lib/api.ts so the eager/critical path (login, session restore,
 * offline sync replay) can import ONLY what it needs. lib/api.ts's 600+
 * domain methods are class methods on a singleton, which a bundler cannot
 * tree-shake per-method, so importing \`api\` anywhere eager forced all of
 * them onto the first-paint bundle.
 *
 * There must only ever be ONE instance of this: the CSRF token, refresh lock,
 * response cache and in-flight dedup map are shared state, and two copies
 * would double-refresh tokens and serve each other stale reads. lib/api.ts
 * delegates to this same singleton rather than owning any of it.
 */
class ApiCore {
${INFRA_A}

${REFRESH}

${FROM}
}

export const apiCore = new ApiCore();
export type { ApiRequestInit };
`;

// ---- eager.ts : the ~20 domain calls the first-paint path actually makes ----
const eager = `import { apiCore } from './core';

/**
 * The only domain API calls reachable from the eager (pre-first-paint) import
 * graph: auth/session restore, branch + profile bootstrap, version check, and
 * the four mutations the offline sync engine replays. Bodies are copied
 * verbatim from lib/api.ts's corresponding methods and call the SAME shared
 * apiCore singleton, so behaviour and state are identical.
 *
 * Anything a lazy-loaded screen needs stays on \`api\` in lib/api.ts.
 */

${eagerFns}
`;

// ---- api.ts : keeps all 633 domain methods, delegates infra to apiCore ----
const delegators = `    // Infrastructure lives in ./api/core.ts and is shared with the eager path
    // (lib/api/eager.ts). These delegate so the domain methods below keep
    // calling this.get/this.post/... unchanged, while all cache/CSRF/refresh
    // state stays on the single apiCore instance.
    setLogoutHandler(handler: () => void): void { return apiCore.setLogoutHandler(handler); }
    async getCsrfToken(): Promise<string | null> { return apiCore.getCsrfToken(); }
    clearCsrfToken(): void { return apiCore.clearCsrfToken(); }
    invalidateCache(pattern?: string): void { return apiCore.invalidateCache(pattern); }
    async refreshToken(): Promise<any> { return apiCore.refreshToken(); }
    from(table: string) { return apiCore.from(table); }
    async fetch<T>(endpoint: string, options: ApiRequestInit = {}): Promise<T> { return apiCore.fetch<T>(endpoint, options); }
    async get<T>(endpoint: string, options?: RequestInit): Promise<T> { return apiCore.get<T>(endpoint, options); }
    async post<T>(endpoint: string, body: any, options?: RequestInit): Promise<T> { return apiCore.post<T>(endpoint, body, options); }
    async put<T>(endpoint: string, body: any, options?: RequestInit): Promise<T> { return apiCore.put<T>(endpoint, body, options); }
    async patch<T>(endpoint: string, body: any, options?: RequestInit): Promise<T> { return apiCore.patch<T>(endpoint, body, options); }
    async delete<T>(endpoint: string, options?: RequestInit): Promise<T> { return apiCore.delete<T>(endpoint, options); }`;

const newApi = `import { InspectionTemplate } from '../types/inspector';

import { optimizeImage } from './mediaOptimizer';
import { apiCore, type ApiRequestInit } from './api/core';

/**
 * Express API client — every domain call in the app.
 *
 * The request pipeline and all shared state now live in ./api/core.ts; this
 * class only holds domain methods and delegates infrastructure to that single
 * shared instance. See core.ts for why.
 */
class ExpressApiClient {
${delegators}

${DOMAIN_A}

${DOMAIN_B}

${DOMAIN_C}
}

// Export the client as both named and default exports for full compatibility
export const api = new ExpressApiClient();
export const HybridApiClient = ExpressApiClient;
export default api;
`;

fs.mkdirSync('lib/api', { recursive: true });
fs.writeFileSync('lib/api/core.ts', core);
fs.writeFileSync('lib/api/eager.ts', eager);
fs.writeFileSync('lib/api.ts', newApi);

console.log('core.ts   :', core.split('\n').length, 'lines');
console.log('eager.ts  :', eager.split('\n').length, 'lines');
console.log('api.ts    :', newApi.split('\n').length, 'lines (was', L.length, ')');
console.log('eager fns :', EAGER_NAMES.length);
