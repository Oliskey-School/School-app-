import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RotateCcw, Check, Layers, Square, CloudCheck, MonitorSmartphone, Bell, Home, MessageSquare, Settings, Wand2, Sun, Moon, Laptop } from 'lucide-react';
import {
  GlassParams, Appearance, DEFAULTS, DEFAULT_GLASS, ACCENTS,
  applyAppearance, loadAppearance, saveAppearance, useScope,
} from './LiquidGlassControl';
import { useAuth } from '../../context/AuthContext';
import { ColorScheme, applyColorScheme, getColorScheme, PREFERENCES_APPLIED_EVENT } from '../../lib/uiPreferences';

/**
 * Appearance & Theme — one screen shared by every role (admin, teacher,
 * parent, student). Split from LiquidGlassControl so its framer-motion usage
 * stays out of the eager bundle; AppearanceSync (mounted at the root) never
 * imports this file.
 *
 * Everything here applies live app-wide and is saved per account + role
 * (LiquidGlassControl.saveAppearance → lib/uiPreferences), so the same look
 * greets the person on their next device. Dark mode is one generated
 * stylesheet (styles/dark-theme.css) that re-colours every screen, so
 * Light / Dark / System is safe to offer everywhere.
 */

const GLASS_PRESETS: Record<string, { label: string; hint: string; glass: GlassParams }> = {
  subtle:   { label: 'Subtle',   hint: 'Light frost, calm',      glass: { blur: 10, opacity: 0.8,  sheen: 0.3,  saturate: 140, shadow: 0.06 } },
  balanced: { label: 'Balanced', hint: 'The default look',       glass: DEFAULT_GLASS },
  vivid:    { label: 'Vivid',    hint: 'Deeper blur, more shine', glass: { blur: 28, opacity: 0.5,  sheen: 0.8,  saturate: 210, shadow: 0.2 } },
};

const presetOf = (g: GlassParams) =>
  Object.entries(GLASS_PRESETS).find(([, p]) => (Object.keys(p.glass) as (keyof GlassParams)[]).every((k) => Math.abs(p.glass[k] - g[k]) < 1e-6))?.[0] || 'custom';

const Slider: React.FC<{
  label: string; min: number; max: number; step: number; value: number; display: string; onChange: (v: number) => void;
}> = ({ label, min, max, step, value, display, onChange }) => (
  <div className="mb-3">
    <div className="flex items-center justify-between mb-1">
      <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">{label}</span>
      <span className="text-[11px] font-black text-indigo-700 tabular-nums">{display}</span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full accent-indigo-600 h-1.5 cursor-pointer" aria-label={label}
    />
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode; hint?: string }> = ({ children, hint }) => (
  <div className="flex items-baseline justify-between mb-2">
    <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest">{children}</p>
    {hint && <span className="text-[10px] text-gray-400">{hint}</span>}
  </div>
);

/** A miniature of the app drawn with the live accent variables, so the effect
 *  of every choice is visible in one place before scrolling around the app. */
const LivePreview: React.FC<{ a: Appearance; roleLabel: string }> = ({ a, roleLabel }) => {
  const surface = a.mode === 'glass' ? 'liquid-glass' : 'bg-white border border-gray-200';
  return (
    <div className={`rounded-2xl p-3 ${surface}`} aria-label="Preview of your look">
      <div className="rounded-xl p-3 text-white" style={{ background: 'linear-gradient(135deg, rgb(var(--accent-600)), rgb(var(--accent-500)))' }}>
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{roleLabel} Dashboard</p>
        <p className="text-sm font-black">Good morning</p>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <span className="px-3 py-1.5 rounded-full text-[11px] font-bold text-white" style={{ background: 'rgb(var(--accent-600))' }}>Primary action</span>
        <span className="px-3 py-1.5 rounded-full text-[11px] font-bold accent-tint-chip">Highlight</span>
        <span className="ml-auto w-7 h-7 rounded-full flex items-center justify-center text-white" style={{ background: 'rgb(var(--accent-500))' }}><Bell className="w-3.5 h-3.5" /></span>
      </div>
      <div className="grid grid-cols-4 gap-1 mt-3 pt-2 border-t border-gray-200/60">
        {[['Home', Home], ['Messages', MessageSquare], ['Settings', Settings]].map(([label, Icon]: any, i) => (
          <div key={label} className="flex flex-col items-center gap-0.5 text-[9px] font-semibold" style={{ color: i === 0 ? 'rgb(var(--accent-600))' : '#9ca3af' }}>
            <Icon className="w-3.5 h-3.5" />{label}
          </div>
        ))}
        <div className="flex flex-col items-center gap-0.5 text-[9px] font-semibold text-gray-400"><Sparkles className="w-3.5 h-3.5" />More</div>
      </div>
    </div>
  );
};

const AppearancePanel: React.FC = () => {
  const scope = useScope();
  const auth = useAuth() as any;
  const isDemo = !!auth?.isDemo;
  const roleLabel = String(auth?.role || 'Your').replace(/^\w/, (c: string) => c.toUpperCase());
  const [a, setA] = useState<Appearance>(DEFAULTS);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [scheme, setScheme] = useState<ColorScheme>(() => getColorScheme());
  useEffect(() => {
    const onApplied = () => setScheme(getColorScheme());
    window.addEventListener(PREFERENCES_APPLIED_EVENT, onApplied);
    return () => window.removeEventListener(PREFERENCES_APPLIED_EVENT, onApplied);
  }, []);
  const chooseScheme = (next: ColorScheme) => { applyColorScheme(next, { sync: !isDemo }); setScheme(next); setSavedAt(Date.now()); };

  useEffect(() => {
    const init = loadAppearance(scope);
    setA(init);
    applyAppearance(init);
  }, [scope]);

  const save = useCallback((next: Appearance) => {
    applyAppearance(next);
    saveAppearance(next, scope);
    setA(next);
    setSavedAt(Date.now());
  }, [scope]);

  const update = (patch: Partial<Appearance>) => save({ ...a, ...patch });
  const updateGlass = (patch: Partial<GlassParams>) => save({ ...a, glass: { ...a.glass, ...patch } });
  const isDefault = JSON.stringify(a) === JSON.stringify(DEFAULTS) && scheme === 'light';
  const preset = presetOf(a.glass);

  const modeBtn = (active: boolean) =>
    `flex flex-col items-start gap-1 px-4 py-3 rounded-2xl text-left border transition-all ${
      active ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-900/20' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
    }`;
  const chip = (active: boolean) =>
    `px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide border transition-all ${
      active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
    }`;

  return (
    <div className="max-w-xl mx-auto p-4 md:p-6 space-y-4">
      <div className="liquid-glass rounded-3xl p-5 md:p-7">
        {/* Header + sync status */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-900/20 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Appearance</h2>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Make the app yours</p>
          </div>
        </div>
        <div className={`mt-4 flex items-center gap-2 rounded-2xl px-3 py-2 text-[11px] font-semibold ${isDemo ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
          {isDemo ? <MonitorSmartphone className="w-4 h-4 shrink-0" /> : <CloudCheck className="w-4 h-4 shrink-0" />}
          <span>
            {isDemo
              ? 'Demo mode: your look is kept on this device only.'
              : savedAt
                ? 'Saved to your account — it will follow you to any device you sign in on.'
                : 'Choices are saved to your account and follow you to every device.'}
          </span>
        </div>

        {/* Live preview */}
        <div className="mt-6">
          <SectionTitle hint="updates as you choose">Preview</SectionTitle>
          <LivePreview a={a} roleLabel={roleLabel} />
        </div>

        {/* Theme mode */}
        <div className="mt-6">
          <SectionTitle>Theme</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => update({ mode: 'normal' })} className={modeBtn(a.mode === 'normal')} aria-pressed={a.mode === 'normal'}>
              <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide"><Square className="w-4 h-4" /> Normal</span>
              <span className={`text-[10px] ${a.mode === 'normal' ? 'text-white/80' : 'text-gray-400'}`}>Solid panels, fastest on older phones</span>
            </motion.button>
            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => update({ mode: 'glass' })} className={modeBtn(a.mode === 'glass')} aria-pressed={a.mode === 'glass'}>
              <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide"><Layers className="w-4 h-4" /> Liquid Glass</span>
              <span className={`text-[10px] ${a.mode === 'glass' ? 'text-white/80' : 'text-gray-400'}`}>Frosted, translucent panels</span>
            </motion.button>
          </div>
        </div>

        {/* Colour scheme — html.dark + styles/dark-theme.css re-colour every screen */}
        <div className="mt-6">
          <SectionTitle hint={scheme === 'system' ? 'follows your device' : undefined}>Colour scheme</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            {([['light', 'Light', Sun], ['dark', 'Dark', Moon], ['system', 'System', Laptop]] as const).map(([key, label, Icon]) => (
              <motion.button key={key} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => chooseScheme(key)} aria-pressed={scheme === key}
                className={`flex items-center justify-center gap-2 px-3 py-3 rounded-2xl text-xs font-black uppercase tracking-wide border transition-all ${scheme === key ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-900/20' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                <Icon className="w-4 h-4" /> {label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Accent colour — re-themes the whole app */}
        <div className="mt-6">
          <SectionTitle hint={ACCENTS[a.accent]?.label}>Accent colour</SectionTitle>
          <div className="flex flex-wrap gap-2.5">
            {Object.entries(ACCENTS).map(([key, { label, swatch }]) => {
              const active = a.accent === key;
              return (
                <motion.button
                  key={key}
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                  onClick={() => update({ accent: key })}
                  title={label}
                  aria-label={label}
                  aria-pressed={active}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: swatch, boxShadow: active ? `0 0 0 2px #fff, 0 0 0 4px ${swatch}` : 'none' }}
                >
                  {active && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                </motion.button>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-400 mt-2">Changes every button, tab and highlight across the whole app.</p>
        </div>

        {/* Glass presets + fine-tuning (glass mode only) */}
        <AnimatePresence>
        {a.mode === 'glass' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-6 pt-5 border-t border-gray-200/70 overflow-hidden">
            <SectionTitle hint={preset === 'custom' ? 'Custom' : GLASS_PRESETS[preset].hint}>Glass style</SectionTitle>
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(GLASS_PRESETS).map(([key, p]) => (
                <button key={key} onClick={() => update({ glass: p.glass })} className={chip(preset === key)} aria-pressed={preset === key}>
                  <Wand2 className="w-3 h-3 inline mr-1 -mt-0.5" />{p.label}
                </button>
              ))}
            </div>
            <SectionTitle>Fine-tuning</SectionTitle>
            <Slider label="Blur" min={0} max={40} step={1} value={a.glass.blur} display={`${a.glass.blur}px`} onChange={(v) => updateGlass({ blur: v })} />
            <Slider label="Frost" min={0.3} max={0.95} step={0.01} value={a.glass.opacity} display={`${Math.round(a.glass.opacity * 100)}%`} onChange={(v) => updateGlass({ opacity: v })} />
            <Slider label="Sheen" min={0} max={1} step={0.01} value={a.glass.sheen} display={`${Math.round(a.glass.sheen * 100)}%`} onChange={(v) => updateGlass({ sheen: v })} />
            <Slider label="Vividness" min={100} max={220} step={5} value={a.glass.saturate} display={`${a.glass.saturate}%`} onChange={(v) => updateGlass({ saturate: v })} />
            <Slider label="Depth" min={0} max={0.3} step={0.01} value={a.glass.shadow} display={`${Math.round(a.glass.shadow * 100)}%`} onChange={(v) => updateGlass({ shadow: v })} />
          </motion.div>
        )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          onClick={() => { save(DEFAULTS); chooseScheme('light'); }}
          disabled={isDefault}
          className="mt-6 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl bg-indigo-600 text-white text-[11px] font-black uppercase tracking-wide hover:bg-indigo-500 transition-colors disabled:opacity-40 disabled:cursor-default"
        >
          <RotateCcw className="w-3.5 h-3.5" /> {isDefault ? 'Default look in use' : 'Reset to default'}
        </motion.button>
      </div>
    </div>
  );
};

export default AppearancePanel;
