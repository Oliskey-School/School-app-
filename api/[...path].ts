/**
 * Vercel serverless entry for the Express API.
 *
 * WHY THIS EXISTS
 * ---------------
 * The frontend is served by Vercel as a static SPA and calls `/api/...`. Until
 * now nothing answered those calls on Vercel — the API only ever ran on the
 * VPS — so every request 404'd with Vercel's own NOT_FOUND page. This runs the
 * same Express app as a serverless function so Vercel and Supabase work on
 * their own, with the VPS parked.
 *
 * A catch-all `[...path]` (rather than `index.ts` plus a rewrite) is used on
 * purpose: it preserves the original request path in `req.url`, so `/api/auth/
 * demo/login` still reads as `/api/auth/demo/login` inside Express. A rewrite
 * to a bare `/api` collapses the path and every route 404s.
 *
 * backend/src/app.ts exports the app without listening (server.ts owns
 * `listen`), which is exactly the shape a serverless handler needs.
 *
 * WHAT DOES NOT WORK HERE
 * -----------------------
 * Serverless functions are request-scoped, so the following are inert on
 * Vercel and need the VPS (or a separate always-on host):
 *   - Socket.io / realtime: no persistent connection survives a function
 *     invocation, so demo role-switching will not update live.
 *   - Background task worker and the cron jobs in server.ts.
 *   - Disk writes to uploads/ — the filesystem is ephemeral and per-invocation.
 *
 * Redis is already optional (backend/src/middleware/rateLimiters.ts falls back
 * to in-memory when it cannot connect), so rate limiting degrades to
 * per-invocation rather than failing.
 *
 * DATABASE
 * --------
 * DATABASE_URL must be Supabase's TRANSACTION pooler (port 6543,
 * ?pgbouncer=true). Serverless invocations open a connection per cold start,
 * and the direct/session connection limit is exhausted almost immediately
 * without pgbouncer in front.
 */
import { app } from '../backend/src/app';

export default app;
