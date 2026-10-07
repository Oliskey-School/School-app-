import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Markdown for AI answers.
 *
 * The app has no typography plugin, so `prose` classes do nothing and plain
 * ReactMarkdown output loses its headings, bullets and table borders. This maps
 * each element to explicit styles: readable line length and spacing, real list
 * markers, and tables/code that scroll sideways on a phone instead of
 * stretching the bubble.
 */
const components: React.ComponentProps<typeof ReactMarkdown>['components'] = {
    h1: ({ children }) => <h3 className="text-base font-semibold text-gray-900 mt-4 first:mt-0 mb-2">{children}</h3>,
    h2: ({ children }) => <h3 className="text-base font-semibold text-gray-900 mt-4 first:mt-0 mb-2">{children}</h3>,
    h3: ({ children }) => <h4 className="text-[15px] font-semibold text-gray-900 mt-4 first:mt-0 mb-1.5">{children}</h4>,
    h4: ({ children }) => <h5 className="text-sm font-semibold text-gray-900 mt-3 first:mt-0 mb-1">{children}</h5>,
    p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
    ul: ({ children }) => <ul className="my-2 pl-5 list-disc space-y-1 marker:text-gray-400">{children}</ul>,
    ol: ({ children }) => <ol className="my-2 pl-5 list-decimal space-y-1 marker:text-gray-500">{children}</ol>,
    li: ({ children }) => <li className="pl-0.5">{children}</li>,
    strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
    a: ({ href, children }) => (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline underline-offset-2 break-words">{children}</a>
    ),
    blockquote: ({ children }) => <blockquote className="my-2 pl-3 border-l-2 border-gray-200 text-gray-600">{children}</blockquote>,
    hr: () => <hr className="my-3 border-gray-200" />,
    table: ({ children }) => (
        <div className="my-3 -mx-1 overflow-x-auto overscroll-x-contain" role="region" aria-label="Table" tabIndex={0}>
            <table className="min-w-full text-sm border-collapse">{children}</table>
        </div>
    ),
    thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
    th: ({ children }) => <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">{children}</th>,
    td: ({ children }) => <td className="px-3 py-2 align-top border-b border-gray-100">{children}</td>,
    pre: ({ children }) => <pre className="my-3 p-3 rounded-xl bg-gray-900 text-gray-100 text-[13px] leading-relaxed overflow-x-auto">{children}</pre>,
    code: ({ className, children }) => {
        // Fenced blocks carry a language class and sit inside <pre>; inline code does not.
        const isBlock = /language-/.test(className || '') || String(children).includes('\n');
        return isBlock
            ? <code className={className}>{children}</code>
            : <code className="px-1 py-0.5 rounded bg-gray-100 text-[0.9em] text-gray-800 break-words">{children}</code>;
    },
};

const AIMarkdown: React.FC<{ children: string; className?: string }> = ({ children, className = '' }) => (
    <div className={`text-[15px] leading-relaxed text-gray-800 break-words ${className}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{children}</ReactMarkdown>
    </div>
);

export default AIMarkdown;
