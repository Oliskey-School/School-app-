---
name: oliskey-role-reference
description: Reference for every Oliskey School App user role — what each role sees, what each role does, how roles interact through one login + PostgreSQL RLS, competitor links per role for deeper research, and the concrete feature gaps still open. Use this before designing, building, or reviewing any dashboard, permission, RLS policy, or role-specific feature in the Oliskey School App.
---

# Oliskey School App — Role Reference & Gap-Closing Skill

Built for Mr. Olamide (Oliskeylee), CEO of Oliskeylee Ltd. Companion to `oliskey-testing-skill`.
Purpose: give Claude Code a fast, accurate mental model of "who sees what" in a multi-tenant school SaaS, sourced from how the market leaders (OpenEduCat, Fedena, MyClassCampus, EduSys, Classe365, Teachmint, PowerSchool, Blackbaud, Moodle, Google Classroom) split roles — then flag exactly where Oliskey is ahead, on par, or has a gap to close.

## How to use this skill

1. Before building or reviewing anything role-specific (a dashboard widget, an RLS policy, an API endpoint, a permission check), open the matching role section below.
2. Check "Gaps to close" for that role before writing new code — if the feature already appears there, build toward that spec instead of guessing.
3. If you need deeper detail than this file gives, follow the "Reference" link for that role and read the live page before implementing.
4. Every role shares one login page. Routing logic is always: `JWT { school_id, role, is_active }` → PostgreSQL RLS filters every query to that `school_id` (self-hosted Postgres + Prisma, not Supabase) → frontend renders the dashboard matching `role`. Never build a feature that queries data without a `school_id` filter, and never let one role's route render another role's data even during testing.
5. When a competitor does something Oliskey doesn't, don't copy blindly — check it against Oliskey's tiered pricing (Level 1–4) and phase plan (Phase 1–6) before recommending it as in-scope.

---

## 1. Core interaction model (how roles connect)

- **One login, nine dashboards.** Administrator/Principal, Teacher, Student, Parent, Counselor/Guidance Officer, Proprietor/Owner, Compliance Officer, Exam Officer, Inspector/Ministry Official — same auth flow, different `role` claim.
- **Data isolation.** Every table carries `school_id`. RLS means one school's outage, bug, or breach never touches another school's data. This is the #1 thing every competitor above (except Google Classroom/Moodle, which are single-tenant-per-domain) solves differently — Oliskey's self-hosted PostgreSQL RLS approach is closer to PowerSchool/Blackbaud's enterprise multi-tenant model than to the others.
- **Typical data flow between roles:**
  - Teacher marks attendance → Parent sees it in real time → Admin sees it rolled up in KPIs → Compliance Officer sees it in attendance-based compliance scoring.
  - Teacher submits grades → Admin/Exam Officer approves & publishes report card → Parent + Student can view/download.
  - Parent pays fees → Admin sees payment in fee dashboard + arrears tracker → Proprietor sees it in revenue/budget view.
  - Counselor logs a behavioral/wellbeing note → Parent sees a filtered, appropriate version → Admin sees an aggregated safety signal, not necessarily the private note.
  - Inspector/Ministry Official gets a read-only, audit-scoped view — never write access — built from the same compliance data Compliance Officer curates.
- **Design rule carried across every competitor reviewed:** each role's dashboard is a *view*, not a separate app — same design system, same notification/messaging backbone, permission-gated widgets. Build Oliskey dashboards as one shell with role-conditional modules, not nine separate codebases.

---

## 2. Role-by-role matrix

### Administrator / Principal / School Management
**Sees:** every module for their `school_id` — enrollment, attendance roll-ups, finance, staff, compliance, communications.
**Does:** user provisioning, fee structure setup, timetable generation, report card publishing approval, branding/config, broadcast messaging, branch management.
**Cannot see:** other schools' data (RLS-enforced); private counselor notes (should be redacted/summarized, per Blackbaud's family-portal privacy pattern).
**References:** Fedena user management — https://fedena.com/feature-tour/school-user-management-system · PowerSchool admin access & roles — https://ps.powerschool-docs.com/pssis-admin/latest/admin-access-and-roles · OpenEduCat features — https://openeducat.org/features/
**Gaps to close (Oliskey today → what's missing):**
- No **customizable/drag-drop dashboard widgets** — Fedena lets admins add/remove dashlets per user; Oliskey's admin dashboard is currently fixed-layout.
- No **granular security-group / field-level permission editor** — PowerSchool lets admins build custom access roles beyond the 9 fixed ones; Oliskey RBAC is role-fixed, not composable.
- No **"view as" impersonation mode** for support (Blackbaud lets admins/teachers view a student's portal read-only to debug issues) — useful for support tickets and QA.
- No **admissions/inquiry CRM** (lead capture → application → enrollment funnel with pipeline stages) — MyClassCampus and Classe365 both treat admissions as CRM, Oliskey doesn't have an inquiry-to-enrollment pipeline module yet.

### Teacher
**Sees:** own classes' students, attendance, gradebook, lesson plans, assignments, timetable, payslips, PD courses.
**Does:** marks attendance, grades, builds CBT/quizzes, uploads lesson notes, messages parents, requests leave.
**Cannot see:** other teachers' classes (unless co-teaching/HOD role), school-wide finance, other schools.
**References:** Fedena feature tour — https://fedena.com/feature-tour · EduSys — https://www.edusys.co/ · Moodle Teacher/Non-editing Teacher roles — https://docs.moodle.org/502/en/Managing_roles
**Gaps to close:**
- No **non-editing teacher / co-teacher role** — Moodle distinguishes a Teacher (can edit content) from a Non-editing Teacher (can grade/view only). Oliskey's teacher role is monolithic; substitute teachers or teaching assistants have no scoped-down variant.
- No **lesson-plan-to-syllabus progress tracker** — EduSys ties lesson plans to syllabus completion percentage visible to admin; Oliskey has "advanced lesson planner" but no syllabus-completion analytics tied to it.
- No **classroom/community groups** beyond the class roster (EduSys lets teachers create unlimited activity-based groups for coordination).

### Student
**Sees:** own timetable, assignments, quizzes, grades, library, games hub, achievements.
**Does:** submits assignments, takes CBT exams, messages teachers, joins extracurriculars.
**Cannot see:** other students' grades/records, teacher-only analytics, admin/finance data.
**References:** Google Classroom user roles — https://developers.google.com/workspace/classroom/guides/key-concepts/user-types · Classe365 — https://www.classe365.com/ · Blackbaud LMS — https://www.blackbaud.com/products/learning-management-system
**Gaps to close:**
- No **"view class content as it will appear" preview** independent of a teacher publishing it live — Blackbaud lets faculty preview the student view before assigning; less critical for students themselves but worth noting for QA parity.
- No **alumni transition path** — Classe365 has alumni management; once a student graduates, Oliskey has no defined "graduate/alumni" state, badge, or continued limited access (e.g., transcript requests).

### Parent
**Sees:** own child(ren)'s attendance, grades, fees, behavioral records, bus location, messages.
**Does:** pays fees, messages teachers, responds to permission slips/consent forms, donates, volunteers.
**Cannot see:** other students' data, teacher-internal notes, school-wide finance.
**References:** OpenEduCat parent portal — https://openeducat.org/feature-parent-portal/ · Fedena students & parents login — https://fedena.com/feature-tour/students-parents-login · Google Classroom guardian summaries — https://support.google.com/edu/classroom/answer/7017326?hl=en
**Gaps to close:**
- No **automated digest email/SMS** ("Guardian Summary") — Google Classroom auto-emails parents a daily/weekly digest of missing work, upcoming work, and activity without requiring app login. Oliskey has messaging/notifications but not a scheduled auto-digest for lower-engagement parents.
- No confirmed **multi-child single-login switcher UX spec** — OpenEduCat explicitly supports switching between children from one login; Oliskey's parent dashboard should confirm/design this explicitly rather than assume it.
- No **chatbot for quick Q&A** — EduSys offers a parent-facing chatbot for common questions (fee balance, next event, homework due); Oliskey's AI features list doesn't include a parent chatbot yet.

### Counselor / Guidance Officer
**Sees:** referred/flagged students, behavioral and wellbeing history, safety logs.
**Does:** logs counseling notes, escalates safety concerns, coordinates with admin on special-needs support (Phase 4).
**Cannot see:** unrelated students' academic-only data unless also flagged; full financial records.
**References:** Blackbaud K-12 communication — https://www.blackbaud.com/industry-insights/resources/k-12-schools/the-keys-to-clear-communication-in-blackbauds-k-12-education-management-portfolio
**Gaps to close:**
- This role is the least documented among all references — none of the 10 platforms have a dedicated public "counselor portal" page, meaning it's a genuine differentiator Oliskey can own if built well. No competitor prior art to copy means Oliskey should design this from first principles: private note visibility rules, escalation workflow to admin/parent, and a clear boundary on what counselor notes ever surface to non-counselor roles.

### Proprietor / Owner
**Sees:** cross-branch revenue, budget planner, compliance status (Green/Amber/Red), multi-branch KPIs.
**Does:** approves budgets, reviews branch performance, sets school-wide policy.
**Cannot see:** individual student private records unless also holding Admin role.
**References:** PowerSchool SIS — https://www.powerschool.com/products/student-information/sis/ · Blackbaud enrollment/business office — https://www.blackbaud.com/industry-insights/resources/k-12-schools/the-connected-student-enrollment-experience
**Gaps to close:**
- No **multi-branch comparison dashboard** confirmed — PowerSchool/Blackbaud support district-level roll-ups across many schools; Oliskey has "branch management" for admin but the Proprietor-level cross-branch comparison view (revenue per branch, compliance per branch side-by-side) isn't explicitly speced.

### Compliance Officer
**Sees:** Green/Amber/Red compliance dashboard, audit trails, regulatory documentation status.
**Does:** flags non-compliant records, prepares for inspection, tracks certification renewals.
**Cannot see:** unrelated student academic content.
**References:** PowerSchool security groups — https://cdnsm5-ss18.sharpschool.com/UserFiles/Servers/Server_27969467/File/IT%20Resources/PowerSchool/PowerSchool%20Handbooks%20and%20Job%20Aids/System%20Administration/Security_Groups.pdf
**Gaps to close:**
- No **document expiry/renewal reminder engine** — competitors bundle compliance mostly into admin; a standalone reminder system (e.g., staff certification expiring in 30 days, fire-safety inspection due) isn't confirmed as built.

### Exam Officer
**Sees:** internal + external exam schedules (JAMB, WAEC, NECO), results pipeline, CBT security logs.
**Does:** schedules exams, manages CBT integrity (anti-cheating), publishes results after admin approval.
**Cannot see:** unrelated financial/HR data.
**References:** Fedena examinations module — https://fedena.com/feature-tour
**Gaps to close:**
- No confirmed **exam malpractice/proctoring detection** (tab-switch detection, webcam flags, time-anomaly flags) for the CBT secure exam player — most competitors reviewed don't publicly detail this either, so this is a differentiation opportunity, not a parity gap.
- No **external exam body result import** (WAEC/NECO/JAMB result upload & reconciliation into the student record) confirmed as built.

### Inspector / Ministry Official
**Sees:** read-only compliance snapshot, aggregate academic performance, safety records — scoped to what regulation requires, nothing more.
**Does:** reviews, does not edit.
**Cannot see:** private student communications, individual fee/payment detail beyond what's regulator-relevant.
**References:** None of the 10 competitor sites document a public "inspector" role — this is largely a Nigeria/Ministry-of-Education-specific requirement, so build it from regulatory requirements rather than competitor parity.
**Gaps to close:**
- No **scoped read-only export** (PDF/CSV compliance report generated on demand for an inspector visit) confirmed as built — this is the single highest-value, lowest-effort feature to add for this role.

---

## 3. Cross-cutting gaps (affect multiple roles)

1. **No "view as" / impersonation tooling** — needed by Admin (support), Teacher (preview), and QA/testing generally. One implementation fixes multiple roles at once.
2. **No customizable dashboard widgets** — Fedena's dashlet system is the model; would benefit Admin, Teacher, and Proprietor dashboards equally.
3. **No admissions/inquiry CRM pipeline** — MyClassCampus and Classe365 both treat lead-to-enrollment as CRM; currently Oliskey jumps straight to "enrolled student," with no pre-enrollment funnel tracked anywhere (Admin + Proprietor both need this).
4. **No automated communication digests** (email/SMS summaries for low-engagement parents, teachers with overdue grading, admins with pending approvals) — Google Classroom's guardian-summary pattern generalizes well across roles.
5. **No granular/composable permissions** beyond the 9 fixed roles — PowerSchool and Moodle both allow custom role/capability composition; useful once Oliskey has larger schools with unusual staffing (e.g., a teacher who is also a counselor).

## 4. Suggested prioritization (mapped to Oliskey's existing phase plan)

- **Quick wins (fold into Phase 1/2, pre- or post-launch polish):** Inspector read-only export, Parent auto-digest email/SMS, multi-child switcher UX confirmation.
- **Phase 3–4 candidates:** "View as" impersonation, dashboard widget customization, non-editing teacher/co-teacher role.
- **Phase 5–6 candidates:** Admissions CRM pipeline, cross-branch Proprietor comparison view, composable permission builder, alumni state.

## 5. Reference index

| Platform | What to study there | Link |
|---|---|---|
| OpenEduCat | Parent portal, multi-child login | https://openeducat.org/feature-parent-portal/ |
| Fedena | Dashlet customization, user management | https://fedena.com/feature-tour |
| MyClassCampus | Custom roles, admissions/inquiry CRM | https://www.myclasscampus.com |
| EduSys | Teacher groups, syllabus tracking, parent chatbot | https://www.edusys.co |
| Classe365 | Admissions CRM, alumni management | https://www.classe365.com |
| Teachmint | Behavior tracking, bus/attendance | https://www.teachmint.com |
| PowerSchool | Admin security groups/roles, district reporting | https://ps.powerschool-docs.com/pssis-admin/latest/admin-access-and-roles |
| Blackbaud | Family portal privacy model, "view as" | https://www.blackbaud.com/solutions/organizational-and-program-management/education-management/k-12 |
| Moodle | Role/capability system, non-editing teacher | https://docs.moodle.org/502/en/Managing_roles |
| Google Classroom | Guardian summary digest pattern | https://developers.google.com/workspace/classroom/guides/key-concepts/user-types |
