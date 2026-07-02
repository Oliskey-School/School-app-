# Billing, Plan & Demo Bar — Design Spec

## Goal

Replace the 30-day trial banner model with a term-based free tier, move plan management into Settings, remove role-switcher buttons from the demo bar, and expose AI payment to all four user roles.

## Architecture

Four independent changes to existing components — no new routes, no new tables (term data already in `/subscription/current-term`).

## Tech Stack

React, TypeScript, Paystack (`react-paystack`), react-hot-toast, Tailwind CSS, existing backend endpoints.

---

## Global Constraints

- Do NOT touch any UI colors, spacing, or layout outside the explicitly listed components.
- Use `toast` from `react-hot-toast` for all error/success feedback (never `alert()` or shadcn `useToast`).
- Auth values come from `useAuth()` → `{ currentSchool, currentBranchId, user, role, isDemo }`.
- Do NOT add new backend routes. All billing endpoints already exist.

---

## Change 1 — Remove TrialBanner from Dashboard Top

**File:** `components/admin/AdminDashboard.tsx`

Delete the `<TrialBanner onUpgradeClick={...} />` render (currently line ~662). Keep `TrialBanner.tsx` file intact — it gets reused inside Settings.

**File:** `components/admin/AdminDashboard.tsx` (import block)

Remove `import TrialBanner from '../ui/TrialBanner'` only if it is no longer imported anywhere else in that file after the above deletion.

---

## Change 2 — Add Billing & Plan Entry to System Settings

**File:** `components/admin/SystemSettingsScreen.tsx`

Add one new entry to `settingsCategories` array (insert as the FIRST item so it is visible without scrolling):

```ts
{
  view: 'upgrade',
  title: 'Billing & Plan',
  description: 'View your current term, manage your plan, and upgrade.',
  icon: <CreditCard className="h-6 w-6" />,    // from lucide-react
  color: 'text-green-600 bg-green-100'
}
```

The `'upgrade'` view already exists in `AdminDashboard.tsx` viewComponents and loads `SubscriptionPage` — no new wiring needed.

Also render a compact `<TermBillingStatus />` card at the TOP of `SystemSettingsScreen` (above the list) showing:

- Current term number (1, 2, or 3)
- Whether this term is free or paid
- Days until exam-block kicks in (if in Term 2+)
- A banner if exam-block is active

`TermBillingStatus` is a new small component created at `components/admin/TermBillingStatus.tsx`. It calls `usePlanStatus()` (which is updated in Change 3) and renders purely display — no actions.

---

## Change 3 — Term-Based Billing (replaces 30-day trial)

### Billing model

- Academic year = 3 terms × 5 months each (15 months total).
- Term 1 (months 1–5 from academic year start): **fully free**, zero restrictions.
- Term 2 (months 6–10) and Term 3 (months 11–15): **payment required**.
- Academic year start = school's `academic_session_start` field if set, else school `created_at`.
- "Months since start" = `Math.floor(daysSinceStart / (5 * 30))` → gives 0-indexed term (0 = Term 1, 1 = Term 2, 2 = Term 3).
- Exam block trigger: **14 days before term `closing_date`** (from `/subscription/current-term`), if the school is in Term 2+ and has no active paid subscription.

### `lib/hooks/usePlanStatus.ts` changes

Add to `PlanStatus` interface:
```ts
current_term: 1 | 2 | 3;
is_term1_free: boolean;
days_until_exam_block: number | null;  // null when term 1 or already paid
exam_block_active: boolean;
```

Replace the existing 30-day trial fields (`trial_active`, `trial_days_left`, `trial_ends_at`, `is_expired`) with the new fields above. Keep `can_add_student` and `can_add_teacher` (unlimited in term 1, plan-limited in term 2+).

Hook calculation (client-side, from `/subscription/current-term` response already fetched by `SubscriptionPage`):
- Fetch term info inside `usePlanStatus` (same GET `/subscription/current-term`).
- Calculate `current_term` from school's start date.
- Set `is_term1_free = current_term === 1`.
- `exam_block_active = current_term >= 2 && !hasPaidSubscription && daysUntilClosing <= 14`.
- `days_until_exam_block = exam_block_active ? daysUntilClosing : (current_term >= 2 && daysUntilClosing <= 28 ? daysUntilClosing : null)`.

### `TrialBanner.tsx` updated messaging

Replace the three existing render blocks with two:

1. **Exam block warning** (yellow): "Exams start in N days. Upgrade before then to keep full access." + "Upgrade" button → navigates to 'upgrade'.
2. **Exam block active** (red): "Your exam period has started. Upgrade now to unlock exam features." + "Upgrade Now" button.

Keep banner hidden for demo school (`isDemo = true`) and when `is_term1_free = true`.

---

## Change 4 — Remove Role Buttons from Demo Bar

**File:** `components/layout/DashboardLayout.tsx`

In the `{isDemo && (...)}` block (lines ~179–217), delete ONLY the inner `<div className="flex items-center gap-1 flex-1">` block that maps over `['admin', 'teacher', 'parent', 'student']` and renders the 4 role buttons.

Keep:
- The outer `<div>` wrapper with gradient background.
- The yellow-dot + "Demo Mode — changes reset daily" label.
- The "Create Your School" button.

Remove:
- `handleDemoRoleSwitch` calls (the handler itself stays — it may be referenced elsewhere).
- The 4 role pill buttons.
- `switchingRole` state usage inside the button map only.

---

## Change 5 — AI Payment Accessible from All Role Settings

**New shared component:** `components/shared/AIUnlockCard.tsx`

A card that renders correctly for ALL four roles:

| Role | Plan | What the card shows |
|---|---|---|
| Admin | Any | "Upgrade your whole school to Advanced — ₦3,000/child/term" → navigates to upgrade screen |
| Teacher / Student / Parent | Basic school | "Unlock AI for your account — ₦2,000/term" → Paystack self-pay (same logic as AIFeatureLock.handleSelfPay) |
| Teacher / Student / Parent | Free school | "Ask your admin to upgrade to Basic first" |
| Any | Advanced school | "AI Enabled ✓" green card — no CTA |

**Where to add it:**

- **Admin**: Already reachable via the "Billing & Plan" entry in SystemSettingsScreen → SubscriptionPage handles it. No additional placement needed.
- **Teacher**: Add `<AIUnlockCard />` to the Teacher profile/settings screen (find and add inside `TeacherProfileScreen` or equivalent settings view).
- **Student**: Add `<AIUnlockCard />` to the Student profile/settings screen.
- **Parent**: Add `<AIUnlockCard />` to the Parent profile/settings screen.

Payment flow (identical to existing `AIFeatureLock`):
- `POST /subscription/user-ai` with Paystack reference on success.
- `toast.success('AI unlocked for this term!')` on activation.
- Refresh school context via `refreshCurrentSchool()`.

---

## Error Handling

- If `/subscription/current-term` fails → default to `current_term = 1`, `is_term1_free = true` (safe fallback — never block unnecessarily).
- If Paystack self-pay fails → `toast.error('Payment failed. Contact support.')`.
- If plan activation POST fails → `toast.error('Activation failed. Quote reference: ' + ref)`.

---

## Out of Scope

- No changes to Jitsi / virtual classroom.
- No new database migrations.
- No changes to the demo daily reset backend logic.
- No UI color or layout changes outside listed components.
