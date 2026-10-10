# Global Learning & Simulation Library — Oliskey Learn Resources

**Status:** Research and implementation plan. Verify every resource's current terms before embedding or redistributing it.

## Goal

Build a searchable, engaging learning library inside Oliskey School App. It should help learners discover simulations, virtual labs, courses, and practical skill tools from early childhood and primary school through secondary, university, postgraduate/research, and vocational learning.

## Planned categories

- Early childhood and primary learning
- Secondary school subjects and exam preparation
- University, Master's, PhD, and research
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

## Initial research shortlist

These are starting points, not endorsements or guarantees that every feature is free. Link out first; verify each provider's terms, free tier, age suitability, and availability before making promises.

| Resource | Best fit | Official link | Integration note |
|---|---|---|---|
| PhET Interactive Simulations | School science and mathematics | https://phet.colorado.edu/ | Excellent interactive simulations. Its regular simulation files use CC BY-NC 4.0; commercial or paid-product use may require permission. Link out unless Oliskey has confirmed permission. |
| MIT OpenCourseWare | University to advanced study | https://ocw.mit.edu/ | Free course materials across many disciplines. Reuse is subject to MIT's licence and attribution terms; many materials are for non-commercial use. Link out first. |
| MIT Open Learning Library | University-level interactive study | https://ocw.mit.edu/collections/mit-open-learning-library/ | Some courses include interactive, auto-graded activities. Check the licence on each course. |
| OpenStax | Secondary-adjacent and higher-education textbooks | https://openstax.org/ | Free digital textbooks; CC BY-NC-SA generally means non-commercial reuse only, attribution, and ShareAlike for adaptations. Link out unless commercial rights are confirmed. |
| Tinkercad | Beginner 3D design, circuits, and code blocks | https://www.tinkercad.com/ | Useful for practical STEM learning. Check account, age, classroom, embedding, and current terms before integration. |
| GeoGebra | Mathematics, graphing, geometry, and classroom activities | https://www.geogebra.org/ | Interactive maths tools. Check the licence and specific embedding/redistribution terms for each item. |
| Scratch | Beginner coding and creative computing | https://scratch.mit.edu/ | Visual programming for learners. Link to official projects/editor; check age, account, embed, and privacy requirements. |
| Arduino | Electronics, coding, and maker projects | https://www.arduino.cc/ | Practical learning resources; distinguish free documentation from paid hardware or courses. |
| freeCodeCamp | Web development and programming | https://www.freecodecamp.org/ | Free coding curriculum and projects; primarily link out rather than copying content. |
| OpenLearn | Broad subjects and lifelong learning | https://www.open.edu/openlearn/ | Free courses and learning materials; check individual reuse terms and whether a course offers a certificate. |
| Alison | Career and vocational courses | https://alison.com/ | Free-to-study options may coexist with paid certificates or services; label the actual offer clearly. |
| GCFGlobal | Digital literacy, work skills, and everyday learning | https://edu.gcfglobal.org/ | Accessible beginner tutorials; check reuse terms before copying or embedding. |
| BBC Bitesize | School-level revision | https://www.bbc.co.uk/bitesize | Useful school-learning reference, but regional availability and reuse restrictions may apply. Link out. |
| NASA STEM | Space, science, and engineering activities | https://www.nasa.gov/learning-resources/ | Useful STEM materials. Check asset-specific credits, third-party material, and usage rules. |
| LabXchange | Science learning and virtual labs | https://www.labxchange.org/ | Explore simulations, lab activities, and learning pathways. Check each resource's licence and embedding options. |

**Important:** A resource being accessible for free does not automatically mean it can be copied, embedded, rebranded, or included in a paid school product. Provider terms can change. Store licence and verification details per resource and recheck them regularly.

## Information to record for every platform

1. Name and official URL
2. Description, subjects, skills, learner level, and age suitability
3. What learners can actually practise
4. Access model: free, free with limits, freemium, trial, or paid
5. Which features are free and what costs extra
6. Account, device, bandwidth, and regional requirements
7. Integration method: external link, approved iframe, API, download, or self-hosted source
8. Licence, attribution requirements, commercial-use permission, and redistribution permission
9. Accessibility, privacy, and safeguarding notes
10. Date last verified and verification notes

## Product experience and responsive design

- Make learning highly visible from the main student dashboard through a clear **Learn & Practise** entry point, not a hidden menu.
- Provide a welcoming learning home with a search field, subject/category chips, level filters, and curated “Start here” resources.
- Use readable resource cards with a short description, level, subject, free/freemium label, connection requirement, and one clear action.
- Prioritise interactive resources and practical skills, not a wall of text. Offer “Open activity” and a short “What you will learn” summary.
- Mobile-first: one-column cards on phones, two columns on tablets where space permits, and three or more on wide screens only when cards remain readable. Never force horizontal scrolling.
- Support keyboard navigation, visible focus, screen readers, accessible contrast, reduced motion, zoom, and touch targets.
- Handle loading, empty results, broken links, blocked embeds, and offline/poor-network states gracefully.
- If an external site blocks embedding, show a helpful message and an **Open on provider website** action. Never bypass the provider's restrictions.
- Keep the layout consistent with Oliskey's approved design system; do not redesign unrelated dashboards.

## Technical implementation guidance

### Start simple

1. Inspect the existing repository, routing, authentication, design system, test tools, and build commands before changing code.
2. Add a data-driven resource catalogue (initially a small local JSON/TypeScript dataset) and a reusable responsive library page.
3. Implement search and filters client-side for the small initial catalogue. Avoid an AI call for ordinary search, filtering, or opening resources.
4. Use official external links by default. Add an iframe only after checking provider policy and technical behaviour. Do not scrape content or copy protected assets.
5. Add a database/admin content workflow only if the current architecture needs staff to manage resources. Do not add a new backend or dependency without a clear reason.
6. Keep student progress tracking separate from the resource catalogue. If progress is added, save only necessary fields and enforce the app's existing school/role access controls.
7. Add automated tests and verify local and production builds before marking the work complete.

### Local and production reliability

- Use the repository's existing framework and package manager; do not assume a framework or replace the stack.
- Avoid hard-coded localhost URLs. Use relative internal routes and existing environment-variable conventions for external service URLs.
- Keep secrets out of frontend code. Do not make the catalogue depend on a development-only server or local filesystem at runtime.
- Ensure static resources are included in the production build and paths work under the actual deployment base path.
- Test with a local development server and a production build/preview. Check direct route refresh, navigation, external links, iframe failures, and console/network errors.
- Do not claim production works unless a real production deployment can be tested.

### Performance and low-bandwidth support

- Do not send catalogue content to an AI model for basic UI operations.
- Use small metadata records, pagination or “Load more” for larger catalogues, lazy-load embeds only after the learner opens a resource, and avoid loading multiple heavy simulations on the listing page.
- Do not autoplay video/audio. Show a lightweight thumbnail or icon before opening a large activity.
- Prefer provider-hosted content to duplicating large files, unless offline use and licence terms justify self-hosting.
- Cache only public catalogue data safely; do not cache private student information in a public cache.

### Suggested resource fields

`id`, `name`, `officialUrl`, `description`, `subjects[]`, `learnerLevels[]`, `skillCategories[]`, `accessModel`, `freeFeatures`, `limitations`, `accountRequired`, `deviceRequirements`, `internetRequirements`, `integrationType`, `embedUrl`, `sourceCodeUrl`, `license`, `attributionText`, `commercialUseAllowed`, `redistributionAllowed`, `ageSuitability`, `accessibilityNotes`, `lastVerifiedAt`, `verificationNotes`.

Use unknown/null rather than guessing licence or pricing details.

## Suggested implementation phases

1. **MVP:** Discoverable learning entry, responsive catalogue, search, filters, clear access labels, and official external links.
2. **Quality:** Verify links, mobile behaviour, accessibility, poor-network handling, and local/production builds.
3. **Approved embeds:** Add only provider-approved embeds; lazy-load them and provide an external fallback.
4. **Progress and curation:** Add bookmarks or progress only if useful and supported by existing authentication/data patterns.
5. **Ongoing review:** Recheck links, prices, free tiers, privacy, licences, and commercial-use permissions.

## Copy-and-paste AI coding prompt

You are the builder for Oliskey School App. Implement the **Learn & Practise — Global Learning & Simulation Library** in the existing repository.

**First inspect; then implement.** Read the project structure, current routes, design system, authentication/roles, data patterns, package scripts, and tests. Reuse the existing stack and approved UI. Do not replace architecture or edit unrelated screens.

Requirements:
- Make learning easy to discover from the student dashboard and create a clean, premium, mobile-first library page.
- Include searchable resources, subject/skill categories, learner-level filters, useful resource cards, accurate free/freemium/paid labels, and clear “Open activity” links.
- Seed the catalogue with verified official resources from this document. Treat the list as research leads; record unknown terms as unknown and never claim a licence, free feature, or embed permission without checking it.
- Default to official external links. Embed only when provider terms allow it; lazy-load embeds and always provide an external-link fallback. Never scrape, rebrand, or redistribute content without permission.
- Make it responsive across small phones, large phones, tablets, laptops, and wide monitors. No overflow, clipped content, tiny text, overlapping controls, or forced horizontal scrolling.
- Support keyboard access, visible focus, semantic labels, accessible contrast, reduced motion, and loading/empty/error states.
- Optimise for low bandwidth: no AI calls for search/filter, no autoplay, no heavy iframe loads on the listing page, and no unnecessary packages.
- Ensure it works in local development and production. Use existing environment conventions, no hard-coded localhost URLs, and no development-only runtime dependencies.
- Follow existing multi-school and role permissions. Do not expose private student data or weaken security.
- Add or update tests for search, filters, resource links, responsive states where testable, and error/fallback behaviour.
- Run available lint, type-check, unit tests, and production build. Fix failures caused by your changes. Report exact commands and results; do not claim a test or deployment passed unless it actually ran.
- Keep code and AI usage token-efficient: inspect only relevant files, make focused edits, avoid repeated whole-repository dumps, avoid unnecessary explanations, and summarise changed files, tests, risks, and next steps.
- Do not mark the task complete until a separate verifier reviews the changes and tests them. If something cannot be verified, state it clearly instead of guessing.

Deliver: working code, a short implementation summary, test results, and any unresolved licence or deployment issues.

## Research references

- PhET licensing: https://phet.colorado.edu/en/licensing — regular simulation files are CC BY-NC 4.0; commercial use may require permission.
- MIT OpenCourseWare getting started and reuse: https://ocw.mit.edu/pages/get-started/
- MIT Open Learning Library: https://ocw.mit.edu/collections/mit-open-learning-library/
- OpenStax licensing: https://help.openstax.org/s/article/Licensing-information-of-OpenStax-textbooks
- OpenStax higher education: https://openstax.org/higher-education

## Research note

The original material introduced open-access simulations, web technologies such as HTML5/Canvas/WebGL/WebAssembly, and iframe versus self-hosting. The verified shortlist above adds practical starting points and implementation safeguards. The list is not exhaustive; verify each provider's current conditions before launch.

## Working name

**Global Learning & Simulation Library** — a proposed name, not a final product decision.
