import React, { useState, useEffect } from 'react';
import { Search, GraduationCap, ArrowRight, ChevronRight, Hash } from 'lucide-react';
import { api } from '../../lib/api';

interface School {
    id: string;
    name: string;
    code: string;
    logo_url: string;
    theme_color: string;
}

interface SchoolSelectorProps {
    onSchoolSelected: (school: School) => void;
}

const SchoolSelector: React.FC<SchoolSelectorProps> = ({ onSchoolSelected }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [schoolCode, setSchoolCode] = useState('');
    const [schools, setSchools] = useState<School[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [tab, setTab] = useState<'search' | 'code'>('search');

    useEffect(() => {
        const searchSchools = async () => {
            if (searchTerm.length < 3) {
                setSchools([]);
                return;
            }
            setIsSearching(true);
            const { data, error } = await api
                .from('schools')
                .select('*')
                .ilike('name', `%${searchTerm}%`)
                .limit(5);

            if (!error && data) {
                setSchools(data as School[]);
            }
            setIsSearching(false);
        };

        const timer = setTimeout(searchSchools, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleCodeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!schoolCode) return;

        setIsSearching(true);
        const { data, error } = await api
            .from('schools')
            .select('*')
            .eq('code', schoolCode.toUpperCase())
            .single();

        if (!error && data) {
            onSchoolSelected(data as School);
        } else {
            alert('School code not found. Please try again.');
        }
        setIsSearching(false);
    };

    return (
        <div className="font-sans w-full min-h-screen bg-[#F0F2F5] flex flex-col items-center justify-center overflow-y-auto py-8">
            {/* Branding / Header */}
            <div className="mb-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100 mx-auto mb-6">
                    <GraduationCap className="w-12 h-12 text-white" />
                </div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">School App</h1>
                <p className="text-slate-500 mt-2 font-medium">One App, Many Schools</p>
            </div>

            {/* Selector Card */}
            <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl shadow-slate-200/60 p-8 border border-slate-100 overflow-hidden relative">
                <div className="flex bg-slate-100 p-1 rounded-2xl mb-8">
                    <button
                        onClick={() => setTab('search')}
                        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${tab === 'search' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Find School
                    </button>
                    <button
                        onClick={() => setTab('code')}
                        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${tab === 'code' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        School Code
                    </button>
                </div>

                {tab === 'search' ? (
                    <div className="space-y-6">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search your school name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-2xl py-5 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all outline-none text-lg shadow-inner"
                            />
                        </div>

                        <div className="space-y-3 min-h-[200px]">
                            {schools.length > 0 ? (
                                schools.map((school) => (
                                    <button
                                        key={school.id}
                                        onClick={() => onSchoolSelected(school)}
                                        className="w-full flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 hover:bg-slate-50 hover:shadow-md transition-all group"
                                    >
                                        <div className="flex items-center gap-4 text-left">
                                            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-indigo-600 text-xl border border-slate-200">
                                                {school.logo_url ? <img src={school.logo_url} alt="" className="w-full h-full object-cover rounded-xl" /> : school.name[0]}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 leading-tight">{school.name}</div>
                                                <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">{school.code}</div>
                                            </div>
                                        </div>
                                        <ChevronRight className="text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                                    </button>
                                ))
                            ) : searchTerm.length >= 3 && !isSearching ? (
                                <div className="text-center py-10">
                                    <p className="text-slate-400 font-medium">No schools found. Try school code.</p>
                                </div>
                            ) : searchTerm.length > 0 ? (
                                <div className="text-center py-10">
                                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                    <p className="text-slate-400 font-medium italic">Searching...</p>
                                </div>
                            ) : (
                                <div className="text-center py-10 opacity-40">
                                    <GraduationCap className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                    <p className="text-slate-500 font-medium">Start typing to find your school</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleCodeSubmit} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="relative">
                            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Enter 6-digit Code (e.g. SCH001)"
                                value={schoolCode}
                                onChange={(e) => setSchoolCode(e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-2xl py-5 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all outline-none text-xl font-mono tracking-widest uppercase shadow-inner"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={!schoolCode || isSearching}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-200 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
                        >
                            {isSearching ? (
                                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>Proceed to Login <ArrowRight className="w-5 h-5" /></>
                            )}
                        </button>

                        <div className="pt-4 text-center">
                            <p className="text-sm text-slate-400 px-8 leading-relaxed">
                                Your school administrator will provide you with a unique school code for access.
                            </p>
                        </div>
                    </form>
                )}
            </div>

            {/* Footer / Meta */}
            <div className="mt-12 text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">
                Secure Enterprise School Gateway
            </div>
        </div>
    );
};

export default SchoolSelector;
