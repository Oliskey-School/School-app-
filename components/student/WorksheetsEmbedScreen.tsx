import React, { useState } from 'react';
import { ChevronLeft, ExternalLink, FileText } from 'lucide-react';

interface WorksheetsEmbedScreenProps {
    navigateTo: (view: string, title?: string, props?: any) => void;
}

// The actual content source — kiddoworksheets.com is just a wrapper that
// re-embeds this same widget in its own iframe, and that double-nesting is
// what broke on mobile. Pointing straight at the source avoids the nesting.
const WORKSHEETS_URL = 'https://www.adaptedmind.com/';

const WorksheetsEmbedScreen: React.FC<WorksheetsEmbedScreenProps> = ({ navigateTo }) => {
    const [loading, setLoading] = useState(true);

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
            {/* Header — clearly labeled as an external resource, not the school's own content */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={() => navigateTo('gamesHub', 'Games Hub')}
                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors shrink-0"
                        aria-label="Back to Games Hub"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className="p-2 rounded-lg bg-orange-50 text-orange-600 shrink-0">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">Worksheets</p>
                        <p className="text-xs text-gray-400 truncate">External resource · adaptedmind.com</p>
                    </div>
                </div>
                <a
                    href={WORKSHEETS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors shrink-0"
                >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Open in New Tab</span>
                </a>
            </div>

            {/* Iframe area — absolutely positioned to fill the remaining space.
                Flex-based height (flex-1 + h-full on the iframe) is unreliable for
                iframes on mobile Safari/Chrome (the iframe can collapse to 0 height
                or lock scrolling); absolute positioning against a relative parent
                sidesteps that entirely and is the standard fix. */}
            <div className="relative flex-1 min-h-0">
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-3" />
                        <p className="text-gray-400 text-sm font-medium">Loading worksheets...</p>
                    </div>
                )}
                <iframe
                    src={WORKSHEETS_URL}
                    title="AdaptedMind Worksheets (external resource)"
                    className="absolute inset-0 w-full h-full border-0"
                    style={{ WebkitOverflowScrolling: 'touch' as any }}
                    onLoad={() => setLoading(false)}
                    allow="fullscreen"
                    scrolling="yes"
                />
            </div>
        </div>
    );
};

export default WorksheetsEmbedScreen;
