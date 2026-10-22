import React, { useState, useEffect, useLayoutEffect } from 'react';
import { X as XMarkIcon, ChevronDown as ChevronDownIcon } from 'lucide-react';

/**
 * Chip-style multi-select with a filter input — the same control the admin
 * uses for "Subjects (Optional Selection)" on the Add/Edit Student screen,
 * extracted so other forms (e.g. the class form) render an identical picker.
 */
const MultiSelect: React.FC<{
    label: string;
    selected: string[];
    setSelected: React.Dispatch<React.SetStateAction<string[]>>;
    placeholder: string;
    options: string[];
    /** Offer the typed text as a new option when it matches nothing. */
    allowCreate?: boolean;
}> = ({ label, selected, setSelected, placeholder, options, allowCreate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [filterText, setFilterText] = useState('');
    const containerRef = React.useRef<HTMLDivElement>(null);
    const fieldRef = React.useRef<HTMLDivElement>(null);
    const listRef = React.useRef<HTMLDivElement>(null);
    // Where the list opens and how tall it may be, so it is never hidden behind
    // the edge of the scrolling form (or the action bar below it).
    const [placement, setPlacement] = useState<{ up: boolean; maxHeight: number }>({ up: false, maxHeight: 240 });

    useLayoutEffect(() => {
        if (!isOpen) return;
        const place = () => {
            const field = fieldRef.current;
            if (!field) return;
            const rect = field.getBoundingClientRect();
            let top = 0, bottom = window.innerHeight;
            for (let el = field.parentElement; el; el = el.parentElement) {
                const oy = getComputedStyle(el).overflowY;
                if (oy === 'auto' || oy === 'scroll' || oy === 'hidden') {
                    const r = el.getBoundingClientRect();
                    top = Math.max(top, r.top);
                    bottom = Math.min(bottom, r.bottom);
                    break;
                }
            }
            const below = bottom - rect.bottom - 8;
            const above = (containerRef.current?.getBoundingClientRect().top ?? rect.top) - top - 8;
            const up = below < 160 && above > below;
            const room = up ? above : below;
            setPlacement({ up, maxHeight: Math.max(120, Math.min(240, Math.floor(room))) });
            // Not enough room either way: bring the whole list into view.
            if (room < 120) requestAnimationFrame(() => listRef.current?.scrollIntoView({ block: 'nearest' }));
        };
        place();
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleSelection = (option: string) => {
        if (selected.includes(option)) {
            setSelected(selected.filter(item => item !== option));
        } else {
            setSelected([...selected, option]);
        }
        setFilterText(''); // Reset filter after selection
    };

    const typed = filterText.trim().toLowerCase();
    const canCreate = !!allowCreate && !!typed
        && !options.some(o => o.toLowerCase() === typed)
        && !selected.some(o => o.toLowerCase() === typed);

    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes(filterText.toLowerCase()) &&
        !selected.includes(opt)
    );

    return (
        <div className="relative" ref={containerRef}>
            <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>

            {/* Main Input Container */}
            <div
                ref={fieldRef}
                className="min-h-[42px] p-2 border border-gray-300 rounded-lg bg-gray-50 flex flex-wrap gap-2 items-center cursor-text focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all"
                onClick={() => setIsOpen(true)}
            >
                {/* Selected Tags */}
                {selected.map(item => (
                    <span key={item} className="flex items-center gap-1 bg-indigo-100 text-indigo-800 text-sm font-medium px-2 py-1 rounded-md">
                        {item}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleSelection(item); }}
                            className="text-indigo-600 hover:text-indigo-800 focus:outline-none"
                        >
                            <XMarkIcon className="w-4 h-4" />
                        </button>
                    </span>
                ))}

                {/* Input Field */}
                <div className="flex-grow flex items-center min-w-[120px] max-w-full">
                    <input
                        type="text"
                        value={filterText}
                        onChange={(e) => { setFilterText(e.target.value); setIsOpen(true); }}
                        onFocus={() => setIsOpen(true)}
                        placeholder={selected.length === 0 ? placeholder : ""}
                        className="w-full bg-transparent outline-none text-gray-700 placeholder-gray-400 text-sm"
                    />
                </div>

                <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    ref={listRef}
                    style={{ maxHeight: placement.maxHeight }}
                    className={`absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-y-auto overscroll-contain ${placement.up ? 'bottom-full mb-1' : 'mt-1'}`}
                >
                    {canCreate && (
                        <div
                            onClick={() => toggleSelection(filterText.trim())}
                            className="px-4 py-2 hover:bg-indigo-50 cursor-pointer text-sm text-indigo-700 font-medium"
                        >
                            Add new subject “{filterText.trim()}”
                        </div>
                    )}
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map(option => (
                            <div
                                key={option}
                                onClick={() => toggleSelection(option)}
                                className="px-4 py-2 hover:bg-indigo-50 cursor-pointer text-sm text-gray-700 flex items-center justify-between"
                            >
                                <span>{option}</span>
                            </div>
                        ))
                    ) : canCreate ? null : (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                            {options.length === 0 ? "No options available" : "No matching options"}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MultiSelect;
