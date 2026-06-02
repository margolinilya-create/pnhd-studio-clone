import type { Access } from 'payload';

const DEFAULT_PREVIEW_HOST = 'https://pnhd-studio-clone.vercel.app';

/** Build live-preview URL for Payload admin iframe. */
export const buildPreviewUrl = (path: string = '/'): string => {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_PREVIEW_HOST;
  const secret = process.env.NEXT_PUBLIC_PREVIEW_SECRET ?? '';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}/api/preview?secret=${secret}&path=${encodeURIComponent(cleanPath)}`;
};

/** Standard 3 breakpoints for Payload livePreview. Reused across globals + collections. */
export const PREVIEW_BREAKPOINTS = [
  { name: 'mobile', label: 'Mobile', width: 375, height: 667 },
  { name: 'tablet', label: 'Tablet', width: 768, height: 1024 },
  { name: 'desktop', label: 'Desktop', width: 1440, height: 900 },
];

/** Smaller subset for one-column content like cookie bar (mobile + desktop only). */
export const PREVIEW_BREAKPOINTS_SIMPLE = [
  { name: 'mobile', label: 'Mobile', width: 375, height: 667 },
  { name: 'desktop', label: 'Desktop', width: 1440, height: 900 },
];

/**
 * Access pattern for documents where:
 * - Logged-in admins/marketing see drafts + published
 * - Anonymous (public storefront) see ONLY published versions
 *
 * Used on globals and collections with `versions.drafts` enabled.
 */
export const publicReadOrDraftAccess: Access = ({ req: { user } }) => {
  if (user) return true;
  return { _status: { equals: 'published' } };
};

/**
 * Standard drafts config: 800ms autosave debounce, schedulePublish, max 20 versions.
 * Used across all draft-enabled globals/collections.
 */
export const DRAFTS_AUTOSAVE_CONFIG = {
  autosave: { interval: 800 } as { interval: 800 },
  schedulePublish: true as const,
};

/**
 * Standard versions config bundle for draft-enabled GLOBALS.
 * Globals use `max` to cap versions globally.
 */
export const VERSIONS_WITH_DRAFTS = {
  drafts: DRAFTS_AUTOSAVE_CONFIG,
  max: 20,
};

/**
 * Standard versions config bundle for draft-enabled COLLECTIONS.
 * Collections use `maxPerDoc` to cap versions per document.
 */
export const VERSIONS_WITH_DRAFTS_PER_DOC = {
  drafts: DRAFTS_AUTOSAVE_CONFIG,
  maxPerDoc: 20,
};
