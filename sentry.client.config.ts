import * as Sentry from '@sentry/nextjs';

// Client-side Sentry init. Server + edge runtime инитятся в `instrumentation.ts`.
// Без DSN — no-op (Sentry.init не вызывается). Vercel env (`NEXT_PUBLIC_VERCEL_ENV`)
// предпочтительнее `NODE_ENV` чтобы preview-деплои попадали в отдельный environment.

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const environment = process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? 'development';

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: 0.1,
    // Session Replay только при ошибках — бесплатного tier'а с запасом хватает.
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.0,
    sendDefaultPii: false,
  });
}
