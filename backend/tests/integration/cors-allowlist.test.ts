/**
 * CORS ALLOWLIST — cross-origin frontend support
 *
 * The frontend is served from Vercel while the API runs on its own host, so the
 * browser makes genuine cross-origin calls and CORS stops being optional.
 *
 * CORS_ALLOWED_ORIGINS was documented in .env.production but no code ever read
 * it, so setting it did nothing. These tests pin the behaviour down:
 *   - an origin on the list gets Access-Control-Allow-Origin back
 *   - an origin NOT on the list does not (so a random site cannot call the API
 *     with a logged-in user's credentials attached)
 *   - the preflight is answered by the CORS layer rather than falling through
 *     to auth and returning 401, which is what the deployed API did
 *   - requests with no Origin header at all (health checks, curl, same-origin
 *     navigations) are unaffected
 *
 * The env var is set before importing app.ts because the allowlist is read at
 * module load.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

const ALLOWED = 'https://school-app-roan-one.vercel.app';
const BLOCKED = 'https://not-my-site.example.com';

let app: Express;

beforeAll(async () => {
  process.env.CORS_ALLOWED_ORIGINS = `${ALLOWED},https://oliskeysms.duckdns.org`;
  ({ app } = await import('../../src/app'));
});

describe('CORS allowlist', () => {
  it('allows an origin on the list', async () => {
    const res = await request(app).get('/api/health').set('Origin', ALLOWED);
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('answers the preflight instead of falling through to auth', async () => {
    const res = await request(app)
      .options('/api/health')
      .set('Origin', ALLOWED)
      .set('Access-Control-Request-Method', 'POST');

    // The deployed API returned 401 here, which blocks every cross-origin call.
    expect(res.status).not.toBe(401);
    expect(res.status).toBeLessThan(300);
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED);
  });

  it('does not grant an origin that is not on the list', async () => {
    const res = await request(app).get('/api/health').set('Origin', BLOCKED);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('leaves requests without an Origin header alone', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });
});
