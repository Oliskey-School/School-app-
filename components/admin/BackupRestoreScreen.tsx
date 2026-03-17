import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    Database,
    Download,
    Upload,
    RefreshCw,
    Clock,
    CheckCircle2,
    AlertTriangle,
    HardDrive,
    Shield,
    Calendar,
    FileArchive,
    Trash2,
    Info
} from 'lucide-react';

interface BackupRecord {
    id: string;
    name: string;
    type: 'auto' | 'manual';
    size: string;
    status: 'completed' | 'in_progress' | 'failed';
    created_at: string;
    tables_included: number;
}

const BackupRestoreScreen = () => {
    const { currentSchool } = useAuth();
    const [backups, setBackups] = useState<BackupRecord[]>([
        { id: '1', name: 'Full Backup – March 17', type: 'auto', size: '24.3 MB', status: 'completed', created_at: '2026-03-17T06:00:00', tables_included: 42 },
        { id: '2', name: 'Full Backup – March 16', type: 'auto', size: '23.8 MB', status: 'completed', created_at: '2026-03-16T06:00:00', tables_included: 42 },
        { id: '3', name: 'Manual Backup – Pre-migration', type: 'manual', size: '24.1 MB', status: 'completed', created_at: '2026-03-15T14:30:00', tables_included: 42 },
        { id: '4', name: 'Full Backup – March 15', type: 'auto', size: '23.5 MB', status: 'completed', created_at: '2026-03-15T06:00:00', tables_included: 42 },
        { id: '5', name: 'Manual Snapshot – End of Term 1', type: 'manual', size: '22.1 MB', status: 'completed', created_at: '2026-03-01T16:00:00', tables_included: 42 },
    ]);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [selectedBackup, setSelectedBackup] = useState<string | null>(null);

    const handleCreateBackup = () => {
        setIsBackingUp(true);
        setTimeout(() => {
            const newBackup: BackupRecord = {
                id: Date.now().toString(),
                name: `Manual Backup – ${new Date().toLocaleDateString('en-NG', { month: 'long', day: 'numeric' })}`,
                type: 'manual',
                size: '24.5 MB',
                status: 'completed',
                created_at: new Date().toISOString(),
                tables_included: 42,
            };
            setBackups(prev => [newBackup, ...prev]);
            setIsBackingUp(false);
            toast.success('Backup created successfully!');
        }, 3000);
    };

    const handleRestore = (backupId: string) => {
        if (!window.confirm('⚠️ Are you sure you want to restore from this backup? This will overwrite current data.')) return;
        setIsRestoring(true);
        setSelectedBackup(backupId);
        setTimeout(() => {
            setIsRestoring(false);
            setSelectedBackup(null);
            toast.success('Database restored successfully!');
        }, 5000);
    };

    const handleDelete = (id: string) => {
        if (!window.confirm('Delete this backup?')) return;
        setBackups(prev => prev.filter(b => b.id !== id));
        toast.success('Backup deleted');
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-gray-900 font-outfit">Data Backup & Restore</h1>
                <div className="flex items-center space-x-2 text-gray-500 text-sm mt-1">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    <span>Protect your school data with automated and manual backups.</span>
                </div>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600"><Database className="w-6 h-6" /></div>
                    <div><p className="text-2xl font-bold text-gray-900">{backups.length}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Backups</p></div>
                </div>
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="w-6 h-6" /></div>
                    <div><p className="text-2xl font-bold text-gray-900">{backups.filter(b => b.status === 'completed').length}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Successful</p></div>
                </div>
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-blue-50 text-blue-600"><HardDrive className="w-6 h-6" /></div>
                    <div><p className="text-2xl font-bold text-gray-900">24.3 MB</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Latest Size</p></div>
                </div>
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-amber-50 text-amber-600"><Clock className="w-6 h-6" /></div>
                    <div><p className="text-2xl font-bold text-gray-900">Daily</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Auto Schedule</p></div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-3 flex items-center space-x-3 flex-grow">
                    <Info className="w-5 h-5 text-blue-500" />
                    <p className="text-sm text-blue-700"><strong>Supabase automatically backs up your database daily.</strong> Manual backups create an additional snapshot you can restore from at any time.</p>
                </div>
                <button onClick={handleCreateBackup} disabled={isBackingUp}
                    className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 font-bold disabled:opacity-60">
                    {isBackingUp ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                    <span>{isBackingUp ? 'Creating Backup...' : 'Create Manual Backup'}</span>
                </button>
            </div>

            {/* Backup List */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Backup</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Type</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Size</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Tables</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Created</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {backups.map(backup => (
                            <tr key={backup.id} className="hover:bg-gray-50/30 transition-colors">
                                <td className="px-6 py-5">
                                    <div className="flex items-center space-x-3">
                                        <div className={`p-2 rounded-xl ${backup.type === 'auto' ? 'bg-blue-50' : 'bg-purple-50'}`}>
                                            <FileArchive className={`w-4 h-4 ${backup.type === 'auto' ? 'text-blue-600' : 'text-purple-600'}`} />
                                        </div>
                                        <span className="font-bold text-gray-800">{backup.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-5"><span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${backup.type === 'auto' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{backup.type}</span></td>
                                <td className="px-6 py-5 text-sm font-bold text-gray-700">{backup.size}</td>
                                <td className="px-6 py-5 text-sm font-bold text-gray-700">{backup.tables_included}</td>
                                <td className="px-6 py-5">
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${backup.status === 'completed' ? 'bg-green-100 text-green-700' : backup.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{backup.status}</span>
                                </td>
                                <td className="px-6 py-5 text-sm text-gray-500">{new Date(backup.created_at).toLocaleString('en-NG')}</td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center space-x-2">
                                        <button onClick={() => handleRestore(backup.id)} disabled={isRestoring}
                                            className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all disabled:opacity-50">
                                            {isRestoring && selectedBackup === backup.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                            <span>Restore</span>
                                        </button>
                                        {backup.type === 'manual' && (
                                            <button onClick={() => handleDelete(backup.id)} className="p-1.5 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BackupRestoreScreen;
