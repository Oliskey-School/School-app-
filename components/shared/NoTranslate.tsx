import React from 'react';

/**
 * Marks content that must NEVER be auto-translated — people's names
 * (students, teachers, parents, admins), Global IDs, and any other literal
 * value that should appear identically in every language.
 *
 * The whole-app auto-translation engine (lib/i18n/autoTranslate.ts) skips any
 * subtree carrying `data-no-translate`, which this sets.
 *
 * Usage:
 *   <NoTranslate>{student.full_name}</NoTranslate>
 *   <NoTranslate as="span" className="font-bold">{teacher.name}</NoTranslate>
 *
 * Or spread the attributes onto an existing element to avoid an extra wrapper:
 *   <h1 {...noTranslate}>{user.name}</h1>
 */

/** Attributes that opt an element (and its subtree) out of translation. */
export const noTranslate = {
    'data-no-translate': 'true',
    translate: 'no' as const,
};

type NoTranslateProps = {
    children: React.ReactNode;
    as?: keyof React.JSX.IntrinsicElements;
    className?: string;
} & React.HTMLAttributes<HTMLElement>;

export const NoTranslate: React.FC<NoTranslateProps> = ({
    children,
    as = 'span',
    className,
    ...rest
}) => {
    const Tag = as as any;
    return (
        <Tag {...noTranslate} className={className} {...rest}>
            {children}
        </Tag>
    );
};

export default NoTranslate;
