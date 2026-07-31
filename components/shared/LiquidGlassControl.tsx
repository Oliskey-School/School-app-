import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RotateCcw, Check, Layers, Square } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * Appearance — the in-Settings control for the app's look.
 *
 * Lets each user pick:
 *  • Theme  — "Normal" (solid, original) vs "Liquid Glass" (frosted iOS material)
 *  • Accent — re-themes EVERY accent across the whole app at once (via --accent-* vars)
 *  • Glass fine-tuning — blur / frost / sheen / vividness / depth (--lg-* vars)
 *
 * Choices persist to the device. Mount inside a settings screen (renders inline).
 */

export type GlassParams = { blur: number; opacity: number; sheen: number; saturate: number; shadow: number };
export type Appearance = { mode: 'normal' | 'glass'; accent: string; glass: GlassParams };

const DEFAULT_GLASS: GlassParams = { blur: 18, opacity: 0.62, sheen: 0.55, saturate: 180, shadow: 0.12 };
const DEFAULTS: Appearance = { mode: 'glass', accent: 'indigo', glass: DEFAULT_GLASS };
const KEY_BASE = 'oliskey:appearance';
/** Per-user (+role) storage key, so each person's look is isolated — even on a
 *  shared device, Teacher A's choice never affects Teacher B or a student. */
const scopeKey = (scope: string) => `${KEY_BASE}:${scope || 'guest'}`;

const SHADE_KEYS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

/** Accent palettes (Tailwind ramps) as "R G B" triplets, shades 50..950. */
const ACCENTS: Record<string, { label: string; swatch: string; shades: string[] }> = {
  indigo:  { label: 'Indigo',  swatch: '#4f46e5', shades: ['238 242 255', '224 231 255', '199 210 254', '165 180 252', '129 140 248', '99 102 241', '79 70 229', '67 56 202', '55 48 163', '49 46 129', '30 27 75'] },
  blue:    { label: 'Blue',    swatch: '#2563eb', shades: ['239 246 255', '219 234 254', '191 219 254', '147 197 253', '96 165 250', '59 130 246', '37 99 235', '29 78 216', '30 64 175', '30 58 138', '23 37 84'] },
  violet:  { label: 'Violet',  swatch: '#7c3aed', shades: ['245 243 255', '237 233 254', '221 214 254', '196 181 253', '167 139 250', '139 92 246', '124 58 237', '109 40 217', '91 33 182', '76 29 149', '46 16 101'] },
  emerald: { label: 'Emerald', swatch: '#059669', shades: ['236 253 245', '209 250 229', '167 243 208', '110 231 183', '52 211 153', '16 185 129', '5 150 105', '4 120 87', '6 95 70', '6 78 59', '2 44 34'] },
  rose:    { label: 'Rose',    swatch: '#e11d48', shades: ['255 241 242', '255 228 230', '254 205 211', '253 164 175', '251 113 133', '244 63 94', '225 29 72', '190 18 60', '159 18 57', '136 19 55', '76 5 25'] },
  amber:   { label: 'Amber',   swatch: '#d97706', shades: ['255 251 235', '254 243 199', '253 230 138', '252 211 77', '251 191 36', '245 158 11', '217 119 6', '180 83 9', '146 64 14', '120 53 15', '69 26 3'] },
  teal:    { label: 'Teal',    swatch: '#0d9488', shades: ['240 253 250', '204 251 241', '153 246 228', '94 234 212', '45 212 191', '20 184 166', '13 148 136', '15 118 110', '17 94 89', '19 78 74', '4 47 46'] },
  slate:   { label: 'Graphite',swatch: '#475569', shades: ['248 250 252', '241 245 249', '226 232 240', '203 213 225', '148 163 184', '100 116 139', '71 85 105', '51 65 85', '30 41 59', '15 23 42', '2 6 23'] },
};

function applyAppearance(a: Appearance) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('glass', a.mode === 'glass');
  const shades = (ACCENTS[a.accent] || ACCENTS.indigo).shades;
  SHADE_KEYS.forEach((k, i) => root.style.setProperty(`--accent-${k}`, shades[i]));
  const g = a.glass;
  root.style.setProperty('--lg-blur', `${g.blur}px`);
  root.style.setProperty('--lg-opacity', `${g.opacity}`);
  root.style.setProperty('--lg-sheen', `${g.sheen}`);
  root.style.setProperty('--lg-saturate', `${g.saturate}%`);
  root.style.setProperty('--lg-shadow', `${g.shadow}`);
}

function loadAppearance(scope: string): Appearance {
  try {
    const raw = localStorage.getItem(scopeKey(scope));
    if (raw) {
      const p = JSON.parse(raw);
      return {
        mode: p.mode === 'normal' ? 'normal' : 'glass',
        accent: ACCENTS[p.accent] ? p.accent : 'indigo',
        glass: { ...DEFAULT_GLASS, ...(p.glass || {}) },
      };
    }
  } catch { /* ignore */ }
  return DEFAULTS;
}

function saveAppearance(a: Appearance, scope: string) {
  try { localStorage.setItem(scopeKey(scope), JSON.stringify(a)); } catch { /* ignore */ }
}

/** Apply one specific user's saved look. */
export function applyScopedAppearance(scope: string) {
  applyAppearance(loadAppearance(scope));
}

/** App start (before login): apply the neutral default so nobody inherits the
 *  previous user's look on a shared device. The signed-in user's own choice is
 *  applied by <AppearanceSync /> once their identity is known. */
export function initLiquidGlass() {
  applyAppearance(DEFAULTS);
}

/** Per-user + per-role scope. */
function useScope(): string {
  const auth = useAuth() as any;
  return `${auth?.user?.id || 'guest'}:${auth?.role || ''}`;
}

/** Invisible helper: applies the signed-in user's saved appearance, and re-applies
 *  it whenever the user (or role) changes — so each person only sees their own look. */
export const AppearanceSync: React.FC = () => {
  const scope = useScope();
  useEffect(() => { applyScopedAppearance(scope); }, [scope]);
  return null;
};

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
