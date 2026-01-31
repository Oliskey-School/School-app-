import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { linkStudentToParent } from '../../lib/database';
import { ChevronLeftIcon, ShieldCheckIcon } from '../../constants';
import { UserPlus } from 'lucide-react';

interface LinkChildScreenProps {
    handleBack: () => void;
    forceUpdate: () => void;
}

const LinkChildScreen: React.FC<LinkChildScreenProps> = ({ handleBack, forceUpdate }) => {
    const [studentCode, setStudentCode] = useState('');
    const [relationship, setRelationship] = useState('Parent');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentCode.trim()) {
            toast.error("Please enter the student's ID code.");
            return;
        }

        setLoading(true);
        try {
            const result = await linkStudentToParent(studentCode.trim(), relationship);
            if (result.success) {
                toast.success(result.message);
                forceUpdate();
                handleBack();
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            console.error(error);
            toast.error("An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <div className="p-4 bg-white shadow-sm flex items-center">
                <button onClick={handleBack} className="p-2 rounded-full hover:bg-gray-100 mr-2">
                    <ChevronLeftIcon className="w-6 h-6 text-gray-600" />
                </button>
                <h2 className="text-xl font-bold text-gray-800">Link Child Account</h2>
            </div>

            <main className="flex-1 p-6 overflow-y-auto">
                <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white text-center">
                        <UserPlus className="w-16 h-16 mx-auto mb-4 text-white/90" />
                        <h3 className="text-2xl font-bold">Add Your Child</h3>
                        <p className="text-blue-100 mt-2">Enter your child's unique School ID to link their account to your dashboard.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Student ID Code
                            </label>
                            <input
                                type="text"
                                value={studentCode}
                                onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                                placeholder="e.g. SCH-001-STU-1001"
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase tracking-wide font-mono"
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                This ID is found on your child's ID card or admission letter.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Relationship
                            </label>
                            <select
                                value={relationship}
                                onChange={(e) => setRelationship(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="Parent">Parent (Father/Mother)</option>
                                <option value="Guardian">Guardian</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-3.5 rounded-xl text-white font-bold shadow-md transition-all ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5'}`}
                            >
                                {loading ? 'Verifying...' : 'Link Child Account'}
                            </button>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-xl flex items-start space-x-3">
                            <ShieldCheckIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-800 leading-relaxed">
                                For security, linking requires the exact unique ID. Once linked, you can view grades, attendance, and pay fees instantly.
                            </p>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default LinkChildScreen;
