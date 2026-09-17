import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RotateCcw, Check, Layers, Square } from 'lucide-react';
import {
  GlassParams, Appearance, DEFAULTS, ACCENTS,
  applyAppearance, loadAppearance, saveAppearance, useScope,
} from './LiquidGlassControl';

/**
 * The in-Settings control UI for AppearanceSync's (LiquidGlassControl.tsx)
 * settings. Split into its own file so its framer-motion usage doesn't force
 * the whole library into the eager bundle — AppearanceSync itself (mounted at
 * the app root on every load) never touches framer-motion, only this panel
 * (mounted lazily, only when a user opens the Appearance settings screen) does.
 */

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

const AppearancePanel: React.FC = () => {
  const scope = useScope();
  const [a, setA] = useState<Appearance>(DEFAULTS);

  useEffect(() => {
    const init = loadAppearance(scope);
    setA(init);
    applyAppearance(init);
  }, [scope]);

  const save = useCallback((next: Appearance) => {
    applyAppearance(next);
    saveAppearance(next, scope);
    setA(next);
  }, [scope]);

  const update = (patch: Partial<Appearance>) => save({ ...a, ...patch });
  const updateGlass = (patch: Partial<GlassParams>) => save({ ...a, glass: { ...a.glass, ...patch } });

  const modeBtn = (active: boolean) =>
    `flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wide border transition-all ${
      active ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-900/20' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
    }`;

  return (
    <div className="max-w-xl mx-auto p-4 md:p-6">
      <div className="liquid-glass rounded-3xl p-5 md:p-7">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-900/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Appearance</h2>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Make the app yours</p>
          </div>
        </div>

        {/* Theme mode */}
        <div className="mt-6">
          <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">Theme</p>
          <div className="grid grid-cols-2 gap-2">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => update({ mode: 'normal' })} className={modeBtn(a.mode === 'normal')}>
              <Square className="w-4 h-4" /> Normal
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => update({ mode: 'glass' })} className={modeBtn(a.mode === 'glass')}>
              <Layers className="w-4 h-4" /> Liquid Glass
            </motion.button>
          </div>
        </div>

        {/* Accent colour — re-themes the whole app */}
        <div className="mt-6">
          <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">Accent colour</p>
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

        {/* Glass fine-tuning (glass mode only) */}
        <AnimatePresence>
        {a.mode === 'glass' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-6 pt-5 border-t border-gray-200/70 overflow-hidden">
            <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-3">Glass fine-tuning</p>
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
          onClick={() => save(DEFAULTS)}
          className="mt-6 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl bg-indigo-600 text-white text-[11px] font-black uppercase tracking-wide hover:bg-indigo-500 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset to default
        </motion.button>
      </div>
    </div>
  );
};

export default AppearancePanel;
