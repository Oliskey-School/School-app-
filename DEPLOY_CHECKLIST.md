# /deploy-check Knowledge Base

Living checklist built from real issues found during production-readiness audits of this app (Contabo VPS, PM2, nginx, Express + PostgreSQL/Prisma). Read this before starting a new `/deploy-check` pass, and add a new entry any time a fresh class of bug is found.

## How to use this file

1. Before auditing, skim every item below and re-check it against the current code — don't assume a past fix is still in place.
2. When you find a NEW bug during an audit, add an entry using the template at the bottom.
3. Keep entries short: root cause, why it breaks production, the fix pattern. No full diffs.

---

## PM2 / process management

- **`wait_ready: true` requires the app to actually call `process.send('ready')`.** If `ecosystem.config.js` sets `wait_ready` but nothing in `server.ts` calls it, PM2 waits the full `listen_timeout` then force-restarts — an infinite crash-loop in production, even though the app started fine. Check: grep the entrypoint for `process.send` whenever `wait_ready` is set.
- **`exec_mode: 'cluster'` with `instances: 'max'` silently multiplies any singleton background service** (queue workers, cron/reset schedulers, migration-on-boot code) — each PM2 worker runs its own copy. Before enabling cluster mode, every `setInterval`/scheduled job/one-time migration started at boot must be made leader-elected or moved to a single dedicated process. Socket.io also needs `@socket.io/redis-adapter` in cluster mode, or `io.to(room).emit()` only reaches sockets on the same worker.
- **Pin `cwd` in `ecosystem.config.js`** whenever the app resolves paths via `process.cwd()` (e.g. multer upload storage, `.env` resolution). PM2 does not reliably inherit the directory you'd expect otherwise.

## Cross-tenant / multi-tenant isolation (CRITICAL class of bug)

- **Pattern to grep for on every audit:** `req.query.school_id`, `req.query.schoolId`, or `req.params.schoolId` combined with `|| req.user.school_id` (client value takes priority via `||` short-circuit, or is accepted as an override at all). This lets any authenticated user read another tenant's data by passing a different ID in the query string/params — the JWT's verified `school_id` claim must always win, with no client-supplied fallback or override.
- Fix pattern: `const schoolId = req.user.school_id;` — full stop, no query/param fallback. If a param is ever legitimately needed (e.g. platform SuperAdmin support tooling), gate it explicitly behind a role check, never a bare `||`.
- This bug tends to recur across many controllers copy-pasted from an earlier pattern — once you find it in one file, grep the *entire* `controllers/` directory, don't assume it's isolated to the flagged file.
- Same class of bug applies to `branch_id` in a branch-hierarchy multi-tenant app — check both together.

## Logging / data exposure

- `console.log(..., JSON.stringify(req.body))` on any controller handling PII (parents, students, payment info) leaks full request bodies into logs — including anything added to that payload later (e.g. a password field bolted on in a future change). Replace with an explicit allowlist of safe fields (`{ schoolId, hasEmail: !!req.body?.email }`), never a raw body dump.

## Cookies / CSRF

- Auth cookie `sameSite` and CSRF cookie `sameSite` must be set consistently. If the deployment is same-origin (nginx serving SPA + API under one domain, as in `deploy/nginx.conf`), `'lax'` is both stronger than `'none'` and sufficient — top-level nav and same-site XHR still carry the cookie. `'none'` widens the cookie to genuine cross-site requests for no benefit under a same-origin deployment and should only be used if the API is ever split onto a different origin than the SPA.

## Rate limiting

- Every **unauthenticated** endpoint that sends an email, SMS, or OTP (verify-email, resend-verification, password reset, parent OTP flows) needs its own tight rate limit tier, independent of the general auth tier — otherwise it's a free email-bombing / OTP brute-force vector. Don't rely on the global API limiter; that budget is far too generous for a single-purpose endpoint like this.
- If a limiter (e.g. an `exportLimiter`) is defined in `rateLimiters.ts` but never imported into a route file, it's providing zero protection. Grep for unused exports from the rate-limiter module as part of every audit.

## Frontend: mock/hardcoded data

- Grep for `// TODO: Fetch actual` / `// TODO: Calculate from` comments next to `useState` initializers — these are the highest-signal marker of dashboards showing fabricated numbers as if real (revenue, expenses, attendance %, etc.).
- When wiring in real data, if the backend genuinely has no data source for a metric (e.g. no expense-tracking model exists anywhere in the schema), don't invent a fabricated calculation to fill the gap — relabel the card honestly (`N/A`, or drop it) rather than replacing one fake number with a different fake number.
- This is a UI-affecting change even when it's "just" wiring real data — confirm scope with the project owner before altering card layout/labels per this repo's UI Preservation Policy (see root `CLAUDE.md`). Pure logic/data-source swaps that don't touch styling do not require UI sign-off; removing/relabeling a card does.

## React Context performance

- Any Context `Provider value={{...}}` object literal re-renders every consumer on every parent render, even if the values inside are unchanged. Wrap the value in `useMemo`, and make sure every function in that value object is itself `useCallback`-wrapped — a memoized object containing a freshly-recreated function still breaks the memoization.

## Verification / dead code

- Before deleting a suspicious legacy auth path (e.g. a JWT carrying an embedded OTP `code` claim, checked against user input), verify whether anything in the frontend still calls it. A `jwt.verify`-gated endpoint that requires the server's own signing secret to produce a valid token is not exploitable by an external attacker even if the design looks odd — but if nothing issues that token type anymore, it's dead code that should be flagged for removal rather than "fixed" in place.

## False-positive to recognize immediately

- A background `tsc --noEmit` check reported via task notification as "failed, exit code 1" is frequently just an empty grep/output artifact of the harness, NOT a real compile error. Always read the actual output file directly — an empty file means zero errors, despite the exit-code framing.

---

## Entry template

```
### <short title>
- **What broke:** <root cause in one sentence>
- **Why it fails in production specifically:** <reason — e.g. only shows up under cluster mode, only shows up behind nginx, only shows up with N concurrent users>
- **Fix pattern:** <the general pattern to apply, not just this one instance>
```
