import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { getStaticPage } from '@/lib/queries/static-pages';
import styles from './page.module.css';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Политика конфиденциальности | Studio PNHD',
  description:
    'Политика конфиденциальности Studio PNHD. Как мы собираем, используем и защищаем личные данные пользователей.',
  metadataBase: new URL('https://studio.pnhd.ru'),
};

const Privacy = async (props: { searchParams?: Promise<{ preview?: string }> }) => {
  const searchParams = (await props.searchParams) ?? {};
  const preview = searchParams.preview === 'true';
  const page = await getStaticPage('privacy', { preview });
  if (!page) notFound();

  return (
    <section className={styles.page}>
      <div dangerouslySetInnerHTML={{ __html: page.bodyHtml }} />
    </section>
  );
};

export default Privacy;
