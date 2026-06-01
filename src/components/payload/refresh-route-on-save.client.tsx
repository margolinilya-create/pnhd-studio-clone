'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Listens to Payload admin's live-preview iframe events.
 * When the admin saves a draft (autosave or manual), calls router.refresh()
 * so RSC chrome (header/footer/cookie bar) reflects new content immediately.
 *
 * Mount once in storefront root layout. No-op when not inside an iframe.
 */
export function RefreshRouteOnSave() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.parent || window.parent === window) return; // not in iframe

    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data !== 'object' || event.data === null) return;
      const data = event.data as { type?: string; event?: string };
      if (
        data.type === 'payload-document-event' &&
        (data.event === 'documentSaved' || data.event === 'documentUpdated')
      ) {
        router.refresh();
      }
      if (data.type === 'payload-live-preview') {
        router.refresh();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [router]);

  return null;
}
