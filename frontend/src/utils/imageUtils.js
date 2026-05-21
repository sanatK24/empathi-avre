/**
 * imageUtils.js
 * Shared utilities for image handling across EmpathI.
 *
 * Key concerns addressed:
 * - Broken URLs → show icon placeholder instead of broken image icon
 * - null/undefined cover_image → show styled placeholder
 * - Consistent avatar initials
 */

/** Valid Unsplash fallback images per category (tested, real photo IDs) */
const CATEGORY_IMAGES = {
  medical:       'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=800&h=500&fit=crop',
  pharmacy:      'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&h=500&fit=crop',
  food:          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=500&fit=crop',
  shelter:       'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=500&fit=crop',
  education:     'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=500&fit=crop',
  infrastructure:'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=500&fit=crop',
  emergency:     'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=800&h=500&fit=crop',
  community:     'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=500&fit=crop',
  vendor:        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=500&fit=crop',
  news:          'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=500&fit=crop',
  default:       'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&h=500&fit=crop',
};

/**
 * Get a real fallback image URL for a given category.
 * @param {string} category - e.g. "medical", "food", "vendor", "news"
 * @returns {string} A valid Unsplash URL
 */
export function getFallbackImage(category = 'default') {
  const key = (category || 'default').toLowerCase();
  return CATEGORY_IMAGES[key] || CATEGORY_IMAGES.default;
}

/**
 * onError handler for <img> tags.
 * When a URL fails to load, swaps to a category-appropriate fallback image.
 * Usage: <img onError={handleImageError('medical')} ... />
 *
 * @param {string} category - Category to choose fallback image
 * @returns {function} React onError event handler
 */
export function handleImageError(category = 'default') {
  return (e) => {
    // Prevent infinite error loops if the fallback itself fails
    e.target.onerror = null;
    e.target.src = getFallbackImage(category);
  };
}

/**
 * Returns initials for a display name.
 * @param {string} name
 * @returns {string} 1–2 character initials (uppercase)
 */
export function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
