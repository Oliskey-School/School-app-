# Premium UX Plan — Oliskey School App

## Progress

**Phase 0 (correctness) — DONE.** 11 of 14 items fixed, tested, building clean.
**Phase 1 (foundation tokens) — DONE.** Zero visual change; accessibility and the
timing language are now in place.
**Phase 2 (chrome & material) — NEXT.**

Verification at time of writing: `tsc --noEmit` 0 errors · `npm run build` succeeds ·
46 unit tests passing across 15 files (21 of them new).

### Phase 0 — what was fixed

| # | Role | Bug | Status |
|---|---|---|---|
| 1 | Student | Exam timer reset to full on refresh | Fixed — deadline is now an absolute wall-clock timestamp in storage |
| 2 | Student | Answers never persisted; no `beforeunload` | Fixed — attempt mirrored to storage on every change; unload warns |
| 3 | Student | "Test Submitted!" shown before the network call | Fixed — success screen only after the server confirms; failure keeps the answers and offers Retry |
| 4 | Student | Score always displayed as 0 | Fixed — the server's score is displayed (see correction below) |
| 5 | Student | Anti-cheat listener never attached | Fixed — stale dep array |
| 6 | Student | Result written into the demo school on context failure | Fixed — hardcoded demo id removed; sync skipped instead |
| 7 | Teacher | Failed saves cleared `isDirty`, hiding lost grades | Fixed — only rows that reached the server are cleared |
| 8 | Teacher | One debounce timer for the whole roster | Fixed — one timer per student |
| 9 | Teacher | Autosave had no error path; teacher trapped on "Saving…" | Fixed — try/catch/finally + an error state |
| 10 | Teacher | Attendance bypassed the offline queue | Fixed — falls back to the sync queue instead of losing the register |
| 11 | Teacher | No unsaved-changes guard anywhere | Fixed — new `useUnsavedChangesGuard` hook, wired into the gradebook |
| 12 | Parent | Fee-fetch failure read as "all fees paid" | Fixed — distinct error state with Retry |
| 13 | Parent | Installment payment | Fixed — see correction below |
| 14 | Parent | Paystack secret key built in the browser | **Not done** — needs a backend endpoint; see Part 5 |

Plus, reported separately by the owner:

| Bug | Status |
|---|---|
| Parent fee page rebuilt its cards 3+ times on open | Fixed — one load per open, startup refresh burst coalesced, cards animate once |

### Corrections to this document's original findings

Two claims in the first version of this plan were wrong, and the fixes changed accordingly.

1. **"The answer key is shipped to the client and a student can post any score."**
   Incorrect. `backend/src/controllers/quiz.controller.ts:95` already passes
   `excludeAnswers: true` for students, and `QuizService.getQuiz` strips
   `correct_answer` *and* the `isCorrect` flags inside the `options` JSON.
   `QuizService.submitQuizResult` recomputes the score server-side from the real key
   and resolves `student_id` from the session. **The backend was already correct.**
   The real bug was the mirror image: the client graded against a key that isn't
   there, so `userAnswer === undefined` was always false and **every student saw
   0 / N and 0%** while the server stored the true grade.

2. **"Paying installment 2 charges the full fee."**
   Incorrect. Hidden payment triggers were only rendered for fees *without* a plan,
   so on an installment fee `getElementById` returned null and the Pay button
   **silently did nothing at all**. Now the triggers render for every fee and the
   installment balance is threaded through as the amount charged.

### Phase 1 — what shipped (no visual change)

- `lib/motion.ts` — the whole timing language is now two springs, `springStandard`
  (damping 1.0) and `springMomentum` (damping 0.8), plus `springExit` at ~65% of the
  entry. Enter and exit paths mirror each other; page transitions became a crossfade
  rather than a slide on every navigation; `inputFocus` no longer scales the field
  under the user's cursor.
- `App.tsx` — `<MotionConfig reducedMotion="user">` at the root. One line; every
  framer-motion animation in all 300+ animating components now honours the OS
  Reduce Motion setting.
- `index.css` — `prefers-reduced-motion`, `prefers-reduced-transparency` and
  `prefers-contrast` are handled for the first time (all three had **zero**
  occurrences in the repo). Glass frosts to near-solid under reduced transparency
  and goes fully solid with a defined border under increased contrast.
- `index.css` — one base-layer `:focus-visible` ring inherited by every interactive
  element. `focus-visible` previously appeared **zero times** across the admin,
  teacher and parent trees.
- `tailwind.config.js` — radius (control/card/sheet), elevation (e1–e4),
  size-specific tracking and leading tokens, as named aliases onto existing values.

---

Status of the rest: **PLAN ONLY.** Phases 2–6 are not implemented.

Design brief from the owner: *"I love the design — don't change it anyhow. Improve it to a premium
design: spacing, sides, when to use an icon on mobile vs the full name on desktop, when to use the
best liquid glass, and when to add professional motion."*

Method: Apple's fluid-interface and design principles (WWDC *Designing Fluid Interfaces*, *Details of
UI Typography*, *Principles of Great Design*), applied to what the codebase actually does today.

---

## Part 0 — What was measured (facts, not opinions)

All counts below are from the real tree (`components/**`, 559 `.tsx` files).

### 0.1 The shared design system exists but is dead code

| Fact | Count |
|---|---|
| Files importing `lib/motion.ts` | **1** (`components/ui/motion-ui.tsx`) |
| Files importing `components/ui/motion-ui.tsx` | **0** |
| Files importing `framer-motion` directly | **334** |
| Files using `MotionButton` | 2 |

A complete motion token layer was built (`fadeIn`, `slideUp`, `modalContent`, `drawerVariants`,
`bottomSheetVariants`, `cardHover`, `buttonTap`, `useReducedMotion`, `createStaggerVariants`) and
then never adopted. **334 files hand-roll their own timings.** This single fact is the root cause of
most of the "not quite premium" feel — there is no shared timing language, so no two screens move
alike.

Evidence of the drift, counting distinct literals in `components/**`:

```
duration: 0.2   × 337      stiffness: 400 × 120
duration: 0.25  × 150      stiffness: 500 ×  19
duration: 0.15  ×  67      stiffness: 300 ×   8
duration: 0.3   ×  57      stiffness: 380 ×   2
duration: 0.01  ×  18      stiffness: 320, 420, 50 × 1 each
```

### 0.2 The scales have no ceiling

| Scale | Steps in active use | Premium target |
|---|---|---|
| Radius | `lg` 1490, `xl` 1469, `full` 1411, `2xl` 942, `3xl` 262, `md` 137, plus `[2rem]` 43 / `[2.5rem]` 27 / `[3rem]` 16 | **3 steps** (control / card / sheet) |
| Shadow | `sm` 1155, `lg` 330, `md` 240, `xl` 179, `2xl` 125, coloured variants 131+, arbitrary `[0…]` 27 | **4 elevation steps** |
| Padding | `p-1` … `p-12` — 10 steps all in real use | **5 steps** |
| Gap | `gap-1` … `gap-20` — 10 steps | **4 steps** |
| Type | `text-sm` 2835, `text-xs` 2186, `text-[10px]` 135, `[11px]` 43, `[9px]` 31, `[8px]` 10, `[15px]` 6 | **7 named steps, none below 12px** |

**219 usages of sub-12px arbitrary text sizes.** These don't participate in the type scale and don't
respond to Android font-scaling — which matters most for the parent audience.

### 0.3 Liquid glass is only reaching a fraction of the app

`index.css` upgrades cards to glass with this selector:

```css
html.glass .bg-white.rounded-2xl, html.glass .bg-white.rounded-3xl, html.glass .bg-white.rounded-\[2rem\]
```

It matches `rounded-2xl` (942), `rounded-3xl` (262) and `rounded-[2rem]` (43) — but **not the 1490
`rounded-lg` and 1469 `rounded-xl` cards.** That is why glass mode looks patchy: roughly half the
card surfaces silently stay opaque. `components/parent/**` and `components/payments/**` contain
**zero** `liquid-glass` references.

There is also a **double-glass stack**, which Apple explicitly warns against:

- `components/layout/DashboardLayout.tsx:309` — `bg-white/95 backdrop-blur-md` on the mobile `<nav>`
- `components/ui/DashboardBottomNav.tsx:49,66,83,100,118,133` — a *second* `bg-white/95 backdrop-blur-sm` inside it

Two blurs composited over each other on a low-end Android, for one bar.

### 0.4 Chrome and page transitions are not interruptible

- `components/layout/DashboardLayout.tsx:230` — the mobile drawer is a CSS
  `transition-transform duration-300`. It cannot be dragged, cannot be dismissed mid-flight, and
  reversing the toggle mid-animation snaps.
- `components/layout/DashboardLayout.tsx:223` — its scrim is a separate `transition-opacity duration-300`
  mounted on a raw boolean (no `AnimatePresence`), so drawer and scrim exits are unsynchronised.
- `components/layout/DashboardLayout.tsx:295` — **every page** enters via the CSS keyframe
  `animate-slide-in-up` (`index.css`), which is non-interruptible by construction.

### 0.5 Accessibility signals are unhandled

- `prefers-reduced-transparency` — **0 occurrences** in the whole repo. Glass mode has no opt-out.
- `prefers-contrast` — **0 occurrences.**
- `prefers-reduced-motion` — handled only inside the unused `lib/motion.ts` hook and one component
  (`components/shared/PromotionCelebration.tsx:76`).

### 0.6 Icon-vs-label discipline is essentially absent

Only **21 of 559** component files use a responsive label pattern (`hidden sm:inline`, `sm:hidden`
and friends). Everywhere else the same label renders at every breakpoint — so mobile gets truncated
text where an icon belongs, and desktop gets bare icons where a word would be clearer.

---

## Part 1 — The Premium Rulebook

This is the part that answers the four things you asked for directly. It is written as rules a
reviewer can enforce, not as vague direction. **None of these rules change a colour, a layout, or a
nav item list.**

### 1.1 Spacing & sides — the density scale

Three densities, chosen by what the surface is, not by taste:

| Density | Where | Card padding | Internal gap | Section rhythm |
|---|---|---|---|---|
| **Comfortable** | Dashboards, detail screens, parent & student surfaces | `p-6` (`sm:p-6`, `p-4` under 480px) | `gap-4` | `space-y-6` |
| **Compact** | Tables, gradebooks, attendance grids, admin lists | `p-4` | `gap-3` | `space-y-4` |
| **Tight** | Chips, pills, badges, toolbar controls | `p-2` | `gap-2` | `space-y-2` |

Rules:

1. **Page side gutters are fixed and global**, already correct in
   `components/layout/DashboardLayout.tsx:293` (`px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto`). Nothing
   inside a page adds its own outer horizontal padding — that is what produces the uneven "sides"
   you're seeing.
2. **A card's padding never exceeds its density step.** `p-8`, `p-10`, `p-12` (390 uses) are for
   full-bleed hero/empty-state blocks only, never for a card in a list.
3. **One rhythm per column.** A vertical stack uses one `space-y-*` value; nested stacks step down
   exactly one notch (`6 → 4 → 2`). No `space-y-5`, `space-y-7`, `space-y-10` inside content.
4. **Spacing in `rem`, never fixed px**, so a larger OS text size scales the layout with the text
   rather than bursting it. Tailwind's default scale is already rem-based — the rule is to stop
   reaching for arbitrary `[Npx]` values.
5. **Optical alignment at the sides:** a card's icon column, its title, and the section heading above
   it share one left edge. Today they frequently don't, which is the single most visible
   "not-premium" tell on a dashboard.

### 1.2 Icon vs full name — mobile, desktop, and touch

The rule Apple applies: **a control is icon-only when its meaning is already established by position
or convention; otherwise it carries a word.** Concretely, four tiers:

| Tier | Mobile (<640px) | Tablet (640–1024) | Desktop (≥1024) | Long-press / tooltip |
|---|---|---|---|---|
| **Primary nav** (bottom nav / sidebar) | Icon **+** short label under it — already correct, and locked | Icon + label | Icon + label | — |
| **Screen-level actions** (Save, Publish, Pay, Submit) | **Full word, always.** Never icon-only | Full word | Icon + word | — |
| **Toolbar / secondary actions** (Filter, Export, Print, Sort) | **Icon only** | Icon only | **Icon + word** | Tooltip on desktop hover; visible label sheet on mobile long-press |
| **Row-level actions** (edit, delete, more) | **Icon only**, min 44×44px | Icon only | Icon only, tooltip on hover | Tooltip / `aria-label` always present |

Hard rules:

1. **Every icon-only control carries an `aria-label`.** No exceptions — that's what makes tier 3 and 4
   legitimate rather than lazy.
2. **Never truncate a label with an ellipsis to fit mobile.** If it doesn't fit, it's tier 3 — drop to
   the icon.
3. **A destructive icon-only button gets a confirm step**, because the icon alone can be misread.
4. **Minimum touch target is 44×44px** even when the glyph is 16px — padding makes up the difference.
   Today, e.g. `components/parent/PickupAuthorizationScreen.tsx:140` is a 16×16px delete target, and
   `components/ui/Header.tsx:65,70,93` — including the **back button** — is ~36px on mobile.
5. **No hover-only reveals on touch surfaces.** `opacity-0 group-hover:opacity-100`
   (`components/parent/LinkChildScreen.tsx:256`) makes a control invisible on a phone.

### 1.3 When to use liquid glass

Glass is a **material for floating chrome**, not a decoration for content. Apple's rule: translucency
signals "this layer floats above the content, and the content continues underneath."

**Use `liquid-glass-solid` (heavier, more opaque) for:**
- The desktop sidebar — already correct at `components/layout/DashboardLayout.tsx:215`
- The mobile bottom nav — **one** layer only, not two
- Sticky screen headers and sticky action footers
- Any bar the content scrolls *underneath*

**Use `liquid-glass` (lighter) for:**
- Modals, sheets, drawers, popovers — surfaces that float over a dimmed background
- Floating pills (the demo role-switcher)

**Never use glass for:**
- **A card sitting on a plain background.** There is nothing behind it to blur, so it just looks
  washed out. This is the current failure mode — the auto-rule blanket-upgrades every
  `.bg-white.rounded-2xl` on the page, including cards on flat `bg-gray-50`.
- **Glass on glass.** A light translucent surface on another light translucent surface destroys
  legibility. Fix the bottom nav double-stack.
- **Official documents.** Report cards and ID cards — already correctly excluded via `.printable-area`,
  `[data-id-card]` and `.no-glass`.
- **Long-form reading text.** Body copy over a live blur is fatiguing.

**Weight follows size:** a full-width sticky bar gets a stronger blur and deeper shadow than a small
chip. Currently every glass surface shares one `--lg-blur`.

**Edges, not borders:** where floating chrome overlaps content, use a short blur/gradient fade
(scroll-edge effect) instead of a hard `border-b`. Today the sticky headers use hard 1px rules —
e.g. `components/parent/UnifiedParentHome.tsx:122`.

**Vibrancy:** text over glass needs slightly heavier weight and higher contrast than text over solid.
Flat `text-gray-500` over a blur is the classic legibility failure.

**Opt-out is mandatory:** honour `prefers-reduced-transparency` (frost to near-solid, drop the blur)
and `prefers-contrast: more` (solid background, defined border). Neither exists today.

### 1.4 When motion is earned

Apple's test: **motion is feedback, not decoration.** If removing it loses no information, remove it.

**Always animate (motion carries meaning):**
| Moment | Treatment |
|---|---|
| Press | Instant scale-down on **pointer-down**, not on click. 100ms. |
| Sheet / drawer / modal open & close | Spring, and it must be **grabbable mid-flight** |
| A list item appearing or disappearing | Spring, with the exit mirroring the entry |
| A value changing (progress, count, balance) | Spring to the new value from the current one |
| Anything the finger is dragging | 1:1 tracking, then hand off the release velocity |

**Never animate:**
- Page-to-page navigation beyond a short cross-fade — a 400ms slide on every screen change (today's
  `animate-slide-in-up`) is a tax paid on every single navigation.
- Decorative loops. `animate-pulse` dots that pulse forever are noise, and they're unstoppable under
  reduced-motion.
- Anything that blocks input while it runs. `components/parent/AppointmentScreen.tsx:419,476` gates a
  booking step behind a 500ms blur with `pointer-events-none` — half a second of dead UI per tap.

**The two springs — the whole timing language, replacing all 20 ad-hoc values:**

| Token | Damping ratio | Response | Use |
|---|---|---|---|
| `springStandard` | **1.0** (critically damped, no overshoot) | 0.35s | Default for everything: modals, lists, cards, values |
| `springMomentum` | **0.8** (slight overshoot) | 0.35s | **Only** after a gesture that carried momentum — a flick, a swipe-dismiss, a drag release |

Overshoot on a menu that just faded in feels wrong. Overshoot on a card you flicked feels right. That
is the entire rule.

**Three craft details that separate "fine" from "premium":**
1. **Animate from the current on-screen value, never the target.** On interrupt, read the live
   transform. Starting from the logical value causes the visible jump you get today when you re-tap a
   closing modal.
2. **Enter and exit along the same path.** A panel that slides in from the right dismisses to the
   right. Today many `AnimatePresence` children have a spring entry and a `duration: 0.15` tween exit
   — asymmetric by construction.
3. **Anchor to the source.** A popover scales from the button that opened it (`transform-origin`), not
   from its own centre.

**Reduced motion** replaces springs and slides with a short opacity cross-fade — it does not remove
feedback. One line at the app root (`<MotionConfig reducedMotion="user">`) covers every framer
animation in all 334 files at once.

---

## Part 2 — Phased implementation plan

Ordered so that the highest-leverage, lowest-risk work lands first. **Phases 1–3 change how the app
feels without changing what it looks like.**

### Phase 1 — Foundation tokens (zero visual change) — *fix once, benefits 334 files*

1. Extend `lib/motion.ts` with `springStandard` / `springMomentum` and re-express every existing
   variant in terms of them. Make entry and exit symmetric.
2. Add `<MotionConfig reducedMotion="user">` at the app root — one line, covers the whole app.
3. Add `prefers-reduced-transparency` and `prefers-contrast` blocks to the glass system in
   `index.css`.
4. Add a single base-layer `focus-visible` ring so every interactive element inherits one.
5. Add spacing/radius/shadow/type tokens to `tailwind.config.js` as **named aliases onto the existing
   values** — nothing re-renders differently, but new code has one name to reach for.

*Risk: near zero. Nothing looks different; the app becomes accessible and gains a timing language.*

### Phase 2 — Chrome & material (the "premium" felt difference)

6. **De-duplicate the bottom-nav double glass** (`DashboardLayout.tsx:309` + `DashboardBottomNav.tsx`
   ×6). One layer.
7. **Widen the glass auto-rule** to `rounded-xl`/`rounded-lg` card surfaces, and **narrow it** so it
   only applies to cards that actually float over content — per rule 1.3.
8. **Size-aware glass:** stronger blur + deeper shadow for full-width bars than for chips.
9. **Scroll-edge fades** replacing hard `border-b` under sticky headers.
10. **Port the mobile drawer** from CSS `transition-transform` to `drawerVariants` + `AnimatePresence`,
    with drag-to-dismiss, velocity handoff and rubber-banding at the edge.
11. **Replace `animate-slide-in-up` page entry** with a 150ms cross-fade.

*Risk: low. Visual character preserved; the material becomes consistent and the chrome becomes
grabbable.*

### Phase 3 — Motion adoption sweep

12. Replace the ~600 inline `duration:` / `stiffness:` literals across 334 files with the two spring
    tokens and the shared stagger. Mechanical, high-volume, per-file verification.
13. Make every `AnimatePresence` child declare a mirrored `exit`.
14. Move press feedback to pointer-down everywhere; every async button gets `idle → pending → result`.
15. Delete decorative infinite loops (`animate-pulse` dots) or gate them behind reduced-motion.

### Phase 4 — Spacing, sides & typography

16. **Type floor:** all 219 sub-12px arbitrary sizes → `text-xs` minimum; drop `tracking-widest` below
    `text-sm`.
17. **Size-specific tracking:** negative on display sizes, ~0 on body. Currently one value everywhere.
18. **Collapse the radius scale** to three steps and the shadow scale to four.
19. **Apply the density scale** from 1.1; remove per-page outer horizontal padding so the global
    gutter is the only one.
20. **Optical alignment pass** — icon column / title / section heading on one left edge.

### Phase 5 — Icon-vs-label pass

21. Apply the 1.2 tier table across all toolbars and row actions (only 21 files do this today).
22. `aria-label` on every icon-only control; 44px floor on every touch target.
23. Remove hover-only reveals from touch surfaces.

### Phase 6 — Role-specific fixes

**Parent** (audit complete — full findings below in Part 3). Highest-severity items are functional,
not cosmetic, and should arguably jump ahead of Phase 4:
- A failed fee fetch renders **"Clear & Current — All financial obligations are fulfilled!"**
  (`FeeStatusScreen.tsx:129-133` → `:347`). A network error tells a parent their fees are paid. **P0.**
- Tapping "Pay Now" on **installment 2 charges the full fee** — the installment argument is discarded
  (`InstallmentSchedule.tsx:174` → `FeeStatusScreen.tsx:368`). **P0.**
- The Pay button has no pending state and can be tapped repeatedly (`payments/FeeCard.tsx:77-83`).
- Payment is triggered by `document.getElementById(...).click()` on hidden buttons; if the element
  isn't found, **nothing happens and nothing is reported** (`FeeStatusScreen.tsx:180-190`).
- `payments/MobileMoneyWrapper.tsx:37,73` builds a Paystack **secret** key client-side
  (`publicKey.replace('pk_','sk_')`) and calls the Paystack API from the browser. It cannot succeed,
  so Mobile Money is a dead option — and the shape of the code invites a real secret into the bundle.
  **Security issue, P0, independent of UX.**
- Copy: the fee list is labelled **"Assignments"** (`FeeStatusScreen.tsx:332`) — which in a school app
  means homework.

**Teacher** (audit complete). Teacher is the heaviest data-entry role and has the worst
correctness record in the app. **Three verified data-loss paths**, all P0:

- **Failed saves are marked as saved.** `ClassGradebookScreen.tsx:413-425` — the per-student save
  `catch` returns `null`, then *every* row is set `isDirty: false`, including the ones that just
  failed. The toast says "Saved 12 of 30 — some saves failed", but the 18 lost rows no longer look
  unsaved, are no longer highlighted, and are excluded from the next Save Draft (which filters on
  `isDirty`). **The teacher has no way to find out which grades were lost.**
- **One shared debounce timer for the whole roster.** `GradeEntryScreen.tsx:40,160-169` — a single
  `debounceTimeoutRef` for all students. Type a score for student A, tab to student B within 1.2s,
  and A's save is cancelled and never fires. No error shown.
- **Autosave has no error path.** `GradeEntryScreen.tsx:138-153` — `saveGrade` is `async` with no
  `try/catch`. On rejection the status never leaves "Saving…", and because the Done button is
  `disabled={saveStatus === 'saving'}` (`:235`), the teacher is **permanently trapped on the screen**.
  Silent loss *and* a dead end.

Plus:
- **No unsaved-changes protection anywhere.** `beforeunload` / route-blocking: **zero occurrences**
  in `components/teacher/**`. `ClassGradebookScreen.tsx:532`'s "Close" button discards 30 dirty rows
  with no prompt.
- **Attendance bypasses the offline queue.** `lib/attendance-service.ts` enqueues through the sync
  engine, and `QuickAttendance.tsx` uses it — but `TeacherAttendanceScreen.tsx:196` calls
  `api.saveAttendance` directly. On a dead classroom signal the register exists only in React state
  and is gone on the next back-nav. This is the single most common teacher action, in the one place
  signal is worst.
- **Five different save contracts** across the five grade-entry screens (debounced autosave, explicit
  save-dirty, explicit save-all, localStorage draft, fire-and-forget). A teacher cannot predict
  whether their work is saved.
- **`useAutoSync` clobbers unsaved edits.** `ClassGradebookScreen.tsx:312` refetches in the
  background and rebuilds every row with `isDirty: false`, silently replacing typed-but-unsaved
  scores with server values.
- **The most-tapped control in the app is 32×32px** — `TeacherAttendanceScreen.tsx:36`, four status
  buttons per row, 12px under the touch floor, with selection signalled by background colour alone,
  no `aria-pressed`, no `role="radiogroup"`.
- **`focus-visible`: 0 occurrences** in `components/teacher/**`, and three buttons set bare
  `focus:outline-none` with no replacement — including both bulk-attendance actions.
- **~86% of teacher cards can never go glass**: `rounded-lg` ×247 and `rounded-xl` ×180 vs
  `rounded-2xl` ×54 and `rounded-3xl` ×18. Teacher is the tree that proves the Part 0.3 selector bug.

**Student** (audit complete — I ran this one directly after the background agent failed three times
on API errors). The CBT exam is the highest-stakes flow in the app and it is the least protected.

- **The exam timer resets to full on refresh.** `cbt/StudentCBTPlayerScreen.tsx:20` —
  `useState((test?.duration || 0) * 60)`. Nothing persists the deadline. Reload the tab and the
  student gets the whole duration back. Same shape in `QuizPlayerScreen.tsx:30,97`. **P0** — this is
  an integrity hole, not a polish item.
- **Answers are never persisted.** `answers` lives in React state only. No `localStorage`, no
  per-question server save, and `beforeunload` has **zero occurrences in `components/student/**`**.
  A closed tab, a crash, or a flat battery loses the entire attempt with no recovery. **P0**
- **The UI reports success before the network call, and locks itself.**
  `cbt/StudentCBTPlayerScreen.tsx:120` sets `isSubmitted(true)`, then `:143` awaits
  `api.submitQuiz`. On failure, `:169` toasts *"Submission failed. Result might not be saved"* while
  the screen already shows **"Test Submitted!"** (`:266,272`). `isSubmitted` blocks any retry
  (`:102`) and the answers are gone. The attempt is unrecoverable. **P0**
- **Grading happens on the client, and the correct answers are shipped to it.**
  `cbt/StudentCBTPlayerScreen.tsx:66` maps `correctAnswer: q.correct_answer` into client state;
  `:105-118` computes the score locally and `:132` posts `score: percentage, status: 'graded'`.
  A student can read the answer key from the network tab and can post any score they like. **P0,
  security not UX** — and it undermines the anti-cheat feature sitting next to it.
- **The anti-cheat listener never activates in the CBT player.**
  `cbt/StudentCBTPlayerScreen.tsx:32` guards on `showInstructions`, but the effect's dep array
  (`:51`) is `[isSubmitted, loading]` — it never re-runs when the student dismisses the instructions,
  so the `visibilitychange` listener is never attached. The feature is dead code in the one screen
  that most needs it. (`QuizPlayerScreen.tsx:55-78` has the same feature and *does* work.)
- **Where it does work, it auto-submits on false positives.** Three `visibilitychange` events
  auto-submit the exam (`QuizPlayerScreen.tsx:62-68`). On a phone, an incoming call, a notification,
  the keyboard opening, or the screen locking each fire that event. A student can lose an exam to
  three phone calls, with no appeal path.
- **A failed school-context lookup submits the exam into the demo school.**
  `cbt/StudentCBTPlayerScreen.tsx:124` falls back to the hardcoded literal
  `'d0ff3e95-9b4c-4c12-989c-e5640d3cacd1'`. Against core requirement #1 (strict isolation).
- **No confirmation before irreversible submit** — `:373` wires the Submit button straight to
  `handleSubmit`. Rulebook §1.2 hard rule 3, and Apple's *Agency/forgiveness* principle.
- **The timer drifts and throttles.** `setInterval` is torn down and rebuilt every tick because
  `timeLeft` is in the dep array (`:86-94`), and browsers throttle intervals in backgrounded tabs.
  Over a 60-minute exam this accumulates real error in the student's favour or against it.
  Fix: derive remaining time from a persisted wall-clock deadline, not a decrementing counter.

**Admin** (targeted scan — the full 192-screen audit is still owed; the background agent failed on
API errors). Two findings are systemic and already actionable:

- **280 `catch` blocks in `components/admin/**` that only `console.error`.** The same root shape the
  Parent and Teacher audits each hit independently. At this volume it is the app's dominant failure
  mode, not a set of isolated bugs.
- **`window.confirm` is the app's real confirmation system.** 35 admin files use the native browser
  dialog; only 11 use the app's own `ConfirmationModal`. Native `confirm` cannot be styled, blocks
  the main thread, looks nothing like the product, and on mobile renders as a bare OS alert — it is
  the single most visible "not premium" moment in the admin surface. It currently guards, among
  other things:
  - `BackupRestoreScreen.tsx:61` — **restore-from-backup**, which overwrites all current school data.
    The most destructive action in the entire product, behind an unstyled OS dialog.
  - `BackupRestoreScreen.tsx:76`, `ClassListScreen.tsx:79`, `ClassroomManagementScreen.tsx:110`,
    `AssetInventory.tsx:83`, `BusDutyRosterScreen.tsx:190`, `CustomReportBuilder.tsx:114`,
    `EquipmentInventoryScreen.tsx:118`.
- **`focus-visible`: 0 occurrences across all 192 admin files.** 46 sub-12px text usages.
- Long admin lists are unvirtualized in most places (12 files app-wide use a virtualization library).

---

## Part 3 — Shared primitives to build

Each one removes a copy-pasted pattern and makes the premium rules automatic rather than remembered.

| Primitive | Replaces | Why |
|---|---|---|
| `springStandard` / `springMomentum` | ~600 inline timing literals | One timing language |
| `<ActionButton>` | Every CTA re-implementing a subset of pending/disabled/tap/44px | Makes 1.2 and 1.4 automatic |
| `useAsyncResource()` → `{data, loading, error, retry}` | `try/catch(console.error)/finally` copy-pasted in 12+ parent files alone | **An empty state can never impersonate a success state** |
| `<AsyncBoundary>` | Ad-hoc spinners and blank screens | Skeleton / error-with-retry / empty-with-next-action |
| `<Skeleton>` / `<CardSkeleton>` / `<ListSkeleton>` | `PremiumLoader`, bare `animate-spin`, "Loading…" text | Layout-matched loading |
| `<Sheet>` with drag-dismiss | CSS-transition drawers | Interruptible, velocity handoff, rubber-band |
| `<ScrollRail>` | 6+ `overflow-x-auto scrollbar-hide` rails with no affordance | Edge fade + scroll-snap |
| `<StatusPill>` | 4 divergent status palettes; colour-only signalling | Colour **+** icon **+** text |
| `<ScreenHeader onBack>` | 3 competing back-button patterns in the parent role alone | Wayfinding: never trap the user |
| `<StepHeader current total>` | Multi-step flows with no progress indication | Appointment, Link Child, payment |
| `usePaymentGateway()` | Hidden buttons + `getElementById().click()` | Removes the P0 payment failure mode |
| `<ConfirmPaymentSheet>` / `<PaymentResultSheet>` | `toast.success('Payment Successful!')` | A ₦-value transaction needs a receipt, not a 3-second toast |

### Teacher-specific (from the Teacher audit)

| Primitive | Replaces | Why |
|---|---|---|
| `useGridEntry({rows, save})` → `{setValue, dirtyIds, rowState, lastSavedAt, retryFailed}` | The five divergent save contracts across `ClassGradebookScreen`, `GradeEntryScreen`, `ResultsEntryEnhanced`, `ReportCardInputScreen`, `GradeSubmissionScreen` | Owns the per-row debounce, per-row failure retention, and the "last saved" clock in one place. Fixes all three P0 data-loss paths structurally |
| `<ScoreCell max min value onChange>` | 11 hand-rolled score inputs across 3 screens | Carries `inputMode="numeric"`, clamp-with-feedback, `aria-label`, and Enter/arrow column traversal |
| `useUnsavedChangesGuard(isDirty)` | Nothing — the pattern is absent from the tree | The only role where navigating away costs 30 values instead of one |
| `<OfflineSaveBadge queued lastSyncedAt>` | The one-off pill at `CBTManagementScreen:251`; the **unused** `GracefulFallback:163-178` | Turns "Failed to save" into "Saved on device — syncs when you're back" |
| `<StatusSegmentedControl>` | `TeacherAttendanceScreen:19-46` and the 3-tap cycle-toggle in `QuickAttendance:29-37` | One 44px, keyboard-navigable, `aria-pressed`-correct control for present/absent/late/leave — the most-tapped control in the app |
| `<BulkStatusBar>` | Two different bulk vocabularies (`TeacherAttendanceScreen:277` vs `QuickAttendance:87`, the latter a no-confirm "RESET ALL") | Guarantees mark-all + undo wherever a roster is marked |
| `<EntryProgressSummary filled total>` | Absent completeness signal in `ReportCardInputScreen`, `ClassGradebookScreen` | "18 of 30 scored · 4 unsaved" in the existing header — no new screen, no layout change |

---

## Part 4 — Phase 0: correctness, before any design work

All four roles were audited. Each one independently produced the **same root failure**: an error is
caught, logged to the console, and then rendered as a reassuring success state. Parent says the fees
are paid. Teacher says the grades saved. Student says the exam was submitted. Admin does it 280 times.

That is not a polish problem, and no amount of spring tuning fixes it. **Recommendation: land Phase 0
first.** It is small, isolated, and every item below is currently losing user data, money, or exam
attempts.

| # | Role | Bug | File |
|---|---|---|---|
| 1 | Student | Exam timer resets to full on refresh | `cbt/StudentCBTPlayerScreen.tsx:20` |
| 2 | Student | Answers never persisted; no `beforeunload`; a closed tab loses the attempt | `cbt/StudentCBTPlayerScreen.tsx` (whole flow) |
| 3 | Student | "Test Submitted!" shown before the network call; failure is unrecoverable and unretryable | `cbt/StudentCBTPlayerScreen.tsx:120,143,169` |
| 4 | Student | Answer key shipped to the client; score computed and posted client-side | `cbt/StudentCBTPlayerScreen.tsx:66,105-132` |
| 5 | Student | Anti-cheat listener never attaches (stale dep array) | `cbt/StudentCBTPlayerScreen.tsx:32,51` |
| 6 | Student | Exam submitted into the **demo school** when school context fails to resolve | `cbt/StudentCBTPlayerScreen.tsx:124` |
| 7 | Teacher | Failed saves cleared `isDirty` — lost grades become invisible | `ClassGradebookScreen.tsx:413-425` |
| 8 | Teacher | One debounce timer for the whole roster cancels the previous student's save | `GradeEntryScreen.tsx:40,160-169` |
| 9 | Teacher | Autosave has no error path; teacher trapped on a permanent "Saving…" | `GradeEntryScreen.tsx:138-153,235` |
| 10 | Teacher | Attendance bypasses the offline sync queue | `TeacherAttendanceScreen.tsx:196` |
| 11 | Teacher | No unsaved-changes guard anywhere in the role | `components/teacher/**` |
| 12 | Parent | Fee-fetch failure renders "All financial obligations are fulfilled!" | `FeeStatusScreen.tsx:129-133,347` |
| 13 | Parent | Paying installment 2 charges the full fee | `FeeStatusScreen.tsx:368` |
| 14 | Parent | Paystack **secret** key constructed in the browser | `payments/MobileMoneyWrapper.tsx:73` |

Items 4, 6 and 14 are security issues rather than UX, and 1–6 together mean the CBT exam cannot
currently be trusted as an assessment instrument.

Two shared primitives from Part 3 — `useAsyncResource()` and `<AsyncBoundary>` — structurally
prevent the whole class of bug behind items 7, 12 and Admin's 280 catches. Building those *is*
most of Phase 0.

## Part 5 — Open items

### Audit still owed
Admin received a targeted scan rather than the full 192-screen audit (the background agent failed
repeatedly on API errors). Its two systemic findings are recorded above and are enough to act on; a
per-screen IA and wayfinding pass across those 192 screens is still outstanding.

### Questions before implementation starts

1. **Scope of the first pass** — do you want Phases 1–3 only (feel changes, look preserved), or all
   six phases?
2. **The parent payment P0s** (wrong installment amount charged; error state reading as "all fees
   paid"; the client-side secret-key construction) are correctness and security bugs, not UX polish.
   Should those be pulled out and fixed immediately, ahead of any design work?
3. **Glass default** — glass currently only activates when `<html>` has the `glass` class. Should
   premium mean glass-on-by-default, or stay opt-in via the Appearance control?
4. **Phase 3 is ~334 files.** Do you want it done in one sweep, or role-by-role so you can review the
   feel after each?
5. **Type floor** — raising 219 sub-12px labels to 12px will make some dense badges and table headers
   slightly larger. That's a real, if small, visual change. Confirm you want it.
6. **Phase 0** — do you want the 14 correctness bugs fixed first, before any design phase? This is my
   recommendation.
7. **`window.confirm` → `ConfirmationModal`** — replacing the 35 native browser dialogs with your own
   modal is one of the biggest single "premium" wins available, and it changes what those moments
   look like (from an OS alert to your design). It's technically a UI change, so I need your explicit
   go-ahead under the UI-preservation policy.
