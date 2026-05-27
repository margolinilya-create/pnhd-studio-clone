import 'server-only';
import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
    'p', 'h2', 'h3', 'strong', 'em', 'u', 's',
    'ul', 'ol', 'li',
    'a', 'img', 'blockquote', 'br',
];
const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'target', 'rel'];

export function sanitizeBlogHtml(input: string): string {
    return DOMPurify.sanitize(input, {
        ALLOWED_TAGS,
        ALLOWED_ATTR,
        ALLOW_DATA_ATTR: false,
    });
}
