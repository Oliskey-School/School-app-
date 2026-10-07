
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogoutIcon, ChevronLeftIcon, NotificationIcon, SearchIcon, UserIcon } from '../../constants';
import { Menu } from 'lucide-react';

import { BranchSwitcher } from '../shared/BranchSwitcher';
import { useBranch } from '../../context/BranchContext';

interface HeaderProps {
  title: string;
  avatarUrl: string;
  bgColor: string;
  onLogout?: () => void;
  onBack?: () => void;
  onMenuClick?: () => void;
  onNotificationClick?: () => void;
  notificationCount?: number;
  onSearchClick?: () => void;
  className?: string; // Allow custom classes
  customId?: string;
  userName?: string; // Add this
}

const Header: React.FC<HeaderProps> = ({ title, avatarUrl, bgColor, onLogout, onBack, onMenuClick, onNotificationClick, notificationCount, onSearchClick, className = '', customId, userName }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const { currentBranch, canSwitchBranches } = useBranch();

  // The menu is drawn in a portal, positioned from the avatar's own box, so it
  // always sits above page content (a sticky card lower in the page can out-rank
  // the header's own layer) and is never clipped by the header.
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [branchPanelOpen, setBranchPanelOpen] = useState(false);
  const placeMenu = React.useCallback(() => {
    const r = buttonRef.current?.getBoundingClientRect();
    if (r) setMenuPos({ top: Math.round(r.bottom + 8), right: Math.max(8, Math.round(window.innerWidth - r.right)) });
  }, []);

  React.useEffect(() => {
    if (!isDropdownOpen) return;
    placeMenu();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsDropdownOpen(false); buttonRef.current?.focus(); }
    };
    const onResize = () => setIsDropdownOpen(false);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [isDropdownOpen, placeMenu]);

  React.useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (
        isDropdownOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const Avatar = () => (
    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/30 p-1 flex-shrink-0">
      {avatarUrl ? (
        <img src={avatarUrl} alt="avatar" className="rounded-full w-full h-full object-cover" />
      ) : (
        <UserIcon className={`w-full h-full p-1 ${bgColor.includes('bg-white') || bgColor.includes('bg-gray-50') ? 'text-gray-400' : 'text-gray-100'}`} />
      )}
    </div>
  );

  return (
    <header className={`${bgColor} text-white px-3 sm:px-5 py-4 sm:py-5 pb-8 rounded-b-3xl relative z-10 print:hidden ${className}`}>
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          {onMenuClick && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={onMenuClick} className={`hidden p-1.5 sm:p-2 -ml-2 mr-1 rounded-full hover:bg-current/10 flex-shrink-0 lg:hidden focus:outline-none`} aria-label="Open menu">
              <Menu className={`h-6 w-6 sm:h-7 sm:w-7 ${bgColor.includes('bg-white') || bgColor.includes('bg-gray-50') ? 'text-gray-900' : 'text-white'}`} />
            </motion.button>
          )}
          {onBack && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={onBack} className="p-1.5 sm:p-2 -ml-2 rounded-full hover:bg-white/10 flex-shrink-0" aria-label="Go back">
              <ChevronLeftIcon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            </motion.button>
          )}
          <div className="flex flex-col min-w-0 flex-1">
            {/* Titles get " Dashboard" appended below, so real screen names like
                "Book Appointment" become "Book Appointment Dashboard" — too long
                for a 390px phone, where `truncate` chopped it to "Book Appointment
                Dashboa". Wrap to at most two lines on phones and only truncate
                once there is room for a single line. (line-clamp needs
                -webkit-box, so the h1 can no longer be a flex container — it has
                a single text child, so nothing depended on that.) */}
            <h1 className="text-lg sm:text-2xl md:text-4xl font-extrabold tracking-tight leading-tight line-clamp-2 sm:truncate">
              {title.toLowerCase().includes('dashboard') ? title : `${title} Dashboard`}
            </h1>
            <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
              {customId && (
                <div className="flex items-center space-x-1.5 opacity-90">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest bg-white/20 px-1.5 py-0.5 rounded">ID</span>
                  <span className="text-xs sm:text-sm font-mono font-bold tracking-wider truncate">{customId}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
          <div className="hidden md:block mr-2">
            <BranchSwitcher />
          </div>
          {onSearchClick && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={onSearchClick} className="relative p-1.5 sm:p-2 rounded-full hover:bg-current/10" aria-label="Search">
              <SearchIcon className={`h-6 w-6 sm:h-7 sm:w-7 ${bgColor.includes('bg-white') || bgColor.includes('bg-gray-50') ? 'text-gray-900' : 'text-white'}`} />
            </motion.button>
          )}
          {onNotificationClick && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={onNotificationClick} className="relative p-1.5 sm:p-2 rounded-full hover:bg-current/10" aria-label={`View notifications. ${notificationCount || 0} unread.`}>
              <div className="relative">
                <NotificationIcon className={`h-6 w-6 sm:h-7 sm:w-7 ${bgColor.includes('bg-white') || bgColor.includes('bg-gray-50') ? 'text-gray-900' : 'text-white'}`} />
                {notificationCount !== undefined && notificationCount > 0 && (
                  <motion.span
                    key={notificationCount}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm border border-white pointer-events-none"
                  >
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </motion.span>
                )}
              </div>
            </motion.button>
          )}
          {onLogout ? (
            <motion.button
              whileTap={{ scale: 0.92 }}
              ref={buttonRef}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
              aria-label="Open user menu"
              className="focus:outline-none"
            >
              <Avatar />
            </motion.button>
          ) : (
            <Avatar />
          )}
        </div>
      </div>
      {typeof document !== 'undefined' && createPortal(
      <AnimatePresence>
      {isDropdownOpen && onLogout && menuPos && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{ top: menuPos.top, right: menuPos.right }}
          className="fixed z-[70] w-64 max-w-[calc(100vw-1rem)] origin-top-right bg-white rounded-xl shadow-xl py-1 ring-1 ring-black ring-opacity-5 print:hidden"
          role="menu"
          aria-orientation="vertical"
          aria-label="User menu"
        >
          {/* Menu-styled branch row: neutral gray text like the rest of the menu,
              name visible at every width. Opening the switch panel closes this
              menu first so the two never stack. */}
          <div className="border-b border-gray-100">
            <BranchSwitcher variant="menu" onOpen={() => { setIsDropdownOpen(false); setBranchPanelOpen(true); }} />
          </div>
          {customId && (
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="text-xs text-gray-500 uppercase font-semibold">ID</span>
              <p className="text-sm font-mono text-gray-800 font-medium break-all">{customId}</p>
            </div>
          )}
          <div className="p-1">
            <button
              onClick={() => { setIsDropdownOpen(false); onLogout(); }}
              className="w-full min-h-11 flex items-center px-3 rounded-lg text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:bg-gray-100"
              role="menuitem"
            >
              <LogoutIcon className="mr-3 h-5 w-5 text-gray-500" />
              <span>Logout</span>
            </button>
          </div>
        </motion.div>
      )}
      </AnimatePresence>,
      document.body
      )}
      {branchPanelOpen && <BranchSwitcher variant="panel" open onClose={() => setBranchPanelOpen(false)} />}
    </header>
  );
};

export default Header;
