import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { toast } from 'react-hot-toast';
import { QRCodeCanvas } from 'qrcode.react';
import CenteredLoader from '../ui/CenteredLoader';
import {
    PlusIcon,
    SearchIcon,
    EditIcon,
    TrashIcon,
    QrCode,
    Download,
    Printer,
    MapPin
} from 'lucide-react';

interface Classroom {
    id: string;
    school_id: string;
    branch_id: string;
    name: string;
    description: string | null;
    capacity: number | null;
    qr_token: string;
    branch?: { name: string; code: string };
}

const ClassroomManagementScreen = () => {
    const { currentSchool } = useAuth();
    const { currentBranch, branches } = useBranch();
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editing, setEditing] = useState<Classroom | null>(null);
    const [qrRoom, setQrRoom] = useState<Classroom | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<{ name: string; description: string; capacity: string; branch_id: string }>({
        name: '', description: '', capacity: '', branch_id: ''
    });

    const fetchClassrooms = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get<Classroom[]>('/classrooms');
            setClassrooms(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching classrooms:', err);
            toast.error('Failed to load classrooms');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (currentSchool) fetchClassrooms();
    }, [currentSchool, currentBranch?.id, fetchClassrooms]);

    const openAdd = () => {
        setForm({ name: '', description: '', capacity: '', branch_id: currentBranch?.id || branches[0]?.id || '' });
        setIsAdding(true);
    };

    const openEdit = (room: Classroom) => {
        setForm({
            name: room.name,
            description: room.description || '',
            capacity: room.capacity != null ? String(room.capacity) : '',
            branch_id: room.branch_id
        });
        setEditing(room);
    };

    const handleSave = async () => {
        if (!form.name.trim()) { toast.error('Please enter a classroom name'); return; }
        if (!editing && !form.branch_id) { toast.error('Please select a branch'); return; }
        setSaving(true);
        try {
            if (editing) {
                await api.put(`/classrooms/${editing.id}`, {
                    name: form.name,
                    description: form.description,
                    capacity: form.capacity
                });
                toast.success('Classroom updated');
            } else {
                await api.post('/classrooms', {
                    name: form.name,
                    description: form.description,
                    capacity: form.capacity,
                    branch_id: form.branch_id
                });
                toast.success('Classroom created — QR code is ready to print');
            }
            setIsAdding(false);
            setEditing(null);
            fetchClassrooms();
        } catch (error: any) {
            console.error('Error saving classroom:', error);
            toast.error(error?.message || 'Failed to save classroom');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (room: Classroom) => {
        if (!window.confirm(`Delete "${room.name}"? Its printed QR code will stop working.`)) return;
        try {
            await api.delete(`/classrooms/${room.id}`);
            toast.success('Classroom deleted');
            fetchClassrooms();
        } catch (error: any) {
            console.error('Error deleting classroom:', error);
            toast.error(error?.message || 'Failed to delete classroom');
        }
    };

    const getQrDataUrl = (): string | null => {
        const canvas = document.querySelector<HTMLCanvasElement>('#classroom-qr-canvas canvas');
        return canvas ? canvas.toDataURL('image/png') : null;
    };

    const handleDownload = () => {
        if (!qrRoom) return;
        const url = getQrDataUrl();
        if (!url) { toast.error('QR code not ready yet'); return; }
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(qrRoom.branch?.code || 'BRANCH')}_${qrRoom.name.replace(/\s+/g, '-')}_QR.png`;
        a.click();
        toast.success('QR code downloaded');
    };

    const handlePrint = () => {
        if (!qrRoom) return;
        const url = getQrDataUrl();
        if (!url) { toast.error('QR code not ready yet'); return; }
        const win = window.open('', '_blank');
        if (!win) { toast.error('Please allow pop-ups to print'); return; }
        win.document.write(`
            <html>
            <head><title>${qrRoom.name} — Classroom QR</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 40px; }
                h1 { font-size: 28px; margin-bottom: 4px; }
                h2 { font-size: 18px; color: #555; font-weight: normal; margin-top: 0; }
                img { width: 360px; height: 360px; margin: 24px 0; }
                p { color: #777; font-size: 14px; }
                .frame { border: 3px solid #111; border-radius: 16px; display: inline-block; padding: 32px 48px; }
            </style></head>
            <body>
                <div class="frame">
                    <h1>${currentSchool?.name || 'School'}</h1>
                    <h2>${qrRoom.branch?.name ? qrRoom.branch.name + ' — ' : ''}${qrRoom.name}</h2>
                    <img src="${url}" alt="Classroom QR code" />
                    <p>Teachers: scan this code in the Oliskey app when your lesson starts and again when it ends.</p>
                </div>
                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `);
        win.document.close();
    };

    const filtered = classrooms.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 font-outfit">Classrooms & QR Codes</h1>
                    <p className="text-gray-500">Each classroom has a permanent QR code teachers scan to verify their lessons.</p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={openAdd}
                    className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm font-semibold"
                >
                    <PlusIcon className="w-5 h-5" />
                    <span>Add Classroom</span>
                </motion.button>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search classrooms..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
            </div>

            {loading ? (
                <CenteredLoader message="Loading classrooms..." className="py-12" />
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <QrCode className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="font-bold text-lg text-gray-900">No classrooms yet</h3>
                    <p className="text-gray-500 mt-1">Add your first classroom to generate its QR code.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((room, ri) => (
                        <motion.div key={room.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(ri, 12) * 0.04 }} whileHover={{ y: -2 }} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                                    <QrCode className="w-5 h-5" />
                                </div>
                                <div className="flex space-x-1">
                                    <button
                                        onClick={() => openEdit(room)}
                                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                                    >
                                        <EditIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(room)}
                                        className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold text-lg text-gray-900">{room.name}</h3>
                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {room.branch?.name || 'Branch'}
                                </p>
                                {room.description && <p className="text-sm text-gray-400 mt-1">{room.description}</p>}
                                {room.capacity != null && <p className="text-xs text-gray-400 mt-1">Capacity: {room.capacity}</p>}
                            </div>

                            <button
                                onClick={() => setQrRoom(room)}
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl font-semibold hover:bg-indigo-100 transition-colors"
                            >
                                <QrCode className="w-4 h-4" />
                                View QR Code
                            </button>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Add / Edit modal */}
            <AnimatePresence>
            {(isAdding || editing) && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ type: 'spring', stiffness: 400, damping: 32 }} className="bg-white rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl">
                        <h2 className="text-xl font-bold text-gray-900 font-outfit">
                            {editing ? 'Edit Classroom' : 'Add New Classroom'}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Classroom Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Room 12, Science Lab"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                />
                            </div>
                            {!editing && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Branch</label>
                                    <select
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={form.branch_id}
                                        onChange={e => setForm({ ...form, branch_id: e.target.value })}
                                    >
                                        <option value="">Select branch...</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Description (optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Ground Floor, Block A"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Capacity (optional)</label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={form.capacity}
                                    onChange={e => setForm({ ...form, capacity: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex space-x-3">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => { setIsAdding(false); setEditing(null); }}
                                className="flex-grow py-3 px-4 border border-gray-200 rounded-2xl text-gray-600 font-bold hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </motion.button>
                            <motion.button
                                whileHover={!saving ? { scale: 1.02 } : {}}
                                whileTap={!saving ? { scale: 0.98 } : {}}
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-grow py-3 px-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-60"
                            >
                                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create'}
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>

            {/* QR code modal */}
            <AnimatePresence>
            {qrRoom && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ type: 'spring', stiffness: 400, damping: 32 }} className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-2xl text-center">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 font-outfit">{qrRoom.name}</h2>
                            <p className="text-sm text-gray-500">{qrRoom.branch?.name || ''}</p>
                        </div>
                        <div id="classroom-qr-canvas" className="flex justify-center bg-white p-4 rounded-2xl border border-gray-100">
                            <QRCodeCanvas value={qrRoom.qr_token} size={240} level="M" includeMargin />
                        </div>
                        <p className="text-xs text-gray-400">
                            Print this code and paste it at the classroom entrance. Teachers scan it at the start and end of each lesson.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleDownload}
                                className="flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                Download
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handlePrint}
                                className="flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-colors"
                            >
                                <Printer className="w-4 h-4" />
                                Print
                            </motion.button>
                        </div>
                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setQrRoom(null)}
                            className="w-full py-3 border border-gray-200 rounded-2xl text-gray-600 font-bold hover:bg-gray-50 transition-colors"
                        >
                            Close
                        </motion.button>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
};

export default ClassroomManagementScreen;
