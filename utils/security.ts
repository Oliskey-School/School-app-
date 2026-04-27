import DOMPurify from 'dompurify';
import React from 'react';

/**
 * Lead DevSecOps: HTML Sanitization Utility
 * This utility ensures that any user-generated content (UGC) is stripped of
 * malicious scripts, event handlers (onmouseover, etc.), and unauthorized tags
 * before being rendered in the DOM.
 */

// Configure DOMPurify once to avoid redundant setup
// On native (Expo), DOMPurify requires a JSDOM or equivalent window object, 
// but for Web/Shared logic, it works out of the box.
const sanitizer = typeof window !== 'undefined' ? DOMPurify(window) : null;

export const sanitizeHTML = (html: string): string => {
  if (!html) return '';
  if (!sanitizer) return html; // Fallback for pure native environments (where HTML isn't rendered directly)

  return sanitizer.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'title', 'class'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'frame', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    RETURN_TRUSTED_TYPE: true, // For modern browser security policies
  }) as unknown as string;
};

/**
 * SafeHTML Component
 * Use this component to render any user-provided string that might contain HTML.
 * It replaces 'dangerouslySetInnerHTML' with a secure, sanitized boundary.
 */
interface SafeHTMLProps {
  content: string;
  className?: string;
  as?: React.ElementType;
}

export const SafeHTML: React.FC<SafeHTMLProps> = ({ 
  content, 
  className = '', 
  as: Component = 'div' 
}) => {
  const sanitized = React.useMemo(() => sanitizeHTML(content), [content]);

  return (
    <Component
      className={`safe-html-boundary ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
};
