/**
 * Frontend URL Sanitizer
 * Defends against DOM-based XSS via javascript:, data:, and vbscript: URIs
 */
export function sanitizeUrl(url, { defaultProtocol = 'https://', fallback = '#' } = {}) {
  if (!url || typeof url !== 'string') {
    return fallback;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return fallback;
  }

  // Strictly block dangerous executable schemes
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return fallback;
  }

  // Safe explicitly supported web protocols
  if (/^(https?|mailto|tel):/i.test(trimmed)) {
    return encodeURI(trimmed);
  }

  // Prepend safe protocol for relative links or bare domains
  if (trimmed.startsWith('//')) {
    return encodeURI(`https:${trimmed}`);
  }

  if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
    return encodeURI(trimmed);
  }

  return encodeURI(`${defaultProtocol}${trimmed}`);
}

export default sanitizeUrl;
