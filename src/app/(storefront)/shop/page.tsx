import React, { Suspense } from 'react';
import {Metadata} from 'next';
import ProductCardsBlock from '@/components/pages-components/shop-page/product-cards-block/product-cards-block';
import {IProduct} from '@/app/utils/types';
import { getAllProducts } from '@/lib/queries/products';
import ProductFilterComp from '@/components/pages-components/shop-page/products-filter/products-filter';
import MarkupScript from "@/components/shared-components/markup-script/markup-script";
import {
  getCatalogPageBreadCrumbsJsonLD,
  getCatalogPageNavigationJsonLD,
} from "@/app/utils/markups";
import FaqScreen from '@/components/pages-components/main-page/faq-screen/faq-screen';
import NoModelBlock from '@/components/shared-components/noModelBlock/NoModelBlock';
import { getFormIdBySlug } from '@/lib/forms/get-form-by-slug';
import { resolveDomain } from '@/lib/site/domain';
import { getSiteSettings } from '@/lib/queries/site-settings';


export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const base = resolveDomain();
  const siteName = settings?.siteName ?? 'PINHEAD STUDIO';
  return {
    title: 'Печать на одежде в Санкт-Петербурге на заказ от 1 штуки цена в ПИНХЭД СТУДИЯ',
    description: 'Печать на одежде на заказ от 1 штуки в Санкт-Петербурге по выгодной цене в ПИНХЭД СТУДИЯ. Сколько стоит печать на одежде смотрите онлайн на нашем сайте.',
    keywords: 'печать на футболках, санкт-петербург, недорого, на заказ, цена, от 1 шт, срочный, заказать, хороший, сделать, стоимость, доставка, быстрый, качественный, черный, оверсайз, белый, онлайн, спортивный, свой дизайн, конструктор, создать макет, нанесение, собственный, толстовка, худи, студия, услуги, каталог, а3, а4, одежда, свитшот',
    // audit W-SEO-08 — было `new URL('.../shop')` с trailing path. metadataBase
    // должен указывать на корень origin'а, чтобы относительные пути в alternates/og
    // резолвились правильно. Также W-SEO-01: env-driven через resolveDomain.
    metadataBase: new URL(base),
    alternates: { canonical: '/shop' },
    openGraph: {
      type: 'website',
      title: 'PNHD STUDIO | Каталог',
      description: 'Печать на одежде на заказ от 1 штуки в Санкт-Петербурге.',
      url: `${base}/shop`,
      siteName,
      images: '/opengraph-image.jpg',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'PNHD STUDIO | Каталог',
      images: '/opengraph-image.jpg',
    },
  };
}

const ShopPage: React.FC = async () => {

  const shopData: Array<IProduct> = await getAllProducts();

  // Soft-fail: если Forms-коллекция недоступна, страница всё равно отрендерится.
  // Форма получит пустой formId и зафейлится на уровне API у конкретного юзера.
  let noModelFormId = '';
  try {
    noModelFormId = await getFormIdBySlug('shop-no-model');
  } catch (err) {
    console.error('ShopPage: failed to resolve form "shop-no-model"', err);
  }

  // Promise.all — async factories независимы; cache() per-request гарантирует,
  // что resolveDomain() (cheap) и getSiteSettings (если бы было) дёргаются 1 раз.
  const [breadcrumbsJsonLd, navigationJsonLd] = await Promise.all([
    getCatalogPageBreadCrumbsJsonLD(),
    getCatalogPageNavigationJsonLD(),
  ]);
  const base = resolveDomain();
  const jsonLdCatalog = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Каталог",
    "description": "Каталог одежды и сумок для печати в Санкт-Петербурге. Печать, на футболках,толстовках, шопперах на заказ от 1 штуки по выгодной цене вПИНХЭД СТУДИЯ",
    "url": `${base}/shop`,
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": shopData.slice(0, 20).length ?? 0,
      "itemListElement": shopData.slice(0, 20).map((item, index) => {
        return {
          "@type": "ListItem",
          "position": index + 1,
          "item": {
            "@type": "Product",
            "name": item.name,
            "url": `${base}/shop/${item.slug}`,
            "image": item.image_url
          }
        }
      })
    }
  }


  return (
    <Suspense fallback={<div>Загрузка...</div>}>
      <ProductFilterComp shopData={shopData}>
        {shopData && shopData.length > 0 && <ProductCardsBlock shopData={shopData}/>}
        <MarkupScript jsonLd={jsonLdCatalog} />
        <MarkupScript jsonLd={breadcrumbsJsonLd} />
        <MarkupScript jsonLd={navigationJsonLd} />
      </ProductFilterComp>
      <NoModelBlock formId={noModelFormId} />
      <div style={{ marginTop: '120px', width: '100%' }}>
      <FaqScreen />
      </div>
    </Suspense>
  )
}

export default ShopPage;

