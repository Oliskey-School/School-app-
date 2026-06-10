import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Globe, Check, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../../lib/i18n/languages';
import { setAppLanguage } from '../../lib/i18n';
import { api } from '../../lib/api';

interface LanguageSwitcherProps {
  /** 'button' = compact globe pill (login/topbar); 'inline' = full-width settings row. */
  variant?: 'button' | 'inline';
  /** Persist the choice to the signed-in user's account (best-effort). */
  persistToAccount?: boolean;
  className?: string;
}

/**
 * Lets any user pick their language anywhere in the world. Applies instantly,
 * remembers the choice on the device, and (when signed in) saves it to the account
 * so it follows them across devices. RTL languages flip the whole layout.
 */
const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'button',
  persistToAccount = false,
  className = '',
}) => {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const current = useMemo(() => {
    const code = i18n.language;
    return (
      LANGUAGES.find((l) => l.code === code) ||
      LANGUAGES.find((l) => l.code === code?.split('-')[0]) ||
      LANGUAGES[0]
    );
  }, [i18n.language]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const choose = async (code: string) => {
    await setAppLanguage(code);
    setOpen(false);
    setQuery('');
    if (persistToAccount) {
      try { await api.updatePreferredLanguage(code); } catch { /* best-effort */ }
    }
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t('common.selectLanguage')}
        className={
          variant === 'inline'
            ? 'flex items-center justify-between w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-slate-700 hover:bg-gray-50 transition'
            : 'flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur border border-gray-200 rounded-full text-slate-700 hover:bg-white shadow-sm transition'
        }
      >
        <span className="flex items-center gap-2">
          <Globe size={18} className="text-indigo-600" />
          <span className="text-sm font-medium">{current.nativeName}</span>
        </span>
        {variant === 'inline' && <span className="text-xs text-slate-400">{t('common.language')}</span>}
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-2 w-64 max-h-80 overflow-hidden bg-white border border-gray-200 rounded-xl shadow-2xl ${
            variant === 'inline' ? 'left-0' : 'right-0'
          }`}
        >
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <Search size={15} className="text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('common.search')}
              className="w-full text-sm outline-none bg-transparent text-slate-700"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.map((l) => {
              const active = l.code === current.code;
              return (
                <li key={l.code}>
                  <button
                    type="button"
                    onClick={() => choose(l.code)}
                    className={`flex items-center justify-between w-full px-3 py-2 text-left text-sm hover:bg-indigo-50 transition ${
                      active ? 'text-indigo-700 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <span className="flex flex-col">
                      <span>{l.nativeName}</span>
                      <span className="text-xs text-slate-400">{l.name}{l.rtl ? ' • RTL' : ''}</span>
                    </span>
                    {active && <Check size={16} className="text-indigo-600" />}
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-sm text-slate-400 text-center">—</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
