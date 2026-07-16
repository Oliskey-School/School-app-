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
