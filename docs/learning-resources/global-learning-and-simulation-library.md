# Global Learning & Simulation Library — Oliskey Learn Resources

**Status:** Research note for future development. The complete verified directory of platforms and links remains a follow-up task.

## Goal

Build a searchable library inside Oliskey School App that helps learners and teachers discover free or free-to-start educational simulations, virtual labs, and practical learning tools—from early childhood and primary school through secondary school, university, Master's, PhD, and professional/vocational training.

## Planned categories

- Early childhood and primary learning
- Secondary school subjects and exam preparation
- University, Master's, PhD, and research tools
- Science simulations and virtual laboratories
- Medical and health education
- Coding, robotics, computing, and AI
- Fashion design, sewing, and textiles
- Cooking, food preparation, and hospitality
- Engineering, construction, and architecture
- Business, accounting, and finance
- Agriculture and environmental skills
- Trades and technical/vocational skills
- Languages, arts, and creative skills

## Information to record for every platform

1. Platform name
2. Official website URL
3. Main subject or skill
4. Suitable learner level / age range
5. What users can practise or simulate
6. Access model: fully free, free with limits, freemium, trial, or paid
7. Account requirements and device/internet needs
8. Integration method: external link, iframe/embed, API, downloadable package, or self-hosted source
9. Licence and redistribution restrictions
10. Date last checked and notes about regional availability

## Technical and product guidance

- Start with a searchable directory that links to each provider's official website.
- Add embedding only after confirming the provider permits it and it works safely inside Oliskey.
- Self-host or adapt source code only when the licence explicitly permits it; check attribution, redistribution, and commercial-use requirements.
- Do not label a resource “free” without checking what is actually included. Distinguish fully free resources from freemium tools, trials, and free websites that do not allow embedding or redistribution.
- Check accessibility, mobile support, low-bandwidth performance, privacy, age suitability, and whether accounts are required.
- The web technologies to consider when reviewing simulations include HTML5, Canvas, WebGL, and WebAssembly; the right integration choice depends on each provider's technical setup and licence.

## Suggested integration fields

`id`, `name`, `official_url`, `description`, `subjects[]`, `learner_levels[]`, `skill_categories[]`, `access_model`, `free_features`, `limitations`, `account_required`, `device_requirements`, `internet_requirements`, `integration_type`, `embed_url`, `api_available`, `source_code_url`, `license`, `commercial_use_allowed`, `redistribution_allowed`, `age_suitability`, `accessibility_notes`, `last_verified_at`, `verification_notes`.

## Suggested implementation phases

1. **Directory MVP:** Search, category filters, learner-level filters, resource cards, official external links, and clear free/freemium labels.
2. **Verified embeds:** Add approved embeds or APIs where terms and security allow.
3. **Deeper integration:** Consider self-hosted or adapted simulations only after licence, maintenance, security, and performance review.
4. **Quality review:** Periodically recheck URLs, pricing, free tiers, privacy terms, and licensing.

## Research note

An earlier draft introduced the topic as “Comprehensive Framework of Open-Access Virtual Educational Simulations: K-12, Higher Education, Vocational Training, and Software Integration Architecture,” including web technologies and iframe embedding versus self-hosting. The text available so far was an introduction, not a complete verified directory of platform names and links. The actual directory is still to be researched and verified.

## Working name

**Global Learning & Simulation Library** — a proposed name for this Oliskey resource area, not a final product decision.
