import React, { useState, useRef, useEffect } from 'react';
import { Search, User, ChevronDown, Check, X } from 'lucide-react';

interface Student {
    id: string;
    name: string;
    grade?: string | number;
    section?: string;
    [key: string]: any;
}

interface SearchableStudentSelectProps {
    students: Student[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    error?: string;
    touched?: boolean;
}

const SearchableStudentSelect: React.FC<SearchableStudentSelectProps> = ({
    students,
    value,
    onChange,
    placeholder = "Select Student",
    error,
    touched
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedStudent = students.find(s => s.id === value);

    const filteredStudents = students.filter(s => {
        const fullName = (s.name || '').toLowerCase();
        const gradeStr = (s.grade?.toString() || '').toLowerCase();
        const sectionStr = (s.section || '').toLowerCase();
        const classStr = `${gradeStr}${sectionStr}`;
        const search = searchTerm.toLowerCase();

        return fullName.includes(search) || classStr.includes(search);
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (id: string) => {
        onChange(id);
        setIsOpen(false);
        setSearchTerm('');
    };

    const toggleOpen = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <div
                onClick={toggleOpen}
                className={`w-full flex items-center justify-between border rounded-xl p-3 bg-gray-50 cursor-pointer transition-all hover:bg-gray-100 ${error && touched ? 'border-red-500' : 'border-gray-200'} ${isOpen ? 'ring-2 ring-indigo-500 border-indigo-500' : ''}`}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-indigo-600" />
                    </div>
                    {selectedStudent ? (
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-semibold text-gray-900 truncate">{selectedStudent.name}</span>
                            <span className="text-xs text-gray-500">Class: {selectedStudent.grade}{selectedStudent.section || ''}</span>
                        </div>
                    ) : (
                        <span className="text-gray-400 text-sm">{placeholder}</span>
                    )}
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-[100] mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 border-b border-gray-50 sticky top-0 bg-white z-10">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                placeholder="Search student name or class..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') setIsOpen(false);
                                }}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2"
                                >
                                    <X className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto">
                        {filteredStudents.length > 0 ? (
                            filteredStudents.map((s) => (
                                <div
                                    key={s.id}
                                    onClick={() => handleSelect(s.id)}
                                    className="px-4 py-3 hover:bg-indigo-50 cursor-pointer flex items-center justify-between transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 group-hover:bg-white group-hover:text-indigo-600 transition-colors">
                                            {s.name ? s.name[0].toUpperCase() : '?'}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-900">{s.name}</span>
                                            <span className="text-xs text-gray-500">Class {s.grade}{s.section || ''}</span>
                                        </div>
                                    </div>
                                    {value === s.id && <Check className="w-5 h-5 text-indigo-600" />}
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center">
                                <p className="text-sm text-gray-400 font-medium italic">No students found matching "{searchTerm}"</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {error && touched && <div className="text-red-500 text-xs mt-1 px-1">{error}</div>}
        </div>
    );
};

export default SearchableStudentSelect;
