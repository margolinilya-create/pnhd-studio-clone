'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';

// audit W-SEO-04: Storefront error boundary. Без этого Next.js рендерит дефолтный
// английский fallback. С Sentry уже подключён через `@sentry/nextjs` — здесь
// добавляем capture для unhandled error'ов вне React render path.
export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ru">
      <head>
        <meta name="robots" content="noindex" />
      </head>
      <body>
        <main style={{ padding: '48px 24px', maxWidth: 720, margin: '0 auto', fontFamily: 'Neue_machina, system-ui, sans-serif' }}>
          <h1 style={{ fontSize: 28, marginBottom: 16 }}>Что-то пошло не так</h1>
          <p style={{ color: '#555', marginBottom: 24 }}>
            Произошла ошибка при загрузке страницы. Попробуйте обновить или вернуться на главную. Если проблема повторяется — напишите нам.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={reset}
              style={{ padding: '12px 20px', background: '#000', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              Попробовать снова
            </button>
            <Link
              href="/"
              style={{ padding: '12px 20px', border: '1px solid #000', color: '#000', textDecoration: 'none' }}
            >
              На главную
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
