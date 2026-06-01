import 'server-only';

import { draftMode } from 'next/headers';
import { cache } from 'react';

import { getPayloadClient, isPayloadConfigured } from '@/lib/payload/client';
import type { CookieBar, Navigation, SiteSetting } from '@/payload-types';

type NavSurface = 'header' | 'footer' | 'mobile';
type NavItem = NonNullable<Navigation['items']>[number];

const isDraftMode = async (): Promise<boolean> => {
  try {
    const draft = await draftMode();
    return draft.isEnabled;
  } catch {
    return false;
  }
};

export const getSiteSettings = cache(async (): Promise<SiteSetting | null> => {
  if (!isPayloadConfigured()) return null;
  const draft = await isDraftMode();
  try {
    const payload = await getPayloadClient();
    return (await payload.findGlobal({ slug: 'site-settings', draft })) as SiteSetting;
  } catch (err) {
    console.error('[getSiteSettings] Failed:', err);
    return null;
  }
});

export const getNavigation = cache(async (): Promise<Navigation | null> => {
  if (!isPayloadConfigured()) return null;
  const draft = await isDraftMode();
  try {
    const payload = await getPayloadClient();
    return (await payload.findGlobal({ slug: 'navigation', draft })) as Navigation;
  } catch (err) {
    console.error('[getNavigation] Failed:', err);
    return null;
  }
});

export const getCookieBar = cache(async (): Promise<CookieBar | null> => {
  if (!isPayloadConfigured()) return null;
  const draft = await isDraftMode();
  try {
    const payload = await getPayloadClient();
    return (await payload.findGlobal({ slug: 'cookie-bar', draft })) as CookieBar;
  } catch (err) {
    console.error('[getCookieBar] Failed:', err);
    return null;
  }
});

const surfaceFlag = {
  header: 'showInHeader',
  footer: 'showInFooter',
  mobile: 'showInMobile',
} as const;

export const getNavItemsFor = cache(async (surface: NavSurface): Promise<NavItem[]> => {
  const nav = await getNavigation();
  const items = nav?.items ?? [];
  const flag = surfaceFlag[surface];
  return items.filter((item: NavItem) => Boolean((item as Record<string, unknown>)[flag]));
});
