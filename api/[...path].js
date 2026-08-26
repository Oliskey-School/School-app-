/**
 * Vercel serverless entry for the Express API.
 *
 * WHY THIS EXISTS
 * ---------------
 * The SPA on Vercel calls /api/... and nothing answered there — the API only
 * ever ran on the VPS — so every call returned Vercel's NOT_FOUND page. This
 * runs the same Express app as a serverless function so Vercel and Supabase
 * work on their own while the VPS is parked.
 *
 * WHY PLAIN COMMONJS, NOT TYPESCRIPT
 * ----------------------------------
 * The first version of this file was `[...path].ts` importing
 * `../backend/src/app`. Vercel emitted it as `[...path].js` with the ESM
 * `import` statement intact, and since the root package.json has no
 * `"type": "module"` Node loaded it as CommonJS and died at cold start:
 *
 *   SyntaxError: Cannot use import statement outside a module
 *   Node.js process exited with exit status: 1   (FUNCTION_INVOCATION_FAILED)
 *
 * Rather than fight the bundler's module format, this requires the ALREADY
 * COMPILED backend. `npm run build:backend` emits CommonJS
 * (backend/tsconfig.build.json sets module: CommonJS), so there is nothing left
 * to transpile and no ambiguity about the format.
 *
 * The path looks wrong but is not: tsc widens rootDir to the repo root because
 * backend/src/routes/student.routes.ts imports ../../../shared/utils/validation,
 * so the output nests at backend/dist/backend/src/ rather than backend/dist/src/.
 * scripts/link-prisma-dist.js exists for the same reason.
 *
 * A catch-all `[...path]` rather than `index.js` plus a rewrite: the catch-all
 * preserves the original request path in req.url, so /api/auth/demo/login still
 * matches the routes mounted at /api in backend/src/app.ts. Rewriting to a bare
 * /api collapses the path and 404s every route.
 *
 * WHAT DOES NOT WORK HERE
 * -----------------------
 * Functions are request-scoped, so these need the VPS (or another always-on
 * host) and are inert on Vercel:
 *   - Socket.io / realtime — demo role-switching loses live updates.
 *   - The background task worker and the crons started in server.ts.
 *   - Writes to uploads/ — the filesystem is ephemeral per invocation.
 *
 * Redis already degrades to in-memory (backend/src/middleware/rateLimiters.ts),
 * so rate limiting becomes per-invocation rather than failing outright.
 *
 * DATABASE_URL must be Supabase's TRANSACTION pooler (port 6543,
 * ?pgbouncer=true): each cold start opens its own connection, and the direct
 * connection limit is exhausted almost immediately without pgbouncer.
 */
const { app } = require('../backend/dist/backend/src/app.js');

module.exports = app;
