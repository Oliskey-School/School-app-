import React, { useState } from 'react';
import { useLowDataMode } from '../../lib/lowDataMode';

/**
 * Drop-in <img> for photos that repeat per row (avatars in rosters and chat
 * lists). Outside Low Data Mode it IS a plain <img>. In Low Data Mode it
 * renders an initials placeholder in the same box (same className, so size,
 * shape and rings are unchanged) and only downloads the photo when tapped —
 * on a 400kbps link a 40-row roster's avatars otherwise cost more than the
 * roster itself.
 *
 * Rendered as a span, not a button: rows are often buttons themselves and a
 * button may not contain another button.
 */
type Props = React.ImgHTMLAttributes<HTMLImageElement>;

const initialsOf = (text?: string) =>
  (text || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '·';

const LowDataImage: React.FC<Props> = (props) => {
  const lowData = useLowDataMode();
  const [revealed, setRevealed] = useState(false);

  if (!lowData || revealed) return <img {...props} />;

  const { className, alt, style } = props;
  const reveal = (e: React.SyntheticEvent) => {
    // Rows are clickable; loading a photo must not also open the row.
    e.preventDefault();
    e.stopPropagation();
    setRevealed(true);
  };

  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={alt ? `Load photo of ${alt}` : 'Load photo'}
      title="Low data mode — tap to load photo"
      onClick={reveal}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') reveal(e); }}
      className={`${className || ''} inline-flex items-center justify-center bg-gray-100 text-gray-500 text-xs font-bold select-none cursor-pointer`}
      style={style}
    >
      {initialsOf(alt)}
    </span>
  );
};

export default LowDataImage;
