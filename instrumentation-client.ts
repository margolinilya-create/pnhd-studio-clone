import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
    Sentry.init({
        dsn,
        environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',
        tracesSampleRate: 0.1,
        // Replay в free-tier не используем (платный фичар выше определённого тиража)
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
        // Скрываем PII в default-стейте — Bitrix24-flow и так data-minimal
        sendDefaultPii: false,
    });
}

// App-Router navigation tracking — no-op без активного Sentry-клиента.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
