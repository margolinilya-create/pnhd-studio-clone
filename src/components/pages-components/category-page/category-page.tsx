// src/components/pages-components/category-page/category-page.tsx
//
// Shared SEO-страница категории (futbolki, hudi, kepki, longslivy, svitshoty, shoppery).
// Заменяет 6 копипаст-файлов: data-config вынесен в src/app/{slug}/config.tsx,
// рендеринг + JSON-LD централизован здесь.

import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import styles from '@/app/(storefront)/contacts/page.module.css';
import { IProduct } from '@/app/utils/types';
import { getAllProducts } from '@/lib/queries/products';
import { getSiteSettings } from '@/lib/queries/site-settings';
import { resolveDomain } from '@/lib/site/domain';
import MarkupScript from '@/components/shared-components/markup-script/markup-script';
import FaqSection from '@/components/pages-components/main-page/faq-screen/faq-screen';
import ProductCardsBlock from '@/components/pages-components/shop-page/product-cards-block/product-cards-block';

export interface ICategoryFaqItem {
  title: string;
  text: string;
}

export interface ICategoryPageConfig {
  slug: string;           // 'futbolki' | 'hudi' | ...
  productType: string;    // 'tshirt' | 'hoodie' | ...
  h1: string;
  metaTitle: string;
  metaDescription: string;
  faqSet: Array<ICategoryFaqItem>;
  bodyContent: React.ReactNode;  // SEO copy: <h2>...</h2><p>...</p> etc.
}

// audit W-SEO-02 — раньше metadata содержал только title/description/metadataBase
// и хардкодил studio.pnhd.ru. Эти 6 страниц по сути duplicate-content к
// /shop?type=..., но они существуют как SEO-landings — поэтому canonical
// указывает на саму страницу, OG + Twitter заполнены.
//
// Async: siteName читается из Payload SiteSettings, domain — из env через resolveDomain.
export async function buildCategoryMetadata(config: ICategoryPageConfig): Promise<Metadata> {
  const settings = await getSiteSettings();
  const domain = resolveDomain();
  const siteName = settings?.siteName ?? 'PINHEAD STUDIO';
  const path = `/${config.slug}`;
  const absoluteUrl = `${domain}${path}`;
  return {
    title: config.metaTitle,
    description: config.metaDescription,
    metadataBase: new URL(domain),
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      title: config.metaTitle,
      description: config.metaDescription,
      url: absoluteUrl,
      siteName,
      images: '/opengraph-image.jpg',
    },
    twitter: {
      card: 'summary_large_image',
      title: config.metaTitle,
      description: config.metaDescription,
      images: '/opengraph-image.jpg',
    },
  };
}

async function CategoryPage({ config }: { config: ICategoryPageConfig }) {
  const shopData: Array<IProduct> = await getAllProducts({ type: config.productType });
  const base = resolveDomain();

  const breadcrumbItems = [
    { '@type': 'ListItem', position: 1, name: 'Главная', item: base },
    { '@type': 'ListItem', position: 2, name: config.h1, item: `${base}/${config.slug}` },
  ];

  const jsonLdBreadcrumbList = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems,
  };

  const jsonLdWebpage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: config.h1,
    description: config.metaDescription,
    url: `${base}/${config.slug}`,
    breadcrumb: { '@type': 'BreadcrumbList', itemListElement: breadcrumbItems },
  };

  const jsonLdFaq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: config.faqSet.map((q) => ({
      '@type': 'Question',
      name: q.title,
      acceptedAnswer: { '@type': 'Answer', text: q.text },
    })),
  };

  return (
    <>
      <MarkupScript jsonLd={jsonLdBreadcrumbList} />
      <MarkupScript jsonLd={jsonLdWebpage} />
      <MarkupScript jsonLd={jsonLdFaq} />
      <div className="breadcrumbs">
        <Link className={'breadcrumb-item'} href="/">Главная</Link>
        <span className={'breadcrumb-item'}>{config.h1}</span>
      </div>
      <div className={styles.title_wrapper}>
        <h1 className={styles.page_title}>{config.h1}</h1>
      </div>

      {shopData && shopData.length > 0 && <ProductCardsBlock shopData={shopData} />}

      {config.bodyContent}

      <FaqSection faqSet={config.faqSet} />
    </>
  );
}

export default CategoryPage;
