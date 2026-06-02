// src/components/pages-components/category-page/category-page.tsx
//
// Shared SEO-страница категории (futbolki, hudi, kepki, longslivy, svitshoty, shoppery).
// Данные читаются из Payload `categories` collection (isLanding=true).
// Wrapper-страницы /<slug>/page.tsx передают только slug.

import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { draftMode } from 'next/headers';
import { cache } from 'react';
import { Metadata } from 'next';
import styles from '@/app/(storefront)/contacts/page.module.css';
import { IProduct } from '@/app/utils/types';
import { getAllProducts } from '@/lib/queries/products';
import { getSiteSettings } from '@/lib/queries/site-settings';
import { resolveDomain } from '@/lib/site/domain';
import { getPayloadClient } from '@/lib/payload/client';
import { lexicalRichTextToHtml } from '@/lib/queries/static-pages';
import { sanitizeHtml } from '@/lib/sanitize-html';
import MarkupScript from '@/components/shared-components/markup-script/markup-script';
import FaqSection from '@/components/pages-components/main-page/faq-screen/faq-screen';
import ProductCardsBlock from '@/components/pages-components/shop-page/product-cards-block/product-cards-block';
import type { Category } from '@/payload-types';

// Сохраняем экспорт для обратной совместимости — другие куски кодовой базы
// (если найдутся) могли импортировать тип. Все поля опциональные — теперь
// они приходят из Payload и могут быть null.
export interface ICategoryFaqItem {
  title: string;
  text: string;
}

export interface ICategoryPageConfig {
  slug: string;
  productType: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  faqSet: Array<ICategoryFaqItem>;
}

const getCategoryLanding = cache(async (slug: string): Promise<Category | undefined> => {
  const draft = (await draftMode()).isEnabled;
  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: 'categories',
    where: { slug: { equals: slug } },
    draft,
    limit: 1,
  });
  return result.docs[0] as Category | undefined;
});

// audit W-SEO-02 — раньше metadata содержал только title/description/metadataBase
// и хардкодил studio.pnhd.ru. Эти 6 страниц по сути duplicate-content к
// /shop?type=..., но они существуют как SEO-landings — поэтому canonical
// указывает на саму страницу, OG + Twitter заполнены.
//
// Async: siteName читается из Payload SiteSettings, domain — из env через resolveDomain.
export async function buildCategoryMetadata(slug: string): Promise<Metadata> {
  const category = await getCategoryLanding(slug);
  if (!category) {
    return {};
  }
  const settings = await getSiteSettings();
  const domain = resolveDomain();
  const siteName = settings?.siteName ?? 'PINHEAD STUDIO';
  const path = `/${category.slug}`;
  const absoluteUrl = `${domain}${path}`;
  const metaTitle = category.metaTitle ?? category.h1 ?? category.name;
  const metaDescription = category.metaDescription ?? '';
  return {
    title: metaTitle,
    description: metaDescription,
    metadataBase: new URL(domain),
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      title: metaTitle,
      description: metaDescription,
      url: absoluteUrl,
      siteName,
      images: '/opengraph-image.jpg',
    },
    twitter: {
      card: 'summary_large_image',
      title: metaTitle,
      description: metaDescription,
      images: '/opengraph-image.jpg',
    },
  };
}

async function CategoryPage({ slug }: { slug: string }) {
  const category = await getCategoryLanding(slug);
  if (!category || !category.isLanding) {
    notFound();
  }

  const productType = category.productType ?? '';
  const h1 = category.h1 ?? category.name;
  const metaDescription = category.metaDescription ?? '';
  const faqSet: Array<ICategoryFaqItem> = (category.faqSet ?? []).map((item) => ({
    title: item.title,
    text: item.text,
  }));
  const bodyHtml = sanitizeHtml(lexicalRichTextToHtml(category.bodyContent));

  const shopData: Array<IProduct> = productType
    ? await getAllProducts({ type: productType })
    : [];
  const base = resolveDomain();

  const breadcrumbItems = [
    { '@type': 'ListItem', position: 1, name: 'Главная', item: base },
    { '@type': 'ListItem', position: 2, name: h1, item: `${base}/${category.slug}` },
  ];

  const jsonLdBreadcrumbList = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems,
  };

  const jsonLdWebpage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: h1,
    description: metaDescription,
    url: `${base}/${category.slug}`,
    breadcrumb: { '@type': 'BreadcrumbList', itemListElement: breadcrumbItems },
  };

  const jsonLdFaq = faqSet.length > 0
    ? {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqSet.map((q) => ({
        '@type': 'Question',
        name: q.title,
        acceptedAnswer: { '@type': 'Answer', text: q.text },
      })),
    }
    : null;

  return (
    <>
      <MarkupScript jsonLd={jsonLdBreadcrumbList} />
      <MarkupScript jsonLd={jsonLdWebpage} />
      {jsonLdFaq && <MarkupScript jsonLd={jsonLdFaq} />}
      <div className="breadcrumbs">
        <Link className={'breadcrumb-item'} href="/">Главная</Link>
        <span className={'breadcrumb-item'}>{h1}</span>
      </div>
      <div className={styles.title_wrapper}>
        <h1 className={styles.page_title}>{h1}</h1>
      </div>

      {shopData && shopData.length > 0 && <ProductCardsBlock shopData={shopData} />}

      {bodyHtml && (
        <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      )}

      {faqSet.length > 0 && <FaqSection faqSet={faqSet} />}
    </>
  );
}

export default CategoryPage;
