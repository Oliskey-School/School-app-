# OLISKEY SCHOOL APP — INSPECTOR / MINISTRY OFFICIAL DASHBOARD
## Master System Prompt — Feed One Module At A Time

---

## HOW TO USE THIS FILE

1. **Every session**, start by pasting the **FOUNDATION BLOCK** first.
2. Then paste **one MODULE** at a time.
3. Wait for the AI to finish and verify the output before moving to the next module.
4. Do NOT paste multiple modules in one message.

---

## ✅ FOUNDATION BLOCK — PASTE THIS FIRST IN EVERY SESSION

```
You are a senior full-stack engineer building the Inspector / Ministry Official Dashboard for the Oliskey School App — a production-grade, multi-tenant SaaS school management platform built for Nigerian and British curriculum schools (Primary → SSS3), developed by Oliskeylee Ltd.

TECH STACK — MATCH EXACTLY:
- Frontend / Mobile: React, Expo (React Native), React Native Web
- Build Tool: Vite + Capacitor
- Backend: Node.js + Express
- Database / Auth: Supabase (PostgreSQL) + RLS
- ORM: Prisma
- State Management: TanStack Query + React Context
- Styling: TailwindCSS + NativeWind + Framer Motion
- Icons / Charts: Lucide React + Recharts
- Forms: Formik + Yup
- Routing: React Router Dom
- Payments: react-paystack
- Docs / Export: jsPDF, html2canvas, html2pdf.js
- QR / Scanning: html5-qrcode, qrcode.react
- AI: Google Generative AI
- Auth Security: bcryptjs + JWT
- Date Utils: date-fns

Do NOT introduce new libraries unless a feature is impossible without one. If you must add a dependency, state it explicitly and justify it.

ARCHITECTURE PATTERN — FOLLOW EXACTLY:
- UI Layer → components/, pages/
- State Layer → context/, hooks/
- Service Layer → services/
- Data Layer → supabase/, types/
- Backend → backend/

No logic inside UI components. Services call Supabase or the Express API. Hooks wrap services. Components consume hooks.

MULTI-TENANCY & SECURITY — NON-NEGOTIABLE:
- Every database table has a school_id column.
- Supabase RLS policies enforce that an inspector only sees data for schools within their assigned jurisdiction.
- The Inspector JWT contains: { role: "inspector", inspector_id, jurisdiction_ids: [...], ministry_level }
- Inspectors never see another jurisdiction's data, even if they know the school_id.
- The is_active flag on both schools and inspector accounts must be checked before granting access.
- All API routes under /api/inspector/ must validate the JWT and confirm role === "inspector" or role === "ministry_official" server-side before executing any query.

ABSOLUTE RULES:
1. Never hardcode data. Everything comes from Supabase.
2. Never skip a feature. If a feature is listed, it must be built.
3. Never leave placeholder comments like // TODO or // implement later.
4. Never put business logic in UI components. Logic belongs in hooks and services.
5. Never bypass RLS by using the Supabase service role key on the client side.
6. Never generate a PDF client-side without first saving the inspection to Supabase.
7. Always handle loading, error, and empty states for every async operation.
8. Always match the existing codebase conventions — naming, folder structure, and patterns.

UI RULES:
- TailwindCSS throughout. No inline styles unless absolutely necessary.
- Framer Motion for: page transitions, KPI card entrance animations (stagger fade-up), form step transitions, modal animations.
- Lucide React for all icons. No other icon library.
- Color language: Primary indigo-700, Accent amber-500, Success emerald-500, Danger red-600, Neutral slate-600/800.
- Fully responsive — tablet (primary) and desktop.
- Skeleton loaders for all data-fetching components. No spinners.
- Every list and table must have a meaningful empty state with icon and actionable CTA.
- Every async operation must handle and display errors gracefully. No silent failures.
```

---

## MODULE 1 — INSPECTOR HOME DASHBOARD

```
Build Module 1: Inspector Home Dashboard for the Oliskey School App Inspector Dashboard.

ROUTE: /inspector/dashboard

FILES TO CREATE:
- src/pages/inspector/InspectorDashboard.jsx
- src/components/inspector/KPICard.jsx
- src/components/inspector/UpcomingInspectionCard.jsx
- src/hooks/useInspectorDashboard.js
- src/services/inspectionService.js (initialize this file — more methods will be added later)

FEATURE 1 — WELCOME HEADER:
- Display: "Welcome back, [Inspector Full Name]"
- Sub-display: "[Department] • [Jurisdiction / Zone Name]"
- Data pulled from the authenticated user's JWT and Supabase profile.

FEATURE 2 — KPI CARDS (4 cards, real data from Supabase):
Card 1: Total Inspections
- Icon: document with checkmark (Lucide)
- Color: blue
- Data: COUNT of all inspection records where inspector_id = current user

Card 2: Completed
- Icon: green circular checkmark (Lucide)
- Color: green (emerald-500)
- Data: COUNT where inspector_id = current user AND status = 'completed'

Card 3: Scheduled / Upcoming
- Icon: clock (Lucide)
- Color: orange (amber-500)
- Data: COUNT where inspector_id = current user AND status = 'scheduled'
- Show a badge with the number on the card

Card 4: Schools Inspected
- Icon: building (Lucide)
- Color: purple (indigo-700)
- Data: COUNT of DISTINCT school_id values in inspection records for this inspector

All 4 cards animate with Framer Motion stagger fade-up on page load.
All 4 cards show skeleton loaders while data is fetching.

FEATURE 3 — QUICK ACTIONS:
- "Search Schools" button (indigo-700 background, magnifying glass icon) → navigates to /inspector/schools
- "New Inspection" button (white background, plus icon, indigo border) → navigates to /inspector/inspections/new

FEATURE 4 — UPCOMING INSPECTIONS PANEL:
- Show the next 5 inspections where status = 'scheduled' AND inspector_id = current user, ordered by scheduled_date ASC.
- Each card shows:
  - School name
  - School type (Primary / Secondary / International)
  - Inspection type (Routine / WSE / GAPS / etc.)
  - Scheduled date (formatted with date-fns: "Mon, 14 Apr 2026")
  - Risk level badge: HIGH (red), MEDIUM (amber), LOW (green)
  - "Start Inspection" CTA button → navigates to /inspector/inspections/new?school_id=X&type=Y
- If no upcoming inspections → show empty state: calendar icon + "No inspections scheduled. Use 'New Inspection' to schedule one."

FEATURE 5 — RECENT ACTIVITY FEED:
- Last 10 completed inspections for this inspector, ordered by completed_at DESC.
- Each row shows: school name, inspection type, grade issued, completed date.
- Clicking a row navigates to /inspector/inspections/:id

SUPABASE QUERY STRUCTURE:
- Table: inspections
- Columns needed: id, school_id, inspector_id, inspection_type, status, risk_level, scheduled_date, completed_at, gaps_grade, wse_overall_rating
- Join to schools table for school name and school type
- RLS enforces inspector only sees their own records

Use TanStack Query useQuery for all data fetching. Use inspectionService.js for all Supabase calls. Handle loading with skeleton loaders. Handle errors with a red alert banner.
```

---

## MODULE 2 — SCHOOL DIRECTORY & SCHOOL PROFILE

```
Build Module 2: School Directory and School Profile for the Oliskey School App Inspector Dashboard.

ROUTES:
- /inspector/schools → School Directory
- /inspector/schools/:school_id → School Profile

FILES TO CREATE:
- src/pages/inspector/SchoolDirectory.jsx
- src/pages/inspector/SchoolProfile.jsx
- src/hooks/useSchoolDirectory.js
- src/services/schoolDirectoryService.js

--- SCHOOL DIRECTORY PAGE ---

FEATURE 1 — SEARCH BAR:
- Text input: search by school name, LGA, or registration number.
- Debounced (300ms) — queries Supabase on each keystroke after debounce.
- Scoped strictly to schools within the inspector's jurisdiction_ids from JWT.

FEATURE 2 — FILTER BAR (inline, not a modal):
Filters:
- School Type: All | Primary | Secondary | International (dropdown)
- Approval Status: All | Approved | Pending | Unapproved (dropdown)
- GAPS Grade: All | A | B | C | D | Ungraded (dropdown)
- Risk Level: All | High | Medium | Low (dropdown)
- Last Inspection: Any time | Last 30 days | Last 90 days | Over 6 months ago | Never inspected (dropdown)
All filters combined with AND logic. Applied client-side after initial data fetch.

FEATURE 3 — SCHOOLS TABLE:
Columns:
- School Name (clickable → goes to school profile)
- LGA
- Approval Status (badge: green=Approved, amber=Pending, red=Unapproved)
- Last WSE Score (number out of 100, or "N/A")
- GAPS Grade (badge: A=emerald, B=blue, C=amber, D=red, Ungraded=slate)
- Last Visit Date (date-fns formatted, or "Never")
- Outstanding SIP Items (number badge — red if > 0)
- Actions: "View Profile" button

Pagination: 20 rows per page. Show total count.
Sortable columns: School Name, Last Visit Date, GAPS Grade, Outstanding SIP Items.
Skeleton loader while fetching. Empty state if no results match filters.

--- SCHOOL PROFILE PAGE ---

FEATURE 1 — SCHOOL INFO HEADER:
- School name (large heading)
- Registration number | LGA | School type | Curriculum
- Approval status badge
- Proprietor name and contact
- Physical address
- Current enrolment figures (total students, total teachers)
- "Conduct New Inspection" button (prominent, indigo-700)

FEATURE 2 — INSPECTION HISTORY TIMELINE:
- All past inspections for this school, ordered by date DESC.
- Each timeline item shows: date, inspection type, inspector name, grade/score, status.
- "View Full Report" button on each item → navigates to /inspector/inspections/:id
- If no past inspections → empty state: "No inspection history for this school."

FEATURE 3 — OUTSTANDING SIP ITEMS:
- List of all sip_items for this school where status != 'resolved'.
- Each item: deficiency description, recommended action, deadline, status badge.
- Overdue items highlighted in red.

FEATURE 4 — TEACHER NOMINAL ROLL SUMMARY:
- Total teachers on record.
- Qualified count (green) vs Flagged / Unqualified count (red).
- List of flagged teachers: name, subject, reason flagged.

FEATURE 5 — FACILITY STATUS SUMMARY:
- Last recorded facility scores from the most recent WSE or GAPS assessment.
- Show each domain / criterion with score and status.

SUPABASE QUERIES:
- schools table joined with inspections, sip_items, teachers tables.
- All queries scoped by school_id within inspector's jurisdiction_ids.
- Use schoolDirectoryService.js for all Supabase calls.
- Use TanStack Query useQuery with loading and error states.
```

---

## MODULE 3A — INSPECTION CREATION: STEP 1 & 2

```
Build Module 3A: Inspection Creation Flow — Step 1 (Select Type) and Step 2 (Select School).
This is the first part of a multi-step inspection flow. Build only Steps 1 and 2 now.

ROUTE: /inspector/inspections/new

FILES TO CREATE:
- src/pages/inspector/NewInspection.jsx (main container with step state)
- src/components/inspector/InspectionTypeSelector.jsx
- src/components/inspector/SchoolSelector.jsx

MULTI-STEP CONTAINER (NewInspection.jsx):
- Manage current step in local state: step 1, 2, 3, 4, 5.
- Show a step progress indicator at the top (Step 1 of 5, Step 2 of 5, etc.).
- Animate between steps using Framer Motion slide left/right transitions.
- Preserve all selected data as the user advances (use useReducer or useState at container level).
- "Back" button on steps 2–5 to go to previous step without losing data.

STEP 1 — SELECT INSPECTION TYPE (InspectionTypeSelector.jsx):
Show 7 inspection type cards in a grid. User must select exactly one before proceeding.

Types to show:
1. Routine Monitoring — "Standard periodic visit to assess general school operations"
2. Resumption Monitoring — "Conducted on school resumption date to verify readiness"
3. Subject Recognition Inspection (SRI) — "Accreditation for WAEC / NECO / BECE examinations"
4. Whole School Evaluation (WSE) — "Full 8-domain comprehensive evaluation"
5. GAPS Assessment — "Graded Assessment Programme for private schools (Grade A–D)"
6. Follow-Through Evaluation — "Revisit to verify corrective action compliance from previous SIP"
7. Incident Investigation — "Triggered by reported violation, safeguarding concern, or emergency"

Each card: icon (Lucide), type name, description, estimated duration.
Selected card: highlighted with indigo-700 border and background tint.
"Next: Select School" button — disabled until a type is selected.

STEP 2 — SELECT SCHOOL (SchoolSelector.jsx):
- Search input: search by school name, LGA, or registration number.
- Results list: scoped to inspector's jurisdiction_ids from JWT.
- Each result shows: school name, LGA, approval status badge, last inspection date, risk level badge.
- User clicks a school to select it.
- Selected school highlighted with checkmark.
- After selection, show a "School Summary" panel beneath the list:
  - School name, type, registration number
  - Last inspection: date and type (or "Never inspected")
  - Current GAPS grade (or "Ungraded")
  - Outstanding SIP items count
  - Risk level badge
- "Next: Fill Inspection Form" button — disabled until a school is selected.
- Use schoolDirectoryService.js to fetch schools. TanStack Query. Debounced search.
```

---

## MODULE 3B — INSPECTION CREATION: STEP 3 (DYNAMIC FORM ENGINE)

```
Build Module 3B: Inspection Creation Flow — Step 3: Dynamic Inspection Form Engine.

FILES TO CREATE:
- src/components/inspector/DynamicFormEngine.jsx
- src/components/inspector/FormFieldRenderer.jsx
- src/components/inspector/PhotoCaptureField.jsx
- src/components/inspector/WSEScoreEngine.jsx
- src/components/inspector/GAPSGradingEngine.jsx

DYNAMIC FORM ENGINE (DynamicFormEngine.jsx):

The form is driven by a JSON schema fetched from Supabase table: inspection_templates.
Fetch the schema where inspection_type matches the type selected in Step 1.

Schema structure example:
{
  "sections": [
    {
      "id": "section_1",
      "title": "Basic Functionality",
      "domain": "WSE Domain 1",
      "weight": 12.5,
      "fields": [
        {
          "id": "field_1",
          "label": "Is the school operating with a valid approval?",
          "type": "boolean",
          "required": true,
          "on_fail": {
            "show_fields": ["field_1_evidence", "field_1_justification"]
          }
        },
        {
          "id": "field_1_evidence",
          "label": "Upload photographic evidence",
          "type": "photo_capture",
          "required": true,
          "hidden_by_default": true
        }
      ]
    }
  ]
}

SUPPORTED FIELD TYPES — build a renderer for each:
- text → standard text input
- number → number input with min/max from schema
- boolean → Yes / No toggle buttons (not a checkbox)
- dropdown → select from options array in schema
- multi_select → multiple checkboxes from options array
- score_slider → slider from 0 to max_score defined in schema, shows current value
- photo_capture → PhotoCaptureField component (see below)
- signature_pad → placeholder for now, built in Module 3D
- date → date picker using native HTML date input
- textarea → multi-line text input

CONDITIONAL BRANCHING LOGIC:
- If a field has on_fail or on_value conditions in the schema, watch that field's value.
- When condition is triggered, show the dependent fields with a smooth Framer Motion expand animation.
- When condition is no longer met, hide the dependent fields and clear their values.
- Mandatory fields inside conditional branches must be validated before the form can submit.

MANDATORY FIELD ENFORCEMENT:
- Fields with required: true cannot be left empty.
- On attempting to advance, highlight all empty required fields with a red border and scroll to the first one.
- Show a count of incomplete required fields at the bottom: "X required fields remaining."

AUTO-SAVE:
- Save entire form state to localStorage every 30 seconds under key: inspection_draft_{inspector_id}_{school_id}_{type}
- On page load, check localStorage for an existing draft and offer to restore it: "You have an unsaved draft from [date]. Resume or Start Fresh?"

PHOTO CAPTURE FIELD (PhotoCaptureField.jsx):
- Show a "Capture Photo" button with camera icon.
- On click: open file input (accepts image/*) — works on both mobile (camera) and desktop (file picker).
- After selection: show a preview thumbnail of the image.
- Show an annotation toolbar above the preview: Draw (freehand), Circle, Arrow, Text label. Color picker (red, yellow, white). Undo button.
- Implement annotation using an HTML5 Canvas overlay on the image.
- "Save Photo" button saves the image + annotation data.
- Allow up to 5 photos per field. Show all thumbnails in a row. Allow removal of individual photos.
- Upload to Supabase Storage: /inspections/drafts/{inspector_id}/{field_id}/{timestamp}.jpg on save.

WSE SCORE ENGINE (WSEScoreEngine.jsx):
Only active when inspection_type = 'WSE'.
8 domains, each with a weight:
1. Basic Functionality — 12.5%
2. Leadership, Management & Communication — 12.5%
3. Governance & Community Relationships — 12.5%
4. Quality of Teaching, Learning & Educator Development — 12.5%
5. Curriculum Provision & Resources — 12.5%
6. Learner Achievement — 12.5%
7. School Safety, Security & Discipline — 12.5%
8. Physical Infrastructure — 12.5%

- As the inspector fills in score_slider fields, calculate each domain score in real time.
- Show a persistent side panel (or collapsible bottom drawer on mobile) with live domain scores and overall WSE score.
- Overall WSE Rating:
  - 80–100: Outstanding
  - 65–79: Good
  - 50–64: Satisfactory
  - 35–49: Requires Improvement
  - Below 35: Inadequate

GAPS GRADING ENGINE (GAPSGradingEngine.jsx):
Only active when inspection_type = 'GAPS'.
Criteria and scoring:
- Number of classrooms (vs required minimum for enrolment size) — 20 points
- Special rooms: laboratories, libraries (checklist, 2 points each, max 10) — 10 points
- Toilet-to-learner ratio (auto-calculated from inputs: total toilets / total learners, required 1:25) — 15 points
- Indoor and outdoor play equipment (checklist) — 10 points
- Safety equipment: fire extinguishers, safety charts, first aid (checklist) — 15 points
- Perimeter fencing (yes/no + condition rating) — 15 points
- Statutory records availability (lesson notes, attendance registers, financial ledger) — 15 points
Total: 100 points

Auto-grade:
- A: 90–100
- B: 75–89
- C: 55–74
- D: Below 55

Show live running score as inspector fills in the form.
Auto-generate SIP items for every criterion scored below 50% of its allocated points.

All form state managed with Formik. Validation with Yup, dynamically built from schema.
```

---

## MODULE 3C — INSPECTION CREATION: STEP 4 (REVIEW & ESCALATION)

```
Build Module 3C: Inspection Creation Flow — Step 4: Review & Critical Escalation Check.

FILES TO CREATE:
- src/components/inspector/InspectionSummaryView.jsx
- src/components/inspector/EscalationBanner.jsx
- src/services/escalationService.js
- backend/routes/inspector.routes.js (add escalation endpoint)
- backend/controllers/escalationController.js

STEP 4 — REVIEW SUMMARY (InspectionSummaryView.jsx):

Show a complete read-only summary of everything filled in Step 3:
- School name, inspection type, date
- GPS coordinates and timestamp captured at form start (from useGeolocation hook)
- Each section with all filled fields and their answers
- All captured photos as thumbnails (click to expand full size with annotations)
- WSE domain scores and overall score (if WSE type)
- GAPS score and auto-assigned grade (if GAPS type)
- Auto-generated SIP items list (from GAPSGradingEngine or WSEScoreEngine)
- Inspector can scroll through and spot errors — "Back to Edit" button goes back to Step 3

CRITICAL FLAGS CHECK (EscalationBanner.jsx):

After displaying the summary, automatically scan the form responses for these critical flags:
- field with id containing "safeguarding_violation" answered Yes
- field with id containing "structural_collapse_risk" answered Yes
- field with id containing "exam_malpractice" answered Yes
- field with id containing "unlicensed_operation" answered Yes
- field with id containing "underage_exam_registration" answered Yes

If ANY critical flag is detected:
- Show a prominent red banner at the top: "⚠️ CRITICAL VIOLATIONS DETECTED — This inspection will be escalated immediately upon submission."
- List all detected violations clearly.
- Inspector cannot dismiss this banner.
- The "Proceed to Signatures" button still appears — inspector must still complete and submit.

ESCALATION ENGINE (server-side — escalationController.js):

POST /api/inspector/escalate

When called (triggered automatically on inspection submission if critical flags exist):
1. Update the inspection record: is_escalated = true, status = 'critical'
2. Send in-app notification to the inspector's supervising director (lookup from inspector profile)
3. Send email alert to the Ministry Intervention Desk email (stored in jurisdiction settings table)
4. Send SMS alert to the Ministry Intervention Desk phone (stored in jurisdiction settings table)
5. If unlicensed_operation = true: set the school's is_active = false in the schools table
6. Create a record in inspection_escalations table:
   { inspection_id, violation_type (array), escalated_to (supervisor_id), escalated_at: now() }
7. Create a mandatory follow-up incident record in inspections table:
   { school_id, inspector_id: supervisor_id, inspection_type: 'Incident Investigation', status: 'scheduled', scheduled_date: 7 days from now }

All steps 1–7 must execute in a single server-side transaction. If any step fails, roll back and return error.
The client calls this endpoint and shows a loading state until all steps confirm.

JWT middleware on this route: must verify role === 'inspector' or 'ministry_official'.
RLS: escalation records scoped by school_id within jurisdiction.
```

---

## MODULE 3D — INSPECTION CREATION: STEP 5 (SIGNATURES & PDF REPORT)

```
Build Module 3D: Inspection Creation Flow — Step 5: Digital Signatures and PDF Report Generation.

FILES TO CREATE:
- src/components/inspector/SignaturePad.jsx
- src/components/inspector/PDFReportBuilder.jsx
- src/services/reportService.js
- backend/controllers/reportController.js

STEP 5 — DIGITAL SIGNATURES (SignaturePad.jsx):

Show two signature pads side by side (stacked on mobile):

Pad 1: Inspector Signature
- Label: "Inspector: [Inspector Full Name] — [Date]"
- HTML5 Canvas with touch and mouse support for freehand drawing
- "Clear" button to reset
- "Confirm Signature" button to lock the pad

Pad 2: School Principal / Representative Signature
- Label: "School Representative: ________________ — [Date]"
- Same canvas implementation
- "Clear" and "Confirm Signature" buttons

Both signatures must be confirmed before the "Generate Report & Submit" button is enabled.
Save both signatures as base64 PNG strings in form state.

PDF REPORT GENERATION (PDFReportBuilder.jsx + reportService.js):

On "Generate Report & Submit":

Step 1 — Save inspection to Supabase FIRST:
Insert into inspections table with all data: school_id, inspector_id, inspection_type, status='completed', risk_level, scheduled_date, started_at, completed_at: now(), gps_lat, gps_lng, overall_score, gaps_grade, wse_overall_rating.
Insert all domain scores into inspection_domain_scores table.
Insert all field responses into inspection_responses table.
Insert all photos into inspection_photos table (URLs from Supabase Storage already uploaded).
Insert all SIP items into sip_items table.
If escalation triggered: call POST /api/inspector/escalate.
Get back the inspection_id from the insert.

Step 2 — Generate PDF using jsPDF + html2canvas:

PDF structure (build as an HTML template rendered off-screen, then captured with html2canvas):

PAGE 1 — COVER PAGE:
- Oliskey School App logo + "Official Inspection Report" heading
- School name (large), school address, registration number
- Inspection type, inspection date
- Inspector name, inspector ID, jurisdiction
- GPS Coordinates: [lat, lng] | Visit Start: [time] | Visit End: [time]
- "This report was generated digitally by the Oliskey School App"

PAGE 2 — EXECUTIVE SUMMARY:
- Overall score / grade (large, prominent)
- WSE overall rating OR GAPS grade
- Summary paragraph (auto-generated from scores)
- Key strengths identified (top 3 domains / criteria)
- Key areas for improvement (bottom 3 domains / criteria)

PAGE 3+ — DETAILED FINDINGS:
- Each section/domain on its own section heading
- All field labels and answers in a clean two-column layout
- Annotated photos embedded inline next to the relevant field
- Domain score shown at the end of each domain section

SECOND-TO-LAST PAGE — SCHOOL IMPROVEMENT PLAN:
- Table with columns: Deficiency | Recommended Action | Deadline | Priority
- All auto-generated SIP items listed
- Note: "This SIP has been agreed upon by both parties and must be implemented by the deadlines stated."

LAST PAGE — SIGNATURES:
- Inspector signature image + name + date
- School representative signature image + name + date
- "Both parties confirm the accuracy of this report."
- Report ID (inspection UUID)
- QR code linking to the online report (use qrcode.react to generate)

Step 3 — Save PDF:
Upload generated PDF to Supabase Storage: /inspections/reports/{inspection_id}/report.pdf
Update the inspections record: pdf_report_url = [storage URL], inspector_signature_url, principal_signature_url

Step 4 — Share:
Send the PDF download link to the school's admin dashboard via the in-app messaging system.
Show success screen to inspector: "Inspection Complete. Report generated and shared with [School Name]."
Buttons: "Download My Copy" | "View Inspection Record" | "Return to Dashboard"

Show a full-screen loading state during PDF generation with progress steps:
"Saving inspection data..." → "Generating report..." → "Uploading report..." → "Notifying school..." → "Done ✓"
```

---

## MODULE 4 — INSPECTION HISTORY & RECORDS

```
Build Module 4: Inspection History and Records for the Oliskey School App Inspector Dashboard.

ROUTE: /inspector/inspections

FILES TO CREATE:
- src/pages/inspector/InspectionHistory.jsx
- src/pages/inspector/InspectionDetail.jsx
- src/hooks/useInspections.js (add history query methods)

--- INSPECTION HISTORY PAGE (/inspector/inspections) ---

FEATURE 1 — FILTERS BAR:
- Status: All | Draft | In Progress | Completed | Critical (dropdown)
- Inspection Type: All | Routine | WSE | GAPS | SRI | Follow-Through | Incident (dropdown)
- Date Range: custom date-from and date-to inputs using HTML date input
- School: text search to filter by school name
- Grade: All | A | B | C | D | Outstanding | Good | Satisfactory | Requires Improvement | Inadequate (dropdown)
All filters combined with AND logic.

FEATURE 2 — INSPECTIONS TABLE:
Columns:
- School Name (clickable → /inspector/inspections/:id)
- Inspection Type
- Date (date-fns: "14 Apr 2026")
- Grade / Score (GAPS grade badge OR WSE rating text)
- Status badge (Draft=slate, In Progress=blue, Completed=green, Critical=red)
- Escalated badge (red "ESCALATED" badge if is_escalated = true)
- Actions: "View Report" button | "Download PDF" button

Pagination: 20 rows per page. Show total count.
Sortable by: Date, School Name, Grade, Status.
Skeleton loader while fetching. Empty state if no records.

FEATURE 3 — DRAFT RECOVERY:
If any inspections have status = 'draft', show a yellow banner at top:
"You have [X] incomplete inspection(s). Resume them before they expire."
Each draft listed with school name, type, date started, "Resume" button → /inspector/inspections/new with draft loaded.

--- INSPECTION DETAIL PAGE (/inspector/inspections/:id) ---

Show a complete read-only view of the inspection record:

SECTION 1 — HEADER:
- School name, inspection type, date
- Inspector name, jurisdiction
- Status badge, escalated badge
- GPS coordinates and timestamps
- "Download PDF" button → download from pdf_report_url in Supabase Storage

SECTION 2 — SCORES:
- WSE domain scores in a radar chart (Recharts) if inspection_type = 'WSE'
- GAPS grade and score breakdown in a bar chart (Recharts) if inspection_type = 'GAPS'
- Overall score and rating prominently displayed

SECTION 3 — ALL FINDINGS:
- Each section/domain listed with all field labels and answers
- Annotated photos shown as thumbnails inline, click to expand

SECTION 4 — SIP ITEMS:
- All SIP items for this inspection
- Each item: deficiency, recommended action, deadline, current status
- Status updatable inline if inspector has permission (Follow-Through inspections only)

SECTION 5 — ESCALATION RECORD (if is_escalated = true):
- All violations flagged
- Escalated to (supervisor name)
- Escalated at timestamp
- Resolution status and notes

SECTION 6 — SIGNATURES:
- Inspector signature image
- School representative signature image
- Both with names and date

Use TanStack Query useQuery. Use inspectionService.js. Handle all loading and error states.
```

---

## MODULE 5 — SCHEDULE & RISK-BASED QUEUE

```
Build Module 5: Scheduled Inspections and Risk-Based Queue for the Oliskey School App Inspector Dashboard.

ROUTE: /inspector/schedule

FILES TO CREATE:
- src/pages/inspector/Schedule.jsx
- src/hooks/useRiskScore.js
- src/services/scheduleService.js

--- RISK SCORE ENGINE (useRiskScore.js) ---

For each school in the inspector's jurisdiction, calculate a Risk Score (0–100) using these weighted signals:

Signal 1 — Days since last inspection (25% weight):
- 0–30 days ago = 0 risk points
- 31–90 days = 10 risk points
- 91–180 days = 17 risk points
- 181–365 days = 22 risk points
- Over 365 days OR never inspected = 25 risk points

Signal 2 — Previous WSE score (30% weight, inverse — lower score = higher risk):
- Score 80–100 = 0 risk points
- Score 65–79 = 8 risk points
- Score 50–64 = 18 risk points
- Score 35–49 = 25 risk points
- Score below 35 OR no WSE on record = 30 risk points

Signal 3 — Unresolved SIP items (20% weight):
- 0 items = 0 risk points
- 1–2 items = 5 risk points
- 3–5 items = 12 risk points
- 6+ items = 20 risk points

Signal 4 — External exam performance — BECE / WAEC / NECO (15% weight):
- Above 70% pass rate = 0 risk points
- 50–70% = 5 risk points
- Below 50% = 10 risk points
- No exam data available = 8 risk points (default moderate risk)

Signal 5 — Unverified teacher qualifications (10% weight):
- 0 flagged teachers = 0 risk points
- 1–2 flagged = 4 risk points
- 3+ flagged = 10 risk points

Total Risk Score = sum of all signal points (max 100)
Risk Level:
- HIGH: score > 70 (red badge)
- MEDIUM: score 50–70 (amber badge)
- LOW: score < 50 (green badge)

Calculate and store risk scores server-side or via a Supabase database function. Expose via GET /api/inspector/risk-scores.

--- SCHEDULE PAGE ---

FEATURE 1 — CALENDAR VIEW:
- Monthly calendar showing all scheduled inspections.
- Each scheduled inspection shown as a colored chip on its date: color = inspection type.
- Click a date → show a popover/drawer with all inspections that day.
- Each popover item: school name, inspection type, risk badge, "Start" button.
- Navigation: previous/next month buttons.

FEATURE 2 — RISK-BASED UPCOMING QUEUE:
- List of all schools with status = 'scheduled' OR 'never inspected', ordered by Risk Score DESC (highest risk first).
- Each row: school name, LGA, risk badge (HIGH/MEDIUM/LOW), risk score, days since last inspection, unresolved SIP count, scheduled date (or "Not Yet Scheduled").
- HIGH RISK schools always appear at the top regardless of scheduled date.
- "Schedule Inspection" button on each row → opens a date picker modal, then creates a new inspection record with status = 'scheduled'.
- "Start Now" button if an inspection is already scheduled for today or overdue.

FEATURE 3 — SCHEDULE STATS PANEL:
- Total inspections scheduled this month
- Total overdue (scheduled date passed, status still = 'scheduled')
- HIGH risk schools not yet scheduled
- Completion rate this month (completed / total assigned)

OVERDUE HANDLING:
- Inspections where scheduled_date < today AND status = 'scheduled' are marked OVERDUE.
- Show a red badge "OVERDUE" on the calendar and in the queue.
- Show a banner at top: "You have [X] overdue inspection(s). Please prioritize these."

Use TanStack Query. Use scheduleService.js for all Supabase calls. Handle loading and error states.
```

---

## MODULE 6 — SIP TRACKER (CORRECTIVE ACTION TRACKING)

```
Build Module 6: SIP Tracker — Corrective Action Tracking for the Oliskey School App Inspector Dashboard.

ROUTE: /inspector/sip-tracker

FILES TO CREATE:
- src/pages/inspector/SIPTracker.jsx
- src/hooks/useSIPTracker.js
- src/services/sipService.js

--- SIP TRACKER PAGE ---

FEATURE 1 — SUMMARY STATS (at top, 3 metric cards):
Card 1: Total Active SIP Items — count of all sip_items where status != 'resolved' across inspector's jurisdiction
Card 2: Overdue Items — count where deadline < today AND status != 'resolved' (red card)
Card 3: Resolution Rate — (resolved items / total items) as a percentage (green card)

FEATURE 2 — FILTERS:
- School: search by name
- Status: All | Pending | In Progress | Resolved | Overdue (dropdown)
- Priority: All | High | Medium | Low (dropdown)
- Deadline: All | This week | This month | Overdue (dropdown)

FEATURE 3 — SIP ITEMS TABLE:
Columns:
- School Name
- Deficiency Description (truncated to 60 chars, click to expand)
- Recommended Action (truncated to 60 chars, click to expand)
- Deadline (date-fns formatted)
- Priority badge (High=red, Medium=amber, Low=green)
- Status badge (Pending=slate, In Progress=blue, Resolved=emerald, Overdue=red)
- Days Until Deadline (countdown: "3 days", "Today", "2 days overdue" in red)
- Actions

FEATURE 4 — ACTIONS PER SIP ITEM:
"Mark In Progress" button → updates status = 'in_progress'
"Verify Resolved" button → opens a modal requiring:
  - Photo upload (mandatory proof of resolution)
  - Notes field (mandatory — describe what was done)
  - Confirmation button
  On confirm: update status = 'resolved', verified_by = current inspector_id, verified_at = now(), verification_photo_url = uploaded photo URL

FEATURE 5 — AUTO FOLLOW-THROUGH SCHEDULING:
When a SIP item's deadline passes and status is still NOT 'resolved':
- Automatically update status = 'overdue'
- Automatically create a new inspection record: inspection_type = 'Follow-Through Evaluation', status = 'scheduled', scheduled_date = today + 7 days, school_id = the overdue school
- Send an in-app notification to the inspector: "⚠️ SIP deadline passed for [School Name]. A Follow-Through Evaluation has been scheduled."
Implement this as a backend cron job or Supabase database function running daily at midnight.

FEATURE 6 — SIP ITEM DETAIL DRAWER:
Click any SIP item row → open a right-side drawer (not a new page) showing:
- Full deficiency description
- Full recommended action
- Inspection it came from (link to /inspector/inspections/:id)
- School profile link
- Full history of status changes with timestamps
- All verification photos if resolved
- "Schedule Follow-Through" button (manual override to schedule a follow-through inspection for this school now)

Use TanStack Query useQuery and useMutation. Use sipService.js. Handle all loading and error states.
```

---

## MODULE 7 — QR CODE SCHOOL VERIFICATION

```
Build Module 7: QR Code School Verification Scanner for the Oliskey School App Inspector Dashboard.

ROUTE: /inspector/qr-scanner

FILES TO CREATE:
- src/pages/inspector/QRScanner.jsx
- src/hooks/useQRVerification.js
- src/services/qrVerificationService.js
- backend/routes/inspector.routes.js (add /verify-school and /verify-teacher endpoints)

--- QR SCANNER PAGE ---

FEATURE 1 — SCANNER VIEW:
- Open camera using html5-qrcode library.
- Show a scanning frame (animated corners, pulsing line) centered on screen.
- Real-time QR code detection — when a code is detected, auto-stop scanning and process result immediately.
- "Upload QR Image" fallback button for desktop — allows selecting an image file containing a QR code.
- Toggle button: "Scan School QR" | "Scan Teacher ID" — switches the verification mode.

FEATURE 2 — SCHOOL QR VERIFICATION (mode: Scan School QR):

Each school registered in Oliskey has a unique QR code encoding: { type: "school", school_id: "uuid" }

On scan:
1. Call GET /api/inspector/verify-school?school_id={id}
2. Backend verifies: school_id exists, is within inspector's jurisdiction_ids, returns school data.
3. Display result card immediately:

REGISTERED SCHOOL — show in green card:
- School name (large)
- Registration number
- Approval status badge
- Current GAPS grade badge
- Last inspection: date, type, inspector name
- Outstanding SIP items count (red badge if > 0)
- Risk level badge
- Active teachers on nominal roll: total count, qualified count, flagged count
- Quick actions: "Start Inspection Now" button | "View School Profile" button

UNREGISTERED SCHOOL — show in red card:
- ⚠️ "UNREGISTERED SCHOOL DETECTED"
- Raw QR data (if any)
- "Flag for Immediate Registration" button → creates a flagged_schools record with GPS coordinates and inspector_id
- "Report This School" button → opens a quick incident form

SCHOOL NOT IN JURISDICTION — show in amber card:
- "This school is outside your assigned jurisdiction"
- School name if retrievable
- Contact information for the responsible jurisdiction

FEATURE 3 — TEACHER ID VERIFICATION (mode: Scan Teacher ID):

Teacher ID QR codes encode: { type: "teacher", teacher_id: "uuid", school_id: "uuid" }

On scan:
1. Call GET /api/inspector/verify-teacher?teacher_id={id}&school_id={id}
2. Backend checks: teacher record exists, is linked to the scanned school, qualification status.
3. Display result card:

QUALIFIED TEACHER — green card:
- Teacher name, subject(s), class assignment
- Qualification level and certification details
- Registration number with teaching council
- School they are assigned to
- Date of employment

FLAGGED / UNQUALIFIED TEACHER — red card:
- ⚠️ "UNQUALIFIED TEACHER DETECTED"
- Teacher name and subject
- Reason for flag
- "Add to Inspection Report" button → adds this teacher to the current active inspection's nominal roll findings (if an inspection is in progress)
- "Escalate Immediately" button → calls POST /api/inspector/escalate with violation_type = 'unqualified_teacher'

TEACHER NOT FOUND — amber card:
- "No record found for this ID"
- "Flag as Unverified" button

FEATURE 4 — SCAN HISTORY:
- Keep a local list of all QR codes scanned in the current session.
- Show at bottom of page: school name or teacher name, scan time, result (green/red/amber).
- "Clear History" button.

Backend endpoints must verify JWT, confirm jurisdiction scope, and return only authorized data.
```

---

## MODULE 8 — ANALYTICS DASHBOARD

```
Build Module 8: Analytics Dashboard for the Oliskey School App Inspector Dashboard.

ROUTE: /inspector/analytics

FILES TO CREATE:
- src/pages/inspector/Analytics.jsx
- src/hooks/useInspectionAnalytics.js
- src/services/analyticsService.js

NOTE: This full analytics view is available to Ministry Officials (elevated role: ministry_level > 0). Inspectors see only their own jurisdiction data. Ministry Officials see all jurisdictions in their assigned zone.

--- ANALYTICS PAGE ---

FEATURE 1 — DATE RANGE SELECTOR:
- Preset options: Last 7 days | Last 30 days | Last 3 months | Last 6 months | This academic year | Custom range
- Custom: date-from and date-to pickers
- All charts update based on selected range

FEATURE 2 — TOP KPI ROW (5 stat cards):
1. Total Inspections Conducted (in range)
2. Schools Inspected (unique)
3. Average WSE Score (across all WSE inspections in range)
4. SIP Resolution Rate (%)
5. Critical Incidents (count of is_escalated = true)

FEATURE 3 — CHARTS (all built with Recharts):

Chart 1 — Inspections Over Time (Line chart):
- X-axis: weeks or months (based on date range)
- Y-axis: count of inspections completed
- Two lines: Completed (green) vs Scheduled (blue)
- Show data points on hover with tooltip

Chart 2 — GAPS Grade Distribution (Donut chart):
- Segments: Grade A (emerald), B (blue), C (amber), D (red), Ungraded (slate)
- Show count and percentage for each segment
- Center label: "GAPS Grades"
- Legend below chart

Chart 3 — WSE Domain Performance (Radar chart):
- 8 axes — one per WSE domain
- Plot average score per domain across all WSE inspections in range
- Show current period (blue) vs previous period (slate dashed) for comparison
- Tooltip shows domain name and score on hover

Chart 4 — Risk Level Breakdown (Horizontal bar chart):
- Three bars: HIGH (red), MEDIUM (amber), LOW (green)
- Count of schools at each risk level currently
- Show percentage label inside each bar

Chart 5 — SIP Resolution Rate (Gauge / progress ring):
- Large circular progress indicator
- Shows % of SIP items resolved on time (before deadline)
- Color: green if > 70%, amber if 50–70%, red if < 50%
- Below: "X of Y items resolved on time"

Chart 6 — Inspection Type Breakdown (Stacked bar chart):
- X-axis: months
- Y-axis: count
- Stacked colors per inspection type (Routine, WSE, GAPS, SRI, Follow-Through, Incident)
- Legend for each type

Chart 7 — Schools by LGA (Summary table):
- Columns: LGA Name | Total Schools | Inspected | Not Inspected | Avg GAPS Grade | High Risk Count
- Sortable by any column
- Row click → filters all other charts to that LGA

FEATURE 4 — EXPORT:
"Export Analytics Report" button:
- Generates a PDF using jsPDF containing all 7 charts (captured with html2canvas) and the KPI stats
- Titled: "Quality Assurance Analytics Report — [Jurisdiction Name] — [Date Range]"
- Inspector name and date generated in footer

"Export Data as CSV" button:
- Downloads raw inspection data as CSV (school name, type, date, score, grade, SIP items count)

FEATURE 5 — MINISTRY-LEVEL VIEW (if ministry_level > 0):
- Additional filter: Jurisdiction / Zone (dropdown of all jurisdictions in their zone)
- "All Jurisdictions" option shows aggregated data across all
- Jurisdiction comparison bar chart: ranks all jurisdictions by average WSE score

Use TanStack Query. Use analyticsService.js for all Supabase aggregation queries. Handle all loading states with skeleton charts. Handle errors gracefully.
```

---

## MODULE 9 — OFFLINE SYNC ENGINE

```
Build Module 9: Offline Sync Engine for the Oliskey School App Inspector Dashboard.

FILES TO CREATE:
- src/hooks/useOfflineSync.js
- src/hooks/useGeolocation.js
- src/services/offlineSyncService.js

NOTE: This module powers offline functionality across the entire Inspector Dashboard. It must be integrated into the NewInspection flow and the overall app layout.

--- GEOLOCATION HOOK (useGeolocation.js) ---

Purpose: Capture GPS coordinates at the start and end of each inspection.

useGeolocation():
- On mount, request browser geolocation permission.
- If granted: continuously watch position (watchPosition API), updating lat/lng every 30 seconds.
- If denied: show a persistent amber banner in the inspection form: "⚠️ Location access denied. GPS proof of visit will not be available. Please enable location in your device settings."
- Return: { lat, lng, accuracy, timestamp, permissionStatus, error }
- Store the captured coordinates in the form state when the inspector opens the inspection form.
- Capture final coordinates again on form submission.

--- OFFLINE DETECTION (useOfflineSync.js) ---

Track network status using the browser's online/offline events.

When offline:
- Show a persistent banner at the very top of the app (not inside any page, at the layout level): "⚠️ You are offline. Your inspection data is being saved locally."
- Banner color: amber background, dark text.
- All Supabase write operations (insert/update) are queued in localStorage under key: oliskey_sync_queue__{inspector_id}

Queue structure:
[
  {
    id: "unique_queue_item_id",
    type: "INSERT" | "UPDATE",
    table: "inspections" | "inspection_responses" | "sip_items" | etc.,
    payload: { ...all data },
    queued_at: "ISO timestamp",
    attempts: 0
  }
]

When online (on restoration):
- Banner changes to: "✓ Back online. Syncing your data..." (green)
- Begin processing the sync queue in order (FIFO).
- For each queue item: execute the Supabase operation.
- On success: remove item from queue.
- On failure: increment attempts count. If attempts >= 3: flag as failed, notify inspector.
- After queue is empty: banner shows "✓ All data synced successfully." for 5 seconds then disappears.

--- DRAFT AUTO-SAVE (integrate into NewInspection.jsx) ---

Every 30 seconds while the inspection form is open:
- Serialize entire form state (all field values, photos as base64 strings, current step, school_id, inspection_type, captured GPS).
- Save to localStorage under key: oliskey_draft__{inspector_id}__{school_id}__{inspection_type}
- Also attempt to save a draft record to Supabase inspections table (status = 'draft') if online.
- Show a subtle "Draft saved [time]" indicator at the bottom of the form (e.g., "Last saved 2:34 PM").

On navigating to /inspector/inspections/new:
- Check localStorage for any existing drafts matching this inspector.
- If found: show a modal: "You have an unsaved inspection draft for [School Name] — [Type] started on [date]. Resume or Start Fresh?"
- "Resume" → restore all form state from the draft.
- "Start Fresh" → clear the draft and begin a new form.

--- PHOTO UPLOAD QUEUE ---

When a photo is captured in the form while offline:
- Store it as base64 in localStorage temporarily.
- When online, upload to Supabase Storage and replace the base64 reference with the URL.
- This must happen transparently — the inspector sees their photos at all times regardless of connectivity.

--- SYNC STATUS INDICATOR ---

Add a small sync status indicator in the top navigation bar (visible on all inspector pages):
- Green cloud icon with checkmark: "Synced"
- Amber cloud icon with clock: "X items pending sync"
- Red cloud icon with X: "Sync failed — tap to retry"
Clicking the indicator opens a small drawer showing all pending or failed sync items with "Retry All" button.
```

---

## MODULE 10 — DATABASE SCHEMA & RLS POLICIES

```
Build Module 10: Complete Database Schema and Supabase RLS Policies for the Inspector Dashboard.

Run all SQL in Supabase's SQL Editor. Create all tables, indexes, and RLS policies.

--- TABLES ---

CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  inspector_id UUID NOT NULL REFERENCES users(id),
  inspection_type TEXT NOT NULL CHECK (inspection_type IN ('routine', 'resumption', 'SRI', 'WSE', 'GAPS', 'follow_through', 'incident')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'critical')),
  risk_level TEXT CHECK (risk_level IN ('high', 'medium', 'low')),
  scheduled_date TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  gps_lat FLOAT,
  gps_lng FLOAT,
  overall_score FLOAT,
  gaps_grade TEXT CHECK (gaps_grade IN ('A', 'B', 'C', 'D')),
  wse_overall_rating TEXT CHECK (wse_overall_rating IN ('Outstanding', 'Good', 'Satisfactory', 'Requires Improvement', 'Inadequate')),
  inspector_signature_url TEXT,
  principal_signature_url TEXT,
  pdf_report_url TEXT,
  is_escalated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inspection_domain_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  school_id UUID NOT NULL,
  domain_name TEXT NOT NULL,
  domain_score FLOAT,
  max_score FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inspection_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  school_id UUID NOT NULL,
  field_id TEXT NOT NULL,
  field_label TEXT,
  response_value TEXT,
  response_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inspection_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  school_id UUID NOT NULL,
  field_id TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  annotation_data JSONB,
  captured_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sip_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id),
  deficiency TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  deadline DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'overdue')),
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  verification_photo_url TEXT,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inspection_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_type TEXT UNIQUE NOT NULL,
  schema JSONB NOT NULL,
  version INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inspection_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  school_id UUID NOT NULL,
  violation_types TEXT[] NOT NULL,
  escalated_to UUID REFERENCES users(id),
  escalated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  resolution_notes TEXT
);

CREATE TABLE IF NOT EXISTS inspector_jurisdictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspector_id UUID NOT NULL REFERENCES users(id),
  jurisdiction_name TEXT NOT NULL,
  lgas TEXT[],
  school_ids UUID[],
  ministry_level INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flagged_schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flagged_by UUID NOT NULL REFERENCES users(id),
  school_name TEXT,
  gps_lat FLOAT,
  gps_lng FLOAT,
  address TEXT,
  reason TEXT DEFAULT 'unregistered',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'registered', 'dismissed')),
  flagged_at TIMESTAMPTZ DEFAULT NOW()
);

--- INDEXES ---

CREATE INDEX idx_inspections_school_id ON inspections(school_id);
CREATE INDEX idx_inspections_inspector_id ON inspections(inspector_id);
CREATE INDEX idx_inspections_status ON inspections(status);
CREATE INDEX idx_inspections_scheduled_date ON inspections(scheduled_date);
CREATE INDEX idx_sip_items_school_id ON sip_items(school_id);
CREATE INDEX idx_sip_items_status ON sip_items(status);
CREATE INDEX idx_sip_items_deadline ON sip_items(deadline);
CREATE INDEX idx_inspection_responses_inspection_id ON inspection_responses(inspection_id);
CREATE INDEX idx_inspection_photos_inspection_id ON inspection_photos(inspection_id);

--- RLS POLICIES ---

Enable RLS on all tables:
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_domain_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sip_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE flagged_schools ENABLE ROW LEVEL SECURITY;

Policy: Inspectors can only SELECT, INSERT, UPDATE inspections within their jurisdiction:
CREATE POLICY "inspectors_own_jurisdiction_inspections"
ON inspections
FOR ALL
USING (
  inspector_id = auth.uid()
  OR school_id = ANY(
    SELECT unnest(school_ids)
    FROM inspector_jurisdictions
    WHERE inspector_id = auth.uid()
  )
);

Policy: Inspectors cannot DELETE inspection records:
CREATE POLICY "no_inspection_delete"
ON inspections
FOR DELETE
USING (FALSE);

Apply equivalent jurisdiction-scoped policies to:
inspection_domain_scores, inspection_responses, inspection_photos, sip_items, inspection_escalations
— each scoped by school_id using the inspector_jurisdictions.school_ids lookup.

Policy: Flagged schools — inspector can insert, only ministry can view all:
CREATE POLICY "inspector_flag_school"
ON flagged_schools
FOR INSERT
WITH CHECK (flagged_by = auth.uid());

CREATE POLICY "ministry_view_flagged"
ON flagged_schools
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM inspector_jurisdictions
    WHERE inspector_id = auth.uid() AND ministry_level > 0
  )
  OR flagged_by = auth.uid()
);

--- SUPABASE STORAGE BUCKETS ---

Create these storage buckets in Supabase Storage:
1. inspections (private) — stores: /inspections/{inspection_id}/reports/{filename}.pdf
2. inspection-photos (private) — stores: /inspections/{inspection_id}/{field_id}/{filename}.jpg
3. inspection-drafts (private) — stores: /inspections/drafts/{inspector_id}/{field_id}/{filename}.jpg

Storage policies:
- Inspectors can upload to their own inspection folders only (path must contain their inspector_id or inspection_id they own).
- Inspectors can read files for inspections within their jurisdiction.
- Ministry officials can read all files in their zone.
```

---

## FINAL VERIFICATION CHECKLIST — RUN AFTER ALL MODULES

```
Before considering the Inspector Dashboard complete, verify every item on this list:

DATA & BACKEND:
[ ] All data fetched from Supabase via service functions — zero hardcoded mock data anywhere
[ ] All RLS policies active — test with a second inspector account in a different jurisdiction and confirm they cannot see the first inspector's data
[ ] All API routes under /api/inspector/ validate JWT server-side before executing
[ ] Escalation triggers fire server-side, not client-side
[ ] PDF is only generated after inspection is saved to Supabase
[ ] Auto-save draft stores to both localStorage AND Supabase (status = draft) when online
[ ] Offline queue processes correctly on network restoration — no data lost
[ ] SIP overdue cron job or database function runs and creates follow-through inspections correctly

FORMS & VALIDATION:
[ ] All forms use Formik + Yup validation
[ ] Mandatory fields cannot be skipped — form shows count of incomplete required fields
[ ] Conditional branching logic shows/hides fields correctly based on answers
[ ] GAPS grading engine calculates and assigns grade correctly for all score ranges
[ ] WSE scoring engine calculates domain scores and overall rating correctly

STATE MANAGEMENT:
[ ] All data mutations use TanStack Query useMutation with invalidateQueries on success
[ ] All data queries use TanStack Query useQuery
[ ] No business logic inside any UI component

UI & UX:
[ ] All pages fully responsive on tablet and desktop
[ ] All loading states use skeleton loaders — no spinners
[ ] Every list and table has a meaningful empty state with icon and CTA
[ ] Every async operation has error handling with a visible error message
[ ] Framer Motion animations run without layout shift
[ ] All interactive elements have minimum 44px touch targets
[ ] Offline banner appears and disappears correctly
[ ] Sync status indicator in nav updates in real time

PDF REPORT:
[ ] Cover page includes school name, date, inspector, GPS coordinates, timestamps
[ ] Domain scores and overall grade displayed correctly
[ ] Annotated photos embedded inline in the correct sections
[ ] GAPS grade and SIP table rendered correctly
[ ] Both digital signatures appear on the final page
[ ] QR code linking to online report is generated and embedded
[ ] PDF uploads to Supabase Storage and URL saved to inspections table

BUILD:
[ ] No TypeScript or ESLint errors
[ ] No console errors or warnings in production build
[ ] All environment variables are in .env — no hardcoded keys in codebase
```

---

*Master Prompt engineered for the Oliskey School App by Oliskeylee Ltd.*
*The Future of School Management ✨📚*