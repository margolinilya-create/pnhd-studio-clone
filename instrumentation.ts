import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
const environment = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development';

export async function register() {
    if (!dsn) return;

    // Sentry SDK v10 требует init внутри register() — единая точка для server + edge runtime.
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        Sentry.init({
            dsn,
            environment,
            tracesSampleRate: 0.1,
            sendDefaultPii: false,
        });
    }
    if (process.env.NEXT_RUNTIME === 'edge') {
        Sentry.init({
            dsn,
            environment,
            tracesSampleRate: 0.1,
            sendDefaultPii: false,
        });
    }
}

export const onRequestError = Sentry.captureRequestError;
