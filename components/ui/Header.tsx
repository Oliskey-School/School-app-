
import React, { useState } from 'react';
import { LogoutIcon, ChevronLeftIcon, NotificationIcon, SearchIcon } from '../../constants';

interface HeaderProps {
  title: string;
  avatarUrl: string;
  bgColor: string;
  onLogout?: () => void;
  onBack?: () => void;
  onNotificationClick?: () => void;
  notificationCount?: number;
  onSearchClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, avatarUrl, bgColor, onLogout, onBack, onNotificationClick, notificationCount, onSearchClick }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const Avatar = () => (
    <div className="w-10 h-10 sm:w-12 sm:w-12 rounded-full bg-white/30 p-1 flex-shrink-0">
      <img src={avatarUrl} alt="avatar" className="rounded-full w-full h-full object-cover" />
    </div>
  );

  return (
    <header className={`${bgColor} text-white px-3 sm:px-5 py-4 sm:py-5 pb-8 rounded-b-3xl relative z-10 print:hidden`}>
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          {onBack && (
            <button onClick={onBack} className="p-1.5 sm:p-2 -ml-2 rounded-full hover:bg-white/10 flex-shrink-0" aria-label="Go back">
              <ChevronLeftIcon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            </button>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold truncate">{title}</h1>
        </div>
        <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
          {onSearchClick && (
            <button onClick={onSearchClick} className="relative p-1.5 sm:p-2 rounded-full hover:bg-white/10" aria-label="Search">
              <SearchIcon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            </button>
          )}
          {onNotificationClick && (
            <button onClick={onNotificationClick} className="relative p-1.5 sm:p-2 rounded-full hover:bg-white/10" aria-label={`View notifications. ${notificationCount || 0} unread.`}>
              <div className="relative">
                <NotificationIcon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                {notificationCount !== undefined && notificationCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm border border-white pointer-events-none">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </div>
            </button>
          )}
          {onLogout ? (
            <button
              ref={buttonRef}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
              aria-label="Open user menu"
              className="focus:outline-none"
            >
              <Avatar />
            </button>
          ) : (
            <Avatar />
          )}
        </div>
      </div>
      {isDropdownOpen && onLogout && (
        <div
          ref={dropdownRef}
          className="absolute right-4 sm:right-6 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="user-menu-button"
        >
          <button
            onClick={onLogout}
            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            role="menuitem"
          >
            <LogoutIcon className="mr-3 h-5 w-5 text-gray-500" />
            <span>Logout</span>
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
