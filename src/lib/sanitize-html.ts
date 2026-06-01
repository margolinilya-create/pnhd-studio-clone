import 'server-only';
import DOMPurify from 'isomorphic-dompurify';

// Whitelist для admin-rendered HTML (blog body, static pages).
// Покрывает разметку которую WYSIWYG в Payload admin реально продуцирует.
// Атрибуты ужаты до безопасных — никаких on*, style, javascript:.
const ALLOWED_TAGS = [
  'p', 'br', 'div', 'span',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'strong', 'b', 'em', 'i', 'u', 's',
  'a',
  'img',
  'blockquote', 'pre', 'code',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'hr',
];

const ALLOWED_ATTR = [
  'href', 'target', 'rel',
  'src', 'alt', 'title', 'width', 'height', 'loading',
];

/**
 * Санитизирует admin-rendered HTML перед `dangerouslySetInnerHTML`.
 * Закрывает audit B6 (Stored XSS via bodyHtml в Pages collection).
 *
 * Применяется к: blog bodyHtml, static pages bodyHtml, и любым другим
 * admin-writable HTML которые попадают в render.
 *
 * Это второй слой защиты — основной должен быть write-time sanitize
 * в Pages collection beforeChange hook'е, но render-time даёт defence-in-depth.
 */
export const sanitizeHtml = (html: string): string => {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'style'],
  });
};
