import 'server-only';

import { draftMode } from 'next/headers';
import { cache } from 'react';

import { getPayloadClient, isPayloadConfigured } from '@/lib/payload/client';
import type { HomePage } from '@/payload-types';

const isDraftMode = async (): Promise<boolean> => {
    try {
        const draft = await draftMode();
        return draft.isEnabled;
    } catch {
        return false;
    }
};

export const getHomePage = cache(async (): Promise<HomePage | null> => {
    if (!isPayloadConfigured()) return null;
    const draft = await isDraftMode();
    try {
        const payload = await getPayloadClient();
        return (await payload.findGlobal({ slug: 'home-page', draft })) as HomePage;
    } catch (err) {
        console.error('[getHomePage] Failed:', err);
        return null;
    }
});
