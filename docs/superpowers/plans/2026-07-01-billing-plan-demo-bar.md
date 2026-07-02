# Billing, Plan & Demo Bar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 30-day trial banner model with a term-based free tier, move plan management into System Settings, remove demo role-switcher buttons, and expose AI payment to all four user-role profile screens.

**Architecture:** Six isolated tasks across existing files — no new backend routes, no DB migrations. The existing `/subscription/current-term` endpoint provides term data; `usePlanStatus` is updated to consume it client-side; new components read from that hook. All five spec changes map to exactly one task each, with Task 3 (hook) as the shared foundation for Tasks 4 and 5.

**Tech Stack:** React, TypeScript, Tailwind CSS, react-hot-toast, react-paystack (`usePaystackPayment`), lucide-react, existing Express endpoints.

## Global Constraints

- Toast: `import { toast } from 'react-hot-toast'` — never `alert()` or shadcn `useToast`
- Auth: `useAuth()` → `{ currentSchool, currentBranchId, user, role, isDemo, refreshCurrentSchool }` (NOT `currentBranch`)
- `role` is a `DashboardType` enum value: `DashboardType.Teacher`, `DashboardType.Student`, `DashboardType.Parent`, `DashboardType.Admin`, `DashboardType.Proprietor`
- Paystack env: `import.meta.env.VITE_PAYSTACK_PUBLIC_KEY` (Vite, not `process.env`)
- AI self-pay: `USER_AI_PRICE = 2000` (₦); multiply by 100 for Paystack kobo; POST to `/subscription/user-ai` with `{ reference: string }`
- Never add new backend routes — all needed endpoints already exist
- Never modify UI colors, spacing, or layout outside the explicitly listed files
- Demo school (`isDemo === true`) suppresses all billing UI

---

### Task 1: Remove TrialBanner from AdminDashboard

**Files:**
- Modify: `components/admin/AdminDashboard.tsx` (line 16 import + line 662 render)

**Interfaces:**
- Produces: AdminDashboard no longer imports or renders TrialBanner

- [ ] **Step 1: Delete the import on line 16**

In `components/admin/AdminDashboard.tsx`, remove this line:
```typescript
import TrialBanner from '../ui/TrialBanner';
```

- [ ] **Step 2: Delete the render on line 662**

In `components/admin/AdminDashboard.tsx`, find and remove:
```tsx
<TrialBanner onUpgradeClick={() => navigateTo('upgrade', 'Upgrade Plan')} />
```

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors (or no new errors beyond any baseline)

- [ ] **Step 4: Commit**

```bash
git add components/admin/AdminDashboard.tsx
git commit -m "refactor(admin): remove TrialBanner from dashboard top — now lives in Settings"
```

---

### Task 2: Remove Role-Switcher Buttons from Demo Bar

**Files:**
- Modify: `components/layout/DashboardLayout.tsx` (lines 186–206)

**Interfaces:**
- Produces: Demo bar shows only the yellow-dot "Demo Mode" label + "Create Your School" button; no role pills

- [ ] **Step 1: Delete the role-buttons `<div>` block**

In `components/layout/DashboardLayout.tsx`, find and delete this entire block (lines 186–206):

```tsx
<div className="flex items-center gap-1 flex-1">
    {(['admin', 'teacher', 'parent', 'student'] as const).map(r => {
        const isActive = role?.toLowerCase() === r;
        const isLoading = switchingRole === r;
        const labels: Record<string, string> = { admin: 'Admin', teacher: 'Teacher', parent: 'Parent', student: 'Student' };
        return (
            <button
                key={r}
                onClick={() => handleDemoRoleSwitch(r)}
                disabled={isActive || !!switchingRole}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all flex-shrink-0 ${
                    isActive
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'bg-white/20 text-white hover:bg-white/35 disabled:opacity-50'
                }`}
            >
                {isLoading ? '…' : labels[r]}
            </button>
        );
    })}
</div>
```

After deletion the `{isDemo && (...)}` block should look exactly like this:

```tsx
{isDemo && (
    <div className="flex-shrink-0 bg-gradient-to-r from-blue-700 to-indigo-700 text-white px-3 py-2 flex flex-wrap items-center gap-2 text-xs font-medium z-30">
        <span className="flex items-center gap-1.5 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-300 animate-pulse" />
            <span className="hidden sm:inline">{t('dashboard.demoMode')}</span>
            <span className="sm:hidden">Demo</span>
        </span>
        <button
            onClick={() => {
                sessionStorage.removeItem('is_demo_mode');
                window.location.href = '/';
            }}
            className="bg-white text-blue-700 font-bold px-3 py-1 rounded-lg text-[10px] hover:bg-blue-50 transition flex-shrink-0"
        >
            {t('dashboard.createYourSchool')}
        </button>
    </div>
)}
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add components/layout/DashboardLayout.tsx
git commit -m "refactor(demo): remove role-switcher pills from demo bar — keep label and CTA"
```

---

### Task 3: Add Term Fields to usePlanStatus Hook

**Files:**
- Modify: `lib/hooks/usePlanStatus.ts`

**Interfaces:**
- Produces: `PlanStatus` interface adds `current_term: 1|2|3`, `is_term1_free: boolean`, `days_until_exam_block: number|null`, `exam_block_active: boolean`
- Consumed by: `TrialBanner.tsx` (Task 4), `TermBillingStatus.tsx` (Task 5)

Term logic (client-side):
- Academic start = `currentSchool.academic_session_start` || `currentSchool.created_at`
- `termIndex = clamp(floor(daysSinceStart / 150), 0, 2)` where 150 = 5 months × 30 days
- `current_term = termIndex + 1` (1-indexed)
- `is_term1_free = current_term === 1`
- `closing_date` comes from `GET /subscription/current-term` response
- `exam_block_active = current_term >= 2 && !hasPaidSubscription && daysUntilClosing <= 14`
- `days_until_exam_block`: the actual day count when block is active or approaching (≤28 days); else `null`
- Fallback on any fetch error: `current_term = 1`, `is_term1_free = true` (never block unnecessarily)

- [ ] **Step 1: Replace `lib/hooks/usePlanStatus.ts` entirely**

```typescript
import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../../context/AuthContext';

export interface PlanLimits {
    max_students: number;
    max_teachers: number;
}

export interface PlanUsage {
    students: number;
    teachers: number;
}

export interface PlanStatus {
    plan_type: string;
    subscription_status: string;
    effective_plan: string;
    trial_active: boolean;
    trial_days_left: number;
    trial_ends_at: string | null;
    is_expired: boolean;
    limits: PlanLimits;
    usage: PlanUsage;
    can_add_student: boolean;
    can_add_teacher: boolean;
    // Term-based billing
    current_term: 1 | 2 | 3;
    is_term1_free: boolean;
    days_until_exam_block: number | null;
    exam_block_active: boolean;
}

const DEFAULT_STATUS: PlanStatus = {
    plan_type: 'free',
    subscription_status: 'active',
    effective_plan: 'free',
    trial_active: false,
    trial_days_left: 0,
    trial_ends_at: null,
    is_expired: false,
    limits: { max_students: 50, max_teachers: 10 },
    usage: { students: 0, teachers: 0 },
    can_add_student: true,
    can_add_teacher: true,
    current_term: 1,
    is_term1_free: true,
    days_until_exam_block: null,
    exam_block_active: false,
};

function calcTermFields(
    currentSchool: any,
    termInfo: { closing_date?: string } | null,
    planData: Partial<PlanStatus>
): Pick<PlanStatus, 'current_term' | 'is_term1_free' | 'days_until_exam_block' | 'exam_block_active'> {
    try {
        const anchor = currentSchool?.academic_session_start || currentSchool?.created_at;
        const start = anchor ? new Date(anchor) : new Date();
        const daysSinceStart = Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
        const termIndex = Math.min(Math.max(Math.floor(daysSinceStart / 150), 0), 2);
        const current_term = (termIndex + 1) as 1 | 2 | 3;
        const is_term1_free = current_term === 1;

        const closingDate = termInfo?.closing_date ? new Date(termInfo.closing_date) : null;
        const daysUntilClosing = closingDate
            ? Math.ceil((closingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null;

        const hasPaidSubscription =
            planData.subscription_status === 'active' && planData.plan_type !== 'free';

        const exam_block_active =
            current_term >= 2 &&
            !hasPaidSubscription &&
            daysUntilClosing !== null &&
            daysUntilClosing <= 14;

        const days_until_exam_block =
            exam_block_active
                ? daysUntilClosing
                : current_term >= 2 && !hasPaidSubscription && daysUntilClosing !== null && daysUntilClosing <= 28
                ? daysUntilClosing
                : null;

        return { current_term, is_term1_free, days_until_exam_block, exam_block_active };
    } catch {
        return { current_term: 1, is_term1_free: true, days_until_exam_block: null, exam_block_active: false };
    }
}

export function usePlanStatus() {
    const { currentSchool, isDemo } = useAuth();
    const schoolId = currentSchool?.id;
    const [planStatus, setPlanStatus] = useState<PlanStatus>(DEFAULT_STATUS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!schoolId) {
            setLoading(false);
            return;
        }

        let cancelled = false;

        const fetchAll = async () => {
            setLoading(true);
            try {
                const [planData, termInfo] = await Promise.all([
                    api.getPlanStatus(schoolId),
                    (api.get('/subscription/current-term') as Promise<any>).catch(() => null),
                ]);

                if (cancelled) return;

                if (planData && !planData.error) {
                    const termFields = calcTermFields(currentSchool, termInfo, planData);
                    setPlanStatus(prev => ({ ...prev, ...planData, ...termFields }));
                }
            } catch (e: any) {
                if (!cancelled) setError(e.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchAll();
        return () => { cancelled = true; };
    }, [schoolId, currentSchool]);

    return {
        planStatus,
        loading,
        error,
        canAddStudent: planStatus.can_add_student,
        canAddTeacher: planStatus.can_add_teacher,
        trialActive: planStatus.trial_active,
        trialDaysLeft: planStatus.trial_days_left,
        isExpired: planStatus.is_expired,
        effectivePlan: planStatus.effective_plan,
        isDemo,
    };
}
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/usePlanStatus.ts
git commit -m "feat(billing): add term-based fields to usePlanStatus (current_term, exam_block)"
```

---

### Task 4: Update TrialBanner + Create TermBillingStatus

**Files:**
- Modify: `components/ui/TrialBanner.tsx`
- Create: `components/admin/TermBillingStatus.tsx`

**Interfaces:**
- Consumes: `usePlanStatus()` term fields from Task 3
- Produces: TrialBanner now shows exam-block warnings (2 variants); TermBillingStatus is a compact card for SystemSettings
- `onUpgradeClick?: () => void` prop retained on TrialBanner — called by TermBillingStatus

- [ ] **Step 1: Replace `components/ui/TrialBanner.tsx` entirely**

```tsx
import React from 'react';
import { AlertTriangle, XCircle } from 'lucide-react';
import { usePlanStatus } from '../../lib/hooks/usePlanStatus';

interface TrialBannerProps {
    onUpgradeClick?: () => void;
}

const TrialBanner: React.FC<TrialBannerProps> = ({ onUpgradeClick }) => {
    const { planStatus, loading, isDemo } = usePlanStatus();

    if (loading || isDemo) return null;

    const { is_term1_free, exam_block_active, days_until_exam_block } = planStatus;

    if (is_term1_free) return null;
    if (!exam_block_active && days_until_exam_block === null) return null;

    if (exam_block_active) {
        return (
            <div className="bg-red-600 text-white px-4 py-3 flex items-center gap-3">
                <XCircle className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1 text-sm font-medium">
                    Your exam period has started. Upgrade now to unlock exam features.
                </div>
                {onUpgradeClick && (
                    <button
                        onClick={onUpgradeClick}
                        className="bg-white text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-50 flex-shrink-0"
                    >
                        Upgrade Now
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="bg-amber-500 text-white px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1 text-sm font-medium">
                Exams start in{' '}
                <span className="font-bold">
                    {days_until_exam_block} day{days_until_exam_block !== 1 ? 's' : ''}
                </span>
                . Upgrade before then to keep full access.
            </div>
            {onUpgradeClick && (
                <button
                    onClick={onUpgradeClick}
                    className="bg-white text-amber-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-amber-50 flex-shrink-0"
                >
                    Upgrade
                </button>
            )}
        </div>
    );
};

export default TrialBanner;
```

- [ ] **Step 2: Create `components/admin/TermBillingStatus.tsx`**

```tsx
import React from 'react';
import { CreditCard, CheckCircle, Clock } from 'lucide-react';
import { usePlanStatus } from '../../lib/hooks/usePlanStatus';
import TrialBanner from '../ui/TrialBanner';

interface TermBillingStatusProps {
    navigateTo: (view: string, title: string, props?: any) => void;
}

const TermBillingStatus: React.FC<TermBillingStatusProps> = ({ navigateTo }) => {
    const { planStatus, loading, isDemo } = usePlanStatus();

    if (loading || isDemo) return null;

    const { current_term, is_term1_free, effective_plan } = planStatus;
    const termLabel = `Term ${current_term}`;
    const planLabel = effective_plan.charAt(0).toUpperCase() + effective_plan.slice(1);

    return (
        <div className="space-y-2 mb-1">
            <TrialBanner onUpgradeClick={() => navigateTo('upgrade', 'Billing & Plan')} />
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-100 text-green-600 flex-shrink-0">
                    <CreditCard className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{termLabel} — {planLabel} Plan</p>
                    {is_term1_free ? (
                        <p className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                            <CheckCircle className="w-3 h-3" />
                            Free this term — no payment required
                        </p>
                    ) : (
                        <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            Payment required for this term
                        </p>
                    )}
                </div>
                <button
                    onClick={() => navigateTo('upgrade', 'Billing & Plan')}
                    className="text-xs font-semibold text-green-600 hover:text-green-700 flex-shrink-0"
                >
                    Manage →
                </button>
            </div>
        </div>
    );
};

export default TermBillingStatus;
```

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add components/ui/TrialBanner.tsx components/admin/TermBillingStatus.tsx
git commit -m "feat(billing): update TrialBanner to exam-block warnings; add TermBillingStatus card"
```

---

### Task 5: Add Billing & Plan Entry to System Settings

**Files:**
- Modify: `components/admin/SystemSettingsScreen.tsx`

**Interfaces:**
- Consumes: `TermBillingStatus` from Task 4; `navigateTo` prop (already on the component)
- Produces: 'Billing & Plan' is the first item in the settings list; TermBillingStatus card appears above the list

Current state of `SystemSettingsScreen.tsx`:
- Line 1–3: imports from `../../constants` + `lucide-react` (`UserPlus`, `Sparkles`)
- Line 9: `const settingsCategories = [` — array of 19 entries, first is `appearanceSettings`
- Line 31: component body renders `<div>` wrapping `{settingsCategories.map(...)}`

- [ ] **Step 1: Add imports**

Add `CreditCard` to the existing lucide-react import on line 3:
```typescript
import { UserPlus, Sparkles, CreditCard } from 'lucide-react';
```

Add TermBillingStatus import on a new line after the existing imports (after line 3):
```typescript
import TermBillingStatus from './TermBillingStatus';
```

- [ ] **Step 2: Insert 'Billing & Plan' as the FIRST settingsCategories entry**

Find the opening of the array:
```typescript
const settingsCategories = [
  { view: 'appearanceSettings',
```

Replace with:
```typescript
const settingsCategories = [
  { view: 'upgrade', title: 'Billing & Plan', description: 'View your current term, manage your plan, and upgrade.', icon: <CreditCard className="h-6 w-6" />, color: 'text-green-600 bg-green-100' },
  { view: 'appearanceSettings',
```

- [ ] **Step 3: Add TermBillingStatus above the list**

Find the component render opening:
```tsx
const SystemSettingsScreen: React.FC<SystemSettingsScreenProps> = ({ navigateTo }) => {
  return (
    <div className="p-4 space-y-3 bg-gray-50 pb-32 lg:pb-4">
      {settingsCategories.map(cat => (
```

Replace with:
```tsx
const SystemSettingsScreen: React.FC<SystemSettingsScreenProps> = ({ navigateTo }) => {
  return (
    <div className="p-4 space-y-3 bg-gray-50 pb-32 lg:pb-4">
      <TermBillingStatus navigateTo={navigateTo} />
      {settingsCategories.map(cat => (
```

- [ ] **Step 4: TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add components/admin/SystemSettingsScreen.tsx
git commit -m "feat(billing): add Billing & Plan entry and TermBillingStatus card to System Settings"
```

---

### Task 6: Create AIUnlockCard and Add to Role Profile Screens

**Files:**
- Create: `components/shared/AIUnlockCard.tsx`
- Modify: `components/teacher/TeacherProfile.tsx`
- Modify: `components/student/StudentProfileScreen.tsx`
- Modify: `components/parent/ParentProfileScreen.tsx`

**Interfaces:**
- Consumes: `useSubscriptionGate()` from `hooks/useSubscriptionGate.ts` → `{ gate.isAIAllowed, gate.plan }`; `useAuth()` → `{ user, role, refreshCurrentSchool, isDemo }`; `usePaystackPayment` from `react-paystack`; `DashboardType` from `types`
- Produces: A standalone card rendering correctly for all four roles based on plan

Card behavior matrix:
| Role | Plan | Rendered card |
|---|---|---|
| Admin / Proprietor | Any | "Upgrade your whole school to Advanced — ₦3,000/child/term" + "View Plans →" button → `navigateTo('upgrade', 'Billing & Plan')` |
| Teacher / Student / Parent | Basic school | "Unlock AI for your account — ₦2,000/term" + Paystack self-pay button |
| Teacher / Student / Parent | Free school | "Ask your admin to upgrade to Basic first" (locked icon, no CTA) |
| Any role | Advanced school (isAIAllowed) | "AI Features Enabled ✓" green card — no CTA |
| Demo school | — | `null` — hidden entirely |

- [ ] **Step 1: Create `components/shared/AIUnlockCard.tsx`**

```tsx
import React, { useState } from 'react';
import { Sparkles, Lock, CheckCircle } from 'lucide-react';
import { usePaystackPayment } from 'react-paystack';
import { toast } from 'react-hot-toast';
import { useSubscriptionGate } from '../../hooks/useSubscriptionGate';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { DashboardType } from '../../types';

const USER_AI_PRICE = 2000; // ₦ per term per user

interface AIUnlockCardProps {
    navigateTo?: (view: string, title: string, props?: any) => void;
}

const AIUnlockCard: React.FC<AIUnlockCardProps> = ({ navigateTo }) => {
    const gate = useSubscriptionGate();
    const { user, role, refreshCurrentSchool, isDemo } = useAuth() as any;
    const [paying, setPaying] = useState(false);

    const email = user?.email || '';
    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';

    const initPay = usePaystackPayment({
        reference: `userai_${Date.now()}`,
        email,
        amount: USER_AI_PRICE * 100,
        publicKey,
        currency: 'NGN',
    });

    if (isDemo) return null;

    if (gate.isAIAllowed) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-xl flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <p className="font-bold text-gray-800 text-sm">AI Features Enabled</p>
                        <p className="text-xs text-green-600 mt-0.5">You have full access to AI-powered tools this term.</p>
                    </div>
                </div>
            </div>
        );
    }

    const isAdmin = role === DashboardType.Admin || role === DashboardType.Proprietor;
    const isStaffOrFamily =
        role === DashboardType.Teacher ||
        role === DashboardType.Student ||
        role === DashboardType.Parent;
    const canSelfPay = isStaffOrFamily && gate.plan === 'basic';

    const handleSelfPay = () => {
        if (!email || !publicKey) {
            toast.error('Online payment is not configured. Please contact your school.');
            return;
        }
        initPay({
            onSuccess: async (ref: any) => {
                setPaying(true);
                try {
                    await api.post('/subscription/user-ai', { reference: ref.reference || ref.trxref });
                    await refreshCurrentSchool?.();
                    toast.success('AI is now unlocked on your account for this term!');
                } catch (e: any) {
                    toast.error(
                        e?.message ||
                        'Activation failed. Please contact support with reference: ' +
                        (ref.reference || ref.trxref)
                    );
                } finally {
                    setPaying(false);
                }
            },
            onClose: () => { /* user dismissed */ },
        });
    };

    if (isAdmin) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-indigo-100 rounded-xl flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <p className="font-bold text-gray-800 text-sm">Upgrade to Advanced</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Unlock AI tools for your whole school — ₦3,000/child/term
                        </p>
                    </div>
                </div>
                {navigateTo && (
                    <button
                        onClick={() => navigateTo('upgrade', 'Billing & Plan')}
                        className="w-full py-2.5 px-4 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors"
                    >
                        View Plans →
                    </button>
                )}
            </div>
        );
    }

    if (canSelfPay) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-indigo-100 rounded-xl flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <p className="font-bold text-gray-800 text-sm">Unlock AI for Your Account</p>
                        <p className="text-xs text-gray-500 mt-0.5">Personal AI access — ₦2,000 for this term</p>
                    </div>
                </div>
                <button
                    onClick={handleSelfPay}
                    disabled={paying}
                    className="w-full py-2.5 px-4 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60"
                >
                    {paying ? 'Activating…' : 'Pay ₦2,000 — Unlock AI'}
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-xl flex-shrink-0">
                    <Lock className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                    <p className="font-bold text-gray-800 text-sm">AI Features</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Your school needs to upgrade to Basic plan before you can unlock personal AI access.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AIUnlockCard;
```

- [ ] **Step 2: Add AIUnlockCard to TeacherProfile.tsx**

In `components/teacher/TeacherProfile.tsx`, add import after the existing imports:
```tsx
import AIUnlockCard from '../shared/AIUnlockCard';
```

Find the Quick Actions closing and the `</main>` tag (lines 127–129):
```tsx
          </div>
        </div>
      </main>
```

Insert `<AIUnlockCard />` between the closing `</div>` of Quick Actions and `</main>`:
```tsx
          </div>
        </div>

        {/* AI Plan */}
        <AIUnlockCard />
      </main>
```

Note: TeacherProfile has `navigateTo` in scope (used on line 134 for the Settings button) but the Teacher profile does not need to navigate to 'upgrade' — teachers use Paystack self-pay. The `navigateTo` prop on AIUnlockCard is optional and unused here.

- [ ] **Step 3: Add AIUnlockCard to StudentProfileScreen.tsx**

In `components/student/StudentProfileScreen.tsx`, add import near the top:
```tsx
import AIUnlockCard from '../shared/AIUnlockCard';
```

Find the right column's closing `</div>` (after the Upcoming Events card, around line 323). The Upcoming Events card ends with:
```tsx
                        <EventItem date="Jan 20" title="Sports Day" />
                    </div>
                </div>
            </div>
```

After the Upcoming Events closing `</div>`, before the right column's closing `</div>`, insert:
```tsx
                        <EventItem date="Jan 20" title="Sports Day" />
                    </div>
                </div>

                {/* AI Plan */}
                <AIUnlockCard navigateTo={navigateTo} />
            </div>
```

- [ ] **Step 4: Add AIUnlockCard to ParentProfileScreen.tsx**

In `components/parent/ParentProfileScreen.tsx`, add import near the top:
```tsx
import AIUnlockCard from '../shared/AIUnlockCard';
```

In the left pane's `flex-grow` scroll area, `<VersionStatusCard />` renders on line 161, immediately before the menu items `<div>` at line 163. Insert `<AIUnlockCard navigateTo={navigateTo} />` between them:

Find:
```tsx
          <VersionStatusCard />

          <div className="bg-white rounded-xl shadow-sm p-2">
            {menuItems.map((item, index) => (
```

Replace with:
```tsx
          <VersionStatusCard />

          {/* AI Plan */}
          <AIUnlockCard navigateTo={navigateTo} />

          <div className="bg-white rounded-xl shadow-sm p-2">
            {menuItems.map((item, index) => (
```

- [ ] **Step 5: TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 6: Build check**

Run: `npm run build`
Expected: Exit code 0, no TypeScript or Vite errors

- [ ] **Step 7: Commit**

```bash
git add components/shared/AIUnlockCard.tsx components/teacher/TeacherProfile.tsx components/student/StudentProfileScreen.tsx components/parent/ParentProfileScreen.tsx
git commit -m "feat(billing): add AIUnlockCard to Teacher/Student/Parent profile screens"
```

---

## Final Verification

After all six tasks complete:

```bash
# 0 TypeScript errors
npx tsc --noEmit

# Clean production build
npm run build
```

**Manual checks (in browser):**

| Check | Expected |
|---|---|
| Admin dashboard top | No banner on load |
| Demo mode | Only "Demo Mode — changes reset daily" + "Create Your School" — no role pills |
| Admin > System Settings | TermBillingStatus card at top; "Billing & Plan" first in list |
| System Settings > Billing & Plan | Navigates to SubscriptionPage |
| Term 1 school | No exam-block banner anywhere |
| Term 2+ school 14 days before closing | Amber exam-block warning in Settings |
| Term 2+ school at/past closing | Red exam-block active banner in Settings |
| Teacher profile | AI card (enabled / self-pay / locked) based on plan |
| Student profile | Same AI card in right column |
| Parent profile | Same AI card above settings menu |
| Demo school all roles | AIUnlockCard hidden (`null`) |
