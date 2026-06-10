/**
 * Local, offline-safe default avatar.
 *
 * Replaces the previous `https://via.placeholder.com/...` fallbacks, which broke
 * (showed nothing) whenever that external host was slow, blocked, or offline. This
 * is an inline SVG data URI — a neutral grey user silhouette — so it renders
 * instantly with zero network dependency and scales to any size via CSS.
 */
export const DEFAULT_AVATAR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
      `<rect width="100" height="100" fill="#e5e7eb"/>` +
      `<circle cx="50" cy="38" r="18" fill="#9ca3af"/>` +
      `<path d="M50 60c-18 0-30 12-30 28v12h60V88c0-16-12-28-30-28z" fill="#9ca3af"/>` +
      `</svg>`
  );
