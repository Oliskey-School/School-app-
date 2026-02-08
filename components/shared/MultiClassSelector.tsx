import React, { useState, useRef, useEffect } from 'react';
import { ChevronRightIcon, XCircleIcon, CheckIcon, SearchIcon, FilterIcon } from '../../constants';

interface MultiClassSelectorProps {
    classes: {
        id: string;
        name: string;
        grade: number;
        section: string;
    }[];
    selectedClasses: string[]; // Array of selected Class Names (or IDs depending on usage)
    onChange: (selected: string[]) => void;
    placeholder?: string;
}

const MultiClassSelector: React.FC<MultiClassSelectorProps> = ({
    classes,
    selectedClasses,
    onChange,
    placeholder = "Select classes..."
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Filter classes based on search
    const filteredClasses = classes.filter(cls =>
        cls.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Toggle a single class selection
    const toggleClass = (className: string) => {
        if (selectedClasses.includes(className)) {
            onChange(selectedClasses.filter(c => c !== className));
        } else {
            onChange([...selectedClasses, className]);
        }
    };

    // Handle "Select All" / "Deselect All" for filtered results
    const handleSelectAll = () => {
        const visibleClassNames = filteredClasses.map(c => c.name);
        const allVisibleSelected = visibleClassNames.every(name => selectedClasses.includes(name));

        if (allVisibleSelected) {
            // Deselect all visible
            onChange(selectedClasses.filter(name => !visibleClassNames.includes(name)));
        } else {
            // Select all visible (add missing ones)
            const newSelection = [...selectedClasses];
            visibleClassNames.forEach(name => {
                if (!newSelection.includes(name)) {
                    newSelection.push(name);
                }
            });
            onChange(newSelection);
        }
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Derived state for "Select All" checkbox
    const visibleClassNames = filteredClasses.map(c => c.name);
    const isAllSelected = visibleClassNames.length > 0 && visibleClassNames.every(name => selectedClasses.includes(name));
    const isIndeterminate = visibleClassNames.some(name => selectedClasses.includes(name)) && !isAllSelected;

    return (
        <div className="relative w-full" ref={containerRef}>
            {/* Trigger Button */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full min-h-[50px] px-3 py-2 border rounded-xl bg-gray-50 flex flex-wrap items-center gap-2 cursor-pointer transition-all ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-500/10 bg-white' : 'border-gray-200 hover:bg-white'
                    }`}
            >
                {selectedClasses.length === 0 && (
                    <span className="text-gray-400 text-sm ml-1 select-none">{placeholder}</span>
                )}

                {selectedClasses.map(cls => (
                    <span key={cls} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 animate-fade-in group" onClick={(e) => e.stopPropagation()}>
                        {cls}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleClass(cls); }}
                            className="text-indigo-400 hover:text-indigo-600 rounded-full transition-colors"
                        >
                            <XCircleIcon className="w-3.5 h-3.5" />
                        </button>
                    </span>
                ))}

                <div className="flex-grow flex justify-end">
                    <ChevronRightIcon className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-90 text-indigo-500' : ''}`} />
                </div>
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-30 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden animate-slide-in-up origin-top">
                    {/* Search & Select All Header */}
                    <div className="p-3 border-b border-gray-100 bg-gray-50/50 space-y-3">
                        <div className="relative">
                            <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search classes..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 bg-white"
                                autoFocus
                            />
                        </div>

                        {filteredClasses.length > 0 && (
                            <div
                                onClick={handleSelectAll}
                                className="flex items-center gap-2 px-1 cursor-pointer hover:opacity-80 select-none"
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isAllSelected ? 'bg-indigo-600 border-indigo-600' :
                                        isIndeterminate ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'
                                    }`}>
                                    {isAllSelected && <CheckIcon className="w-3 h-3 text-white" />}
                                    {isIndeterminate && <div className="w-2 h-0.5 bg-white rounded-full" />}
                                </div>
                                <span className="text-xs font-bold text-gray-600">
                                    {isAllSelected ? 'Deselect All' : 'Select All Filtered'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Class List */}
                    <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                        {filteredClasses.length === 0 ? (
                            <div className="p-6 text-center text-gray-400">
                                <FilterIcon className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p className="text-xs font-medium">No classes found</p>
                            </div>
                        ) : (
                            <div className="space-y-0.5">
                                {filteredClasses.map(cls => {
                                    const isSelected = selectedClasses.includes(cls.name);
                                    return (
                                        <div
                                            key={cls.id}
                                            onClick={() => toggleClass(cls.name)}
                                            className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer text-sm transition-all group ${isSelected ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300 group-hover:border-gray-400'
                                                    }`}>
                                                    {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold leading-tight">{cls.name}</span>
                                                    {/* Optional: Show grade/section if name is ambiguous, but name usually includes it */}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer Stats */}
                    <div className="p-2 border-t border-gray-100 bg-gray-50 text-center">
                        <span className="text-[10px] font-medium text-gray-400">
                            {selectedClasses.length} selected
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiClassSelector;
