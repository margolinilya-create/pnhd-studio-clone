import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { getStaticPage } from '@/lib/queries/static-pages';
import styles from './page.module.css';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Правила согласования изображения и печати | Studio PNHD',
  description:
    'Правила согласования изображения и его печати в компании ПИНХЭД СТУДИЯ. Условия работы с макетами и текстилем.',
  metadataBase: new URL('https://studio.pnhd.ru'),
};

const Oferta = async (props: { searchParams?: Promise<{ preview?: string }> }) => {
  const searchParams = (await props.searchParams) ?? {};
  const preview = searchParams.preview === 'true';
  const page = await getStaticPage('oferta', { preview });
  if (!page) notFound();

  return (
    <section className={styles.page}>
      <div dangerouslySetInnerHTML={{ __html: page.bodyHtml }} />
    </section>
  );
};

export default Oferta;
