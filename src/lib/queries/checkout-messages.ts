import 'server-only';

import { draftMode } from 'next/headers';
import { cache } from 'react';

import { getPayloadClient, isPayloadConfigured } from '@/lib/payload/client';
import type { CheckoutMessage } from '@/payload-types';

const isDraftMode = async (): Promise<boolean> => {
    try {
        const draft = await draftMode();
        return draft.isEnabled;
    } catch {
        return false;
    }
};

export const getCheckoutMessages = cache(async (): Promise<CheckoutMessage | null> => {
    if (!isPayloadConfigured()) return null;
    const draft = await isDraftMode();
    try {
        const payload = await getPayloadClient();
        return (await payload.findGlobal({ slug: 'checkout-messages', draft })) as CheckoutMessage;
    } catch (err) {
        console.error('[getCheckoutMessages] Failed:', err);
        return null;
    }
});
