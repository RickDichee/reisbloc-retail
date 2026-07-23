/**
 * Reisbloc POS - Secure HTML sanitization utility
 * Uses DOMPurify to prevent XSS (Cross-Site Scripting) attacks
 */
import DOMPurify from 'dompurify'

/**
 * Sanitize HTML string to eliminate script execution, dangerous event handlers,
 * and malicious javascript: or data: URIs.
 */
export function sanitizeHTML(html: string): string {
  if (!html) return ''
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'style', 'class'],
  })
}

/**
 * Escape HTML entities in a string (for plain text displayed as HTML)
 */
export function escapeHTML(str: string): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
