# Multi-tenant hostile security gate

Full cross-school/cross-branch attack surface probe. Not a mock — it onboards
two real schools through the production API, plants real data in both, then
fires every registered route with forged tenant identity and checks for the
other school's canary in the response.

## Run it

```bash
# 1. Backend must be running (dev: npm run server)

# 2. Dump every registered route to tmp-routes.json (gitignored — regenerate
#    whenever routes change; attack.ts reads this instead of a hand-maintained list)
npx tsx --tsconfig backend/tsconfig.json tests/security/dump-routes.ts

# 3. Seed two fresh tenants (prints nothing useful to stdout on success —
#    redirect to the fixture file the attack script reads)
npx tsx --tsconfig backend/tsconfig.json tests/security/seed-tenants.ts > tests/security/.fixture.json

# 4. Fire the probe
npx tsx --tsconfig backend/tsconfig.json tests/security/attack.ts
```

Exits 0 and prints `VERDICT: SAFE (this run)` when nothing leaked outside the
two intentional cross-school features (`/schools/public`, `/global-forum/*`).
Exits 1 and lists every leaking `attack/status/method/path` otherwise.

Tokens in `.fixture.json` expire in 15 minutes. For repeat runs against the
same fixture, refresh them first:

```js
// re-login both tenants' admin+teacher and rewrite .fixture.json — see
// the inline re-login snippet in the seed script's usage comment, or just
// re-run seed-tenants.ts to create a fresh pair.
```

## What it checks

- **Cross-school** (School A token/header/body aimed at School B, and back).
- **Cross-branch** (main-branch teacher → sub-branch; sub-branch admin → main branch).
- **Inside one school (ownership):** student #1 → student #2's records, and a
  parent → a child that is not theirs. Student #2's rows carry a private token
  that is never sent, so it can only appear if another student's data leaked.
- **Role escalation:** any write a student or parent token gets a 2xx for must
  be on `STUDENT_PARENT_WRITE_ALLOWLIST` in `attack.ts` (self-service,
  own-child, submissions). A canary can't catch a write that returns no data —
  a student token once deleted a class and upgraded the school's plan silently.

## What it does NOT replace

`backend/tests/integration/multi-tenant-security.test.ts` is the fast CI
tripwire — it checks the RLS policy shape and a couple of known-fixed
write-path bugs without a running server. This directory is the slow,
exhaustive, live-server companion; run it before a release, not on every
commit.

## Cleanup after a run

The seeder writes real rows via the RLS bypass flag (two schools' worth of
students/teachers/parents/etc, tagged with a canary in every name). Nothing
here deletes them — they are throwaway CI-style data, harmless to leave, but
delete the two schools by id if you want a clean database.
