import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, Save, ArrowLeft, GraduationCap } from 'lucide-react';
import { api } from '../../lib/api';
import { useIsMainAdmin } from '../../hooks/useIsMainAdmin';

interface Term { name: string; order: number; }
interface Band { min: number; max: number; grade: string; remark: string; }
interface Grading { ca_percent: number; exam_percent: number; bands: Band[]; }

/**
 * Configurable academics editor. The main Admin edits the SCHOOL default (and can also
 * switch to a branch); a branch Admin edits only their own branch. Saved terms drive the
 * report-card/gradebook term list, and the grading bands drive computed grades.
 */
const BranchAcademicsScreen: React.FC<any> = ({ handleBack, navigateTo }) => {
    const isMain = useIsMainAdmin();
    const [scope, setScope] = useState<'school' | 'branch'>(isMain ? 'school' : 'branch');
    const [terms, setTerms] = useState<Term[]>([]);
    const [grading, setGrading] = useState<Grading>({ ca_percent: 0.4, exam_percent: 0.6, bands: [] });
    const [source, setSource] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const data = await api.getAcademicSettings(scope);
            setTerms((data.terms || []).map((t: any, i: number) => ({ name: t.name, order: t.order ?? i + 1 })));
            setGrading({
                ca_percent: data.grading?.ca_percent ?? 0.4,
                exam_percent: data.grading?.exam_percent ?? 0.6,
                bands: data.grading?.bands || [],
            });
            setSource(data.source || '');
        } catch {
            toast.error('Could not load academic settings.');
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); /* eslint-disable-next-line */ }, [scope]);

    const save = async () => {
        if (Math.round((grading.ca_percent + grading.exam_percent) * 100) !== 100) {
            toast.error('CA % and Exam % must add up to 100%.');
            return;
        }
        setSaving(true);
        try {
            await api.saveAcademicSettings({ scope, terms: terms.map((t, i) => ({ name: t.name, order: i + 1 })), grading });
            toast.success(scope === 'school' ? 'School academic settings saved.' : 'Branch academic settings saved.');
            load();
        } catch (e: any) {
            toast.error(e?.message || 'Save failed.');
        } finally {
            setSaving(false);
        }
    };

    const goBack = () => handleBack ? handleBack() : navigateTo?.('overview', 'Admin Dashboard');

    if (loading) return <div className="flex items-center justify-center min-h-[50vh] text-slate-500">Loading academic settings…</div>;

    return (
        <div className="w-full p-4 sm:p-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-5">
                <button onClick={goBack} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-indigo-300">
                    <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center"><GraduationCap className="h-5 w-5 text-indigo-600" /></div>
                    <div>
                        <h1 className="text-lg sm:text-xl font-bold text-slate-900">Terms & Grading</h1>
                        <p className="text-xs text-slate-500">Set the academic terms and grading scale.</p>
                    </div>
                </div>
            </div>

            {/* Scope: main admin chooses school default vs this branch */}
            {isMain && (
                <div className="inline-flex rounded-xl bg-slate-100 p-1 mb-4">
                    {(['school', 'branch'] as const).map(s => (
                        <button key={s} onClick={() => setScope(s)}
                            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition ${scope === s ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>
                            {s === 'school' ? 'School default' : 'This branch'}
                        </button>
                    ))}
                </div>
            )}
            {scope === 'branch' && source !== 'branch' && (
                <p className="mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    This branch currently inherits the {source === 'school' ? 'school default' : 'standard'} settings. Saving here creates a branch-specific override.
                </p>
            )}

            {/* Terms */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 mb-5">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-bold text-slate-800">Academic Terms</h2>
                    <button onClick={() => setTerms(t => [...t, { name: `Term ${t.length + 1}`, order: t.length + 1 }])}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                        <Plus className="h-4 w-4" /> Add term
                    </button>
                </div>
                <div className="space-y-2">
                    {terms.map((t, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 w-6">{i + 1}.</span>
                            <input value={t.name} onChange={e => setTerms(ts => ts.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                            <button onClick={() => setTerms(ts => ts.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                        </div>
                    ))}
                    {terms.length === 0 && <p className="text-xs text-slate-400">No terms yet — add at least one.</p>}
                </div>
            </div>

            {/* Grading */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 mb-5">
                <h2 className="font-bold text-slate-800 mb-3">Grading Scale</h2>
                <div className="flex flex-wrap gap-4 mb-4">
                    <label className="text-sm text-slate-600">CA %
                        <input type="number" value={Math.round(grading.ca_percent * 100)} onChange={e => setGrading(g => ({ ...g, ca_percent: (Number(e.target.value) || 0) / 100 }))}
                            className="ml-2 w-20 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-sm" />
                    </label>
                    <label className="text-sm text-slate-600">Exam %
                        <input type="number" value={Math.round(grading.exam_percent * 100)} onChange={e => setGrading(g => ({ ...g, exam_percent: (Number(e.target.value) || 0) / 100 }))}
                            className="ml-2 w-20 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-sm" />
                    </label>
                </div>
                <div className="grid grid-cols-[1fr_1fr_1fr_2fr_auto] gap-2 text-[11px] font-bold uppercase text-slate-400 px-1 mb-1">
                    <span>Min</span><span>Max</span><span>Grade</span><span>Remark</span><span></span>
                </div>
                <div className="space-y-2">
                    {grading.bands.map((b, i) => (
                        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_2fr_auto] gap-2 items-center">
                            <input type="number" value={b.min} onChange={e => setGrading(g => ({ ...g, bands: g.bands.map((x, j) => j === i ? { ...x, min: Number(e.target.value) } : x) }))} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm" />
                            <input type="number" value={b.max} onChange={e => setGrading(g => ({ ...g, bands: g.bands.map((x, j) => j === i ? { ...x, max: Number(e.target.value) } : x) }))} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm" />
                            <input value={b.grade} onChange={e => setGrading(g => ({ ...g, bands: g.bands.map((x, j) => j === i ? { ...x, grade: e.target.value } : x) }))} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm" />
                            <input value={b.remark} onChange={e => setGrading(g => ({ ...g, bands: g.bands.map((x, j) => j === i ? { ...x, remark: e.target.value } : x) }))} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm" />
                            <button onClick={() => setGrading(g => ({ ...g, bands: g.bands.filter((_, j) => j !== i) }))} className="text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                        </div>
                    ))}
                </div>
                <button onClick={() => setGrading(g => ({ ...g, bands: [...g.bands, { min: 0, max: 0, grade: '', remark: '' }] }))}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                    <Plus className="h-4 w-4" /> Add grade band
                </button>
            </div>

            <button onClick={save} disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:bg-slate-300">
                <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
            </button>
        </div>
    );
};

export default BranchAcademicsScreen;
