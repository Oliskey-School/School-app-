import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { ElearningIcon, BookOpenIcon, SearchIcon, PlusIcon, TrashIcon, ChevronRightIcon } from '../../constants';
import { LEARNING_HUB_LEVELS, LEARNING_HUB_SUBJECTS } from '../shared/learningHubConstants';

interface LearningHubManagementScreenProps {
  navigateTo: (view: string, title: string, props?: any) => void;
}

const RESOURCE_KINDS = ['lesson', 'worksheet', 'practice_question', 'quiz', 'flashcard', 'video', 'reading', 'story_book', 'past_question', 'simulation', 'revision_notes', 'game'];

const emptyForm = { title: '', description: '', url: '', grade_level: LEARNING_HUB_LEVELS[0], subject: LEARNING_HUB_SUBJECTS[0], resource_kind: 'lesson', source_name: '' };

const LearningHubManagementScreen: React.FC<LearningHubManagementScreenProps> = ({ navigateTo }) => {
  const [level, setLevel] = useState('');
  const [subject, setSubject] = useState('');
  const [search, setSearch] = useState('');
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getLearningHubResources({ grade_level: level || undefined, subject: subject || undefined, search: search || undefined });
      setResources(Array.isArray(res) ? res : []);
    } catch {
      toast.error('Could not load Learning Hub resources');
    } finally {
      setLoading(false);
    }
  }, [level, subject, search]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.url) { toast.error('Title and URL are required'); return; }
    setSaving(true);
    try {
      await api.createLearningHubResource({ ...form, type: 'link', category: form.resource_kind, tags: [form.grade_level, form.subject] });
      toast.success('Resource added to the Learning Hub');
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch {
      toast.error('Could not create resource');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteLearningHubResource(id);
      setResources(prev => prev.filter(r => r.id !== id));
      toast.success('Resource removed');
    } catch {
      toast.error('Could not delete resource');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <main className="flex-grow p-4 space-y-4 overflow-y-auto pb-10">
        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200 flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-xl text-indigo-700">
            <ElearningIcon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-indigo-800">Learning Hub — Curation</h3>
            <p className="text-sm text-indigo-700">Curate free/OER resources students see, by level and subject.</p>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowForm(v => !v)}
          className="w-full py-3 bg-indigo-700 text-white rounded-xl font-bold shadow-md flex items-center justify-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          {showForm ? 'Cancel' : 'Add Resource'}
        </motion.button>

        <AnimatePresence>
          {showForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              onSubmit={handleCreate}
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3 overflow-hidden"
            >
              <input required placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <input required placeholder="URL (https://...)" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" rows={2} />
              <input placeholder="Source (e.g. Khan Academy)" value={form.source_name} onChange={e => setForm(f => ({ ...f, source_name: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <select value={form.grade_level} onChange={e => setForm(f => ({ ...f, grade_level: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  {LEARNING_HUB_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  {LEARNING_HUB_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <select value={form.resource_kind} onChange={e => setForm(f => ({ ...f, resource_kind: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                {RESOURCE_KINDS.map(k => <option key={k} value={k}>{k.replace('_', ' ')}</option>)}
              </select>
              <button type="submit" disabled={saving} className="w-full py-2.5 bg-indigo-700 text-white rounded-lg font-bold disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Resource'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="relative">
          <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources..."
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setLevel('')} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${level === '' ? 'bg-indigo-700 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>All Levels</button>
          {LEARNING_HUB_LEVELS.map(l => (
            <button key={l} onClick={() => setLevel(l)} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${level === l ? 'bg-indigo-700 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>{l}</button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setSubject('')} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${subject === '' ? 'bg-indigo-700 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>All Subjects</button>
          {LEARNING_HUB_SUBJECTS.map(s => (
            <button key={s} onClick={() => setSubject(s)} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${subject === s ? 'bg-indigo-700 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>{s}</button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3 pt-2">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-gray-100" />)}</div>
        ) : resources.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-gray-200">
            <BookOpenIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 font-bold">No resources yet.</p>
          </div>
        ) : (
          <div className="space-y-2 pt-2">
            {resources.map((resource, i) => (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(i, 8) * 0.03 }}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3"
              >
                <button
                  onClick={() => navigateTo('learningHubResource', resource.title, { url: resource.url, title: resource.title, sourceName: resource.source_name, themeColor: 'indigo' })}
                  className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center flex-shrink-0"
                >
                  <BookOpenIcon className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{resource.title}</p>
                  <p className="text-xs text-gray-500 truncate">{resource.grade_level} · {resource.subject} · {resource.source_name}</p>
                </div>
                <button onClick={() => handleDelete(resource.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default LearningHubManagementScreen;
