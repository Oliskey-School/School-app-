import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Header from '../ui/Header';
import PromotionCelebration from '../shared/PromotionCelebration';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import { DashboardType } from '../../types';
import { THEME_CONFIG } from '../../constants';
import { useTranslation } from 'react-i18next';
import { AdminSidebar, TeacherSidebar, ParentSidebar, StudentSidebar, InspectorSidebar } from '../ui/DashboardSidebar';
import { AdminBottomNav, TeacherBottomNav, ParentBottomNav, StudentBottomNav, InspectorBottomNav } from '../ui/DashboardBottomNav';
import { X } from 'lucide-react';
import InstallAppButton from '../shared/InstallAppButton';
import { BranchSwitcher } from '../shared/BranchSwitcher';
import { useBranch } from '../../context/BranchContext';
import { formatSchoolId } from '../../utils/idFormatter';
import { DEMO_ROLES_ORDER, DEMO_ACCOUNTS } from '../../lib/mockAuth';
import RenewalBanner from '../shared/RenewalBanner';
import { usePlanStatus } from '../../lib/hooks/usePlanStatus';
import PlanLockScreen from '../shared/PlanLockScreen';

interface DashboardLayoutProps {
    children: React.ReactNode;
    title?: string;
    onBack?: () => void;
    activeScreen?: string;
    setActiveScreen?: (screen: string) => void;
    hideHeader?: boolean;
    hideSidebar?: boolean;
    hidePadding?: boolean;
    // Like hidePadding's scroll/overflow mechanics (own bounded flex scroll area so a
    // child's sticky footer truly docks to the viewport, not the page), but keeps the
    // normal centered/padded content width instead of going full-bleed.
    stickyFooterLayout?: boolean;
    hideBottomNav?: boolean;
    onLogout?: () => void;
    // Identifies the screen currently being shown (e.g. `${view}::${JSON.stringify(props)}`).
    // Scroll position is remembered per key for the life of the session: the first time a
    // key is seen the page opens at the top; returning to a key already visited (back
    // button, or re-tapping a bottom-nav tab) restores exactly where the user left off.
    scrollKey?: string;
}

import { useProfile } from '../../context/ProfileContext';
import { useAutoSync } from '../../hooks/useAutoSync';

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, title, onBack, activeScreen = 'home', setActiveScreen = () => { }, hideHeader = false, hideSidebar = false, hidePadding = false, stickyFooterLayout = false, hideBottomNav = false, onLogout, scrollKey }) => {
    const { t } = useTranslation();
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    // Persists for the life of the tab (not across reloads) — a fresh session always
    // opens every screen at the top, exactly like a fresh app install would. Populated
    // ONLY by the live onScroll handler below — by the time this effect runs for a NEW
    // scrollKey, the DOM has already been swapped to the new screen's content, so
    // reading el.scrollTop here would capture the new screen's position, not the one
    // being left. The onScroll handler is the only reliably-timed source of truth.
    const scrollPositions = React.useRef<Map<string, number>>(new Map());

    // Restore (or reset) scroll position whenever the visible screen changes.
    // useLayoutEffect so the jump happens before paint — no visible flash of the
    // wrong scroll position. A screen that loads its data asynchronously is often
    // still short (loading skeleton) at this exact moment, so the browser clamps
    // scrollTop down to whatever's scrollable right now. ResizeObserver can't help
    // here — it watches the scroll container's own box, which never changes (fixed
    // flex height); the CONTENT inside it grows instead. So we poll for a short
    // window instead, re-applying the target once there's enough to scroll to.
    React.useLayoutEffect(() => {
        const el = scrollContainerRef.current;
        if (!el || scrollKey === undefined) return;
        const target = scrollPositions.current.get(scrollKey) ?? 0;
        el.scrollTop = target;
        if (target === 0) return;

        let cancelled = false;
        const deadline = Date.now() + 1500;
        const tick = () => {
            if (cancelled) return;
            if (el.scrollTop < target && el.scrollHeight - el.clientHeight >= target) {
                el.scrollTop = target;
            }
            // Stop once it's holding correctly, or once the window's up (content that
            // never grows enough just keeps whatever the browser clamped it to).
            if (Date.now() < deadline && el.scrollTop < target) {
                requestAnimationFrame(tick);
            }
        };
        requestAnimationFrame(tick);
        return () => { cancelled = true; };
    }, [scrollKey]);

    const handleContentScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (scrollKey === undefined) return;
        scrollPositions.current.set(scrollKey, e.currentTarget.scrollTop);
    };

    const { user, role, signOut, currentSchool, isDemo, switchDemoRole } = useAuth();
    const { profile, refreshProfile } = useProfile(); // Use Profile Context
    const { activeBranchGeneratedId } = useBranch(); // Branch-aware Global ID for the header
    const { planStatus } = usePlanStatus();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [switchingRole, setSwitchingRole] = useState<string | null>(null);
    const notificationCount = useRealtimeNotifications(role?.toLowerCase() as any || 'admin');

    // Auto-sync profile data when any user-related table changes
    useAutoSync(['teachers', 'students', 'parents', 'users'], () => {
        console.log('🔄 [DashboardLayout] Sync event detected, refreshing profile...');
        refreshProfile();
    });

    const handleDemoRoleSwitch = async (roleKey: string) => {
        if (roleKey === role?.toLowerCase()) return;
        setSwitchingRole(roleKey);
        try {
            await switchDemoRole(roleKey);
        } finally {
            setSwitchingRole(null);
        }
    };

    const handleLogout = async () => {
        if (onLogout) {
            onLogout();
        } else if (signOut) {
            await signOut();
        } else {
            window.location.href = '/login';
        }
    };

    const formatId = (id: string | null | undefined) => {
        if (!id) return '';

        // A fully-formed global ID (SCHOOL_BRANCH_ROLE_NNNN) is the source of truth —
        // show it EXACTLY as stored, for every branch. We must NOT re-fabricate it:
        // regenerating with hardcoded OLISKEY/MAIN produced wrong IDs (e.g.
        // oliskey_main_STU_0001) for members who actually belong to another branch.
        if (id.split('_').length >= 4) return id;

        // No properly-formed ID available — show what we have rather than inventing one.
        return id;
    };

    const getSidebar = (isMobile = false) => {
        const props = {
            activeScreen,
            setActiveScreen: (screen: string) => {
                React.startTransition(() => {
                    setActiveScreen(screen);
                    if (isMobile) setIsMobileMenuOpen(false);
                });
            },
            onLogout: handleLogout,
            schoolName: currentSchool?.name || user?.school?.name || user?.user_metadata?.school_name || 'Oliskey School',
            logoUrl: currentSchool?.logoUrl || user?.school?.logo_url || user?.user_metadata?.logo_url || ''
        };

        switch (role) {
            case DashboardType.Admin:
            case DashboardType.SuperAdmin:
            case DashboardType.Proprietor:
                return <AdminSidebar {...props} />;
            case DashboardType.Inspector:
                return <InspectorSidebar {...props} />;
            case DashboardType.Teacher:
                return <TeacherSidebar {...props} />;
            case DashboardType.Parent:
                return <ParentSidebar {...props} />;
            case DashboardType.Student:
                return <StudentSidebar {...props} />;
            default:
                return null;
        }
    };

    const getBottomNav = () => {
        const props = {
            activeScreen,
            setActiveScreen: (screen: string) => {
                React.startTransition(() => {
                    setActiveScreen(screen);
                });
            }
        };
        switch (role) {
            case DashboardType.Admin:
            case DashboardType.SuperAdmin:
            case DashboardType.Proprietor:
                return <AdminBottomNav {...props} />;
            case DashboardType.Inspector:
                return <InspectorBottomNav {...props} />;
            case DashboardType.Teacher:
                return <TeacherBottomNav {...props} />;
            case DashboardType.Parent:
                return <ParentBottomNav {...props} />;
            case DashboardType.Student:
                return <StudentBottomNav {...props} />;
            default:
                return null;
        }
    };

    const isAdmin = role === DashboardType.Admin || role === DashboardType.SuperAdmin || role === DashboardType.Proprietor;
    // Hard lock: app blocked for all roles when term 3+ payment is overdue. Demo schools are exempt.
    const isLocked = planStatus.app_locked && !isDemo;

    const theme = role ? THEME_CONFIG[role as keyof typeof THEME_CONFIG] : THEME_CONFIG[DashboardType.Admin];

    return (
        <div className="flex h-screen w-full overflow-hidden bg-gray-50">
            {/* End-of-session celebration — renders ONLY for a user holding an
                unseen promotion/graduation notice (students & parents). */}
            <PromotionCelebration />

            {/* Desktop Sidebar */}
            {!hideSidebar && (
                <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 z-40 liquid-glass-solid border-r border-gray-200/70">
                    {getSidebar()}
                </aside>
            )}

            {/* Mobile Sidebar Overlay */}
            {!hideSidebar && isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar Drawer */}
            {!hideSidebar && (
                <aside className={`fixed inset-y-0 left-0 z-[60] w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="absolute top-4 right-4">
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">
                            <X className="h-5 w-5" />
                        </motion.button>
                    </div>
                    <div className="p-4 border-b border-gray-50 bg-gray-50/30">
                        <BranchSwitcher align="left" />
                    </div>
                    {getSidebar(true)}
                </aside>
            )}

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col h-screen w-full ${!hideSidebar ? 'lg:ml-64' : ''} overflow-hidden min-w-0 relative`}>

                {/* Demo Banner — visible in demo mode */}
                {isDemo && (
                    <div className="flex-shrink-0 bg-gradient-to-r from-blue-700 to-indigo-700 text-white px-3 py-2 flex flex-wrap items-center gap-2 text-xs font-medium z-30">
                        <span className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-300 animate-pulse" />
                            <span className="hidden sm:inline">{t('dashboard.demoMode')}</span>
                            <span className="sm:hidden">Demo</span>
                        </span>
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                sessionStorage.removeItem('is_demo_mode');
                                window.location.href = '/';
                            }}
                            className="bg-white text-blue-700 font-bold px-3 py-1 rounded-lg text-[10px] hover:bg-blue-50 transition flex-shrink-0"
                        >
                            {t('dashboard.createYourSchool')}
                        </motion.button>
                    </div>
                )}

                {!hideHeader && (
                    <Header
                        title={title || 'Dashboard'}
                        // Use profile.avatar_url (live state) -> fallback to top-level user field -> auth metadata -> empty
                        avatarUrl={profile?.avatar_url || user?.avatar_url || user?.user_metadata?.avatar_url || ''}
                        bgColor={theme?.mainBg || 'bg-blue-700'}
                        onLogout={handleLogout}
                        onBack={onBack}
                        onMenuClick={() => setIsMobileMenuOpen(true)}
                        notificationCount={notificationCount}
                        className="w-full flex-shrink-0"
                        userName={user?.full_name || profile?.full_name || user?.user_metadata?.full_name || 'User'}
                        customId={formatId(activeBranchGeneratedId || user?.school_generated_id || profile?.school_generated_id || user?.user_metadata?.school_generated_id)}
                    />
                )}

                <div
                    ref={scrollContainerRef}
                    onScroll={handleContentScroll}
                    className={`flex-1 ${(hidePadding || stickyFooterLayout) && !isLocked ? 'overflow-hidden' : 'overflow-y-auto'} overflow-x-hidden relative ${!hideHeader ? '-mt-8 sm:-mt-10 md:-mt-12 lg:-mt-16' : ''} ${!hidePadding && !stickyFooterLayout ? 'pb-32 lg:pb-16' : 'pb-0'}`}
                >
                    {isLocked ? (
                        <div className={`w-full min-h-full ${!hideHeader ? 'pt-8 sm:pt-10 md:pt-12 lg:pt-16' : ''}`}>
                            <PlanLockScreen isAdmin={isAdmin} schoolName={currentSchool?.name} />
                        </div>
                    ) : (
                        <main className={`${hidePadding || stickyFooterLayout ? 'h-full flex flex-col' : 'min-h-full'} ${!hideHeader ? 'pt-8 sm:pt-10 md:pt-12 lg:pt-16' : ''} ${!hidePadding ? 'px-4 sm:px-6 lg:px-8 max-w-7xl' : 'px-0 max-w-none'} mx-auto w-full`}>
                            <RenewalBanner />
                            <div className={`animate-slide-in-up w-full ${hidePadding || stickyFooterLayout ? 'flex-1 min-h-0' : 'h-full'}`}>
                                {children}
                            </div>
                        </main>
                    )}
                </div>

                {/* Flex spacer — reserves nav height in overflow-hidden layouts so content never slides under the fixed nav */}
                {!hideBottomNav && (hidePadding || stickyFooterLayout) && (
                    <div className="lg:hidden flex-shrink-0 h-16" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} />
                )}

                {/* Mobile/Tablet Bottom Nav — hidden for immersive views (individual chat, games) */}
                {!hideBottomNav && (
                    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md shadow-[0_-2px_10px_rgba(0,0,0,0.05)] border-t border-gray-100">
                        {getBottomNav()}
                    </nav>
                )}

                {/* Demo Role Switcher Pill — REMOVED PER USER REQUEST */}
            </div>
            {/* Single, ALWAYS-VISIBLE install banner for the web version — it stays on screen
                until the app is installed (then self-hides). The one-time pop-up card was
                removed so there is exactly one, persistent install entry point.
                Suppressed on hidePadding/stickyFooterLayout screens: those reserve zero
                bottom padding and often have their own sticky footer (e.g. a form's Save
                bar) docked to the same bottom-left corner — the floating button would sit
                on top of it instead of clearing it. */}
            {!hidePadding && !stickyFooterLayout && <InstallAppButton />}
        </div>
    );
};

export default DashboardLayout;
