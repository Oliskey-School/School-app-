# Skill Observation Log

Observations captured during task-oriented work. Each entry identifies a
potential skill improvement or new skill opportunity.

**Status key:** OPEN = not yet actioned | ACTIONED = skill updated/created |
DECLINED = user decided not to pursue

---

### Observation 1: graphify query results low-signal for backend feature work

**Date:** 2026-07-13
**Session context:** Implementing Teacher QR attendance (new Prisma models + backend routes + UI)
**Skill:** graphify
**Type:** internal
**Phase/Area:** query relevance / hook enforcement

**Issue:** The mandatory graphify-before-read hook fired on every file read, but
`graphify query` results for backend-oriented questions (services, cron, room
models) returned mostly frontend icon/constant nodes from unrelated communities,
while direct reads of the conventional files (routes/controllers/services
triads) were what actually oriented the work.

**Suggested improvement:** Tune the graph or query so backend nodes (services,
controllers, prisma models) rank higher for backend-phrased questions, or relax
the hook to require graphify once per task phase rather than before every read.

**Principle:** Enforcement hooks should be calibrated to when the underlying
tool adds signal; blanket per-call enforcement of a low-precision tool trains
the agent to treat it as a ritual instead of a source of truth.

### Observation 2: Date-bounded seed data silently breaks features after the seed window ends

**Date:** 2026-09-18
**Status:** OPEN
**Session context:** Demo pricing page + real Paystack activation
**Skill:** deploy-check
**Type:** open-source
**Phase/Area:** pre-flight data audit

**Issue:** The academic calendar was seeded for one session (2025/2026) only. Once
that session closed, `getCurrentTerm()` returned null and EVERY paid plan
activation failed with "No active academic term configured" — for live schools
too — with no test or checklist item catching it. Found only by querying the DB
while building an unrelated feature.

**Suggested improvement:** Add a deploy-check item: "for every date-bounded
seed/config table (calendars, pricing windows, term dates, holiday lists), verify
a row covers today AND the next 90 days, or that the code auto-extends it."

**Principle:** Seed data with an expiry is a time bomb; audits must check
coverage against the current date, not just row existence.
