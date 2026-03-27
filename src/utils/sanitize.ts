/**
 * Simple HTML sanitization utility
 * Strips script tags, event handlers, and dangerous protocols
 */

const SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi
const ON_EVENT_REGEX = /\s*on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi
const JS_PROTOCOL_REGEX = /href\s*=\s*["']?\s*javascript\s*:/gi
const DATA_PROTOCOL_REGEX = /href\s*=\s*["']?\s*data\s*:\s*text\/html/gi

export function sanitizeHTML(html: string): string {
  if (!html) return ''
  return html
    .replace(SCRIPT_REGEX, '')
    .replace(ON_EVENT_REGEX, '')
    .replace(JS_PROTOCOL_REGEX, 'href="#"')
    .replace(DATA_PROTOCOL_REGEX, 'href="#"')
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
