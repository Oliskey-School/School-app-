import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ExternalLink, BookOpen, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';

interface LearningHubResourceViewerProps {
    navigateTo?: (view: string, title?: string, props?: any) => void;
    handleBack?: () => void;
    url?: string;
    title?: string;
    sourceName?: string;
    resourceId?: string;
    trackProgress?: boolean;
    themeColor?: 'orange' | 'blue' | 'indigo' | 'green';
}

const THEME = {
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', button: 'bg-orange-500 hover:bg-orange-600', spinner: 'border-orange-500' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', button: 'bg-blue-600 hover:bg-blue-700', spinner: 'border-blue-500' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', button: 'bg-indigo-700 hover:bg-indigo-800', spinner: 'border-indigo-500' },
    green: { bg: 'bg-green-50', text: 'text-green-600', button: 'bg-green-600 hover:bg-green-700', spinner: 'border-green-500' },
};

// Every domain below was verified by directly checking its LIVE HTTP response
// headers (curl -I) for X-Frame-Options / CSP frame-ancestors — not guessed,
// and not inferred from documentation or marketing copy. Sites confirmed to
// send a blocking header (Mathigon, NASA STEM/Climate Kids/Eyes, Concord
// Consortium, TypingClub, BBC Bitesize, CK-12/PLIX, ReadTheory, PhET's
// general /en/simulations/ pages, Scratch's general site) are deliberately
// left OUT of both this allowlist and the CSP frame-src in
// deploy/nginx.conf + backend/src/app.ts — no client-side trick can override
// another server's own security header, so those resources were removed from
// the Learning Hub's seed data entirely rather than shown as a dead blank
// frame or a permanent "open externally" fallback.
const EMBEDDABLE_PATTERNS: RegExp[] = [
    /^https:\/\/phet\.colorado\.edu\/sims\//,
    /^https:\/\/scratch\.mit\.edu\/projects\/\d+\/embed/,
    /^https:\/\/www\.youtube\.com\/embed\//,
    /^https:\/\/www\.geogebra\.org\//,
    // Confirmed working elsewhere in this app — see components/student/WorksheetsEmbedScreen.tsx.
    /^https:\/\/www\.adaptedmind\.com\//,
    /^https:\/\/www\.desmos\.com\//,
    /^https:\/\/www\.mathsisfun\.com\//,
    /^https:\/\/www\.shodor\.org\//,
    /^https:\/\/blockly\.games\//,
    /^https:\/\/code\.org\//,
    /^https:\/\/www\.commonlit\.org\//,
    /^https:\/\/www\.gutenberg\.org\//,
    /^https:\/\/www\.khanacademy\.org\//,
    /^https:\/\/openstax\.org\//,
    /^https:\/\/kids\.nationalgeographic\.com\//,
];

const isEmbeddable = (url?: string) => !!url && EMBEDDABLE_PATTERNS.some(p => p.test(url));

// PhET's HTML5 simulation bundles can be several MB and take longer than a
// typical page to fire `load`, especially on a school's shared connection —
// a short timeout here would misreport a slow-but-working sim as blocked.
const FRAME_BLOCK_TIMEOUT_MS = 15000;

const LearningHubResourceViewer: React.FC<LearningHubResourceViewerProps> = ({
    navigateTo, handleBack, url, title, sourceName, resourceId, trackProgress, themeColor = 'orange',
}) => {
    const [loading, setLoading] = useState(true);
    const [likelyBlocked, setLikelyBlocked] = useState(false);
    const [completed, setCompleted] = useState(false);
    const theme = THEME[themeColor] || THEME.orange;
    const hasLoadedRef = useRef(false);
    const attemptEmbed = isEmbeddable(url);

    useEffect(() => {
        if (!attemptEmbed) return;
        hasLoadedRef.current = false;
        setLoading(true);
        setLikelyBlocked(false);
        const timer = setTimeout(() => {
            if (!hasLoadedRef.current) setLikelyBlocked(true);
        }, FRAME_BLOCK_TIMEOUT_MS);
        return () => clearTimeout(timer);
    }, [url, attemptEmbed]);

    useEffect(() => {
        if (trackProgress && resourceId) {
            api.upsertMyLearningHubProgress({ resource_id: resourceId, status: 'in_progress' }).catch(() => { /* best-effort */ });
        }
    }, [trackProgress, resourceId]);

    const goBack = () => {
        if (handleBack) handleBack();
        else if (navigateTo) navigateTo('learningHub', 'Learning Hub');
    };

    const handleMarkComplete = async () => {
        if (!resourceId) return;
        try {
            await api.upsertMyLearningHubProgress({ resource_id: resourceId, status: 'completed' });
            setCompleted(true);
            toast.success('Marked as completed!');
        } catch {
            toast.error('Could not update progress');
        }
    };

    if (!url) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gray-50">
                <p className="text-gray-400 font-bold">No resource selected.</p>
                <button onClick={goBack} className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg font-bold">Go Back</button>
            </div>
        );
    }

    const showBlockedFallback = !attemptEmbed || likelyBlocked;

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={goBack}
                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors shrink-0"
                        aria-label="Back to Learning Hub"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className={`p-2 rounded-lg ${theme.bg} ${theme.text} shrink-0`}>
                        <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">{title || 'Resource'}</p>
                        {sourceName && <p className="text-xs text-gray-400 truncate">via {sourceName}</p>}
                    </div>
                </div>
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors shrink-0"
                >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Open in New Tab</span>
                </a>
            </div>

            <div className="relative flex-1 min-h-0">
                {showBlockedFallback ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 p-8 text-center">
                        <div className={`p-4 rounded-2xl ${theme.bg} ${theme.text} mb-4`}>
                            <BookOpen className="w-10 h-10" />
                        </div>
                        <p className="text-gray-900 font-bold text-lg mb-1">{title}</p>
                        {sourceName && <p className="text-gray-400 text-sm mb-6">from {sourceName}</p>}
                        <p className="text-gray-400 text-xs max-w-xs mb-6">
                            {sourceName || 'This site'} doesn't allow its pages to be shown inside another app — tap below to view it.
                        </p>
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`px-6 py-3 text-white rounded-xl font-bold ${theme.button} transition-colors flex items-center gap-2 shadow-md`}
                        >
                            <ExternalLink className="w-4 h-4" />
                            Open Resource
                        </a>
                    </div>
                ) : (
                    <>
                        {loading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
                                <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${theme.spinner} mb-3`} />
                                <p className="text-gray-400 text-sm font-medium">Loading resource...</p>
                            </div>
                        )}
                        <iframe
                            src={url}
                            title={title || 'Learning resource'}
                            className="absolute inset-0 w-full h-full border-0"
                            style={{ WebkitOverflowScrolling: 'touch' as any }}
                            onLoad={() => { hasLoadedRef.current = true; setLoading(false); }}
                            allow="fullscreen; autoplay; encrypted-media"
                            scrolling="yes"
                        />
                    </>
                )}
            </div>

            {trackProgress && resourceId && (
                <div className="p-3 bg-white border-t border-gray-100 shrink-0">
                    <button
                        onClick={handleMarkComplete}
                        disabled={completed}
                        className={`w-full py-3 rounded-xl font-bold text-white transition-colors flex items-center justify-center gap-2 ${completed ? 'bg-green-500' : theme.button}`}
                    >
                        <CheckCircle2 className="w-5 h-5" />
                        {completed ? 'Completed!' : 'Mark as Completed'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default LearningHubResourceViewer;
