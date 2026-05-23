/**
 * dateUtils.js — Shared date formatting utilities.
 *
 * Centralizes the formatDistanceToNow function that was previously
 * copy-pasted inline into SmartFeedPage.jsx and will be needed by
 * future pages. Add other date helpers here as needed.
 */

/**
 * Returns a human-readable relative time string.
 * e.g. "3 hours ago", "Just now", "2 days ago"
 *
 * @param {string|Date} date - ISO date string or Date object
 * @returns {string}
 */
export function formatDistanceToNow(date) {
  if (!date) return 'Recently';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return `${Math.floor(interval)} year${Math.floor(interval) > 1 ? 's' : ''} ago`;

  interval = seconds / 2592000;
  if (interval > 1) return `${Math.floor(interval)} month${Math.floor(interval) > 1 ? 's' : ''} ago`;

  interval = seconds / 86400;
  if (interval > 1) return `${Math.floor(interval)} day${Math.floor(interval) > 1 ? 's' : ''} ago`;

  interval = seconds / 3600;
  if (interval > 1) return `${Math.floor(interval)} hour${Math.floor(interval) > 1 ? 's' : ''} ago`;

  interval = seconds / 60;
  if (interval > 1) return `${Math.floor(interval)} minute${Math.floor(interval) > 1 ? 's' : ''} ago`;

  if (seconds < 30) return 'Just now';
  return `${Math.floor(seconds)} seconds ago`;
}

/**
 * Format a date to a short locale string.
 * e.g. "22 May 2026"
 *
 * @param {string|Date} date
 * @returns {string}
 */
export function formatShortDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a date with time.
 * e.g. "22 May, 02:30 PM"
 *
 * @param {string|Date} date
 * @returns {string}
 */
export function formatDateTime(date) {
  if (!date) return '';
  return new Date(date).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
