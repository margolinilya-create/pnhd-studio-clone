'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';

// audit W-SEO-04: Root-level error boundary — единственный обработчик когда
// корневой layout сам падает. Должен сам рендерить <html>+<body> поскольку
// заменяет всё дерево. См. https://nextjs.org/docs/app/api-reference/file-conventions/error
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ru">
      <head>
        <meta name="robots" content="noindex" />
        <title>Ошибка — pnhd.studio</title>
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <main style={{ padding: '48px 24px', maxWidth: 720, margin: '0 auto' }}>
          <h1 style={{ fontSize: 28, marginBottom: 16 }}>Что-то пошло не так</h1>
          <p style={{ color: '#555', marginBottom: 24 }}>
            Произошла критическая ошибка. Пожалуйста, перезагрузите страницу. Если проблема повторяется — напишите нам.
          </p>
          <Link
            href="/"
            style={{ padding: '12px 20px', background: '#000', color: '#fff', textDecoration: 'none', display: 'inline-block' }}
          >
            На главную
          </Link>
        </main>
      </body>
    </html>
  );
}
