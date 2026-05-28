import React, { Suspense } from "react";
import { notFound } from "next/navigation";
import styles from "./page.module.css";
import { getAllProductSlugs, getProductBySlug } from "@/lib/queries/products";
import Photos from "@/components/pages-components/shop-page/product-photos/product-photos";
import ProductInfo from "@/components/pages-components/shop-page/product-info/product-info";
import { Metadata } from 'next';
import { CDN_URL } from "@/app/utils/constants";
import { SITE_INFO } from "@/app/constants";
import { buildMetadata } from "@/app/_lib/build-metadata";

type TMetadataProps = {
    params: Promise<{ slug: string }>,
    searchParams: Promise<{ id: string }>,
}

export const generateStaticParams = async () => {
    const slugs = await getAllProductSlugs();
    return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata(props: TMetadataProps): Promise<Metadata> {
    const params = await props.params;
    const currItem = await getProductBySlug(params.slug);
    const title = currItem ? `${currItem.name} — печать на одежде | ${SITE_INFO.name}` : `Товар | ${SITE_INFO.name}`;
    const description = currItem?.description
        ? `${currItem.name}. ${currItem.description}`.slice(0, 300)
        : `${currItem?.name ?? 'Товар'} с печатью под заказ. Доставка по России.`;

    return {
        ...buildMetadata({
            title,
            description,
            path: `/shop/${params.slug}`,
            image: currItem?.image_url || undefined,
            type: 'product',
        }),
        keywords: currItem ? [currItem.category, currItem.type, currItem.color].filter(Boolean) as string[] : undefined,
    };
}

function productJsonLd(item: NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>) {
    const productUrl = `${SITE_INFO.domain}/shop/${item.slug}`;
    const inStock = (item.sizes ?? []).some((s) => s.qty > 0);

    const product = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: item.name,
        description: item.description || `${item.name} с печатью под заказ`,
        image: item.galleryPhotos && item.galleryPhotos.length > 0
            ? item.galleryPhotos
            : item.image_url
                ? [item.image_url]
                : undefined,
        sku: item._id,
        brand: {
            '@type': 'Brand',
            name: SITE_INFO.name,
        },
        offers: {
            '@type': 'Offer',
            url: productUrl,
            priceCurrency: 'RUB',
            price: item.price,
            availability: inStock
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
            seller: {
                '@type': 'Organization',
                name: SITE_INFO.legal_name,
            },
        },
    };

    const breadcrumbs = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Главная', item: SITE_INFO.domain },
            { '@type': 'ListItem', position: 2, name: 'Магазин', item: `${SITE_INFO.domain}/shop` },
            { '@type': 'ListItem', position: 3, name: item.name, item: productUrl },
        ],
    };

    return [product, breadcrumbs];
}

const ProductPage: React.FC<{
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ id: string }>;
}> = async props => {
    const params = await props.params;

    const item = await getProductBySlug(params.slug);
    if (!item) notFound();
    return (
        <>
            {productJsonLd(item).map((ld, i) => (
                <script
                    key={i}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
                />
            ))}
            <section className={styles.screen}>
                <div className={styles.photo_box}>
                    {item?.galleryPhotos && item.galleryPhotos.length > 0 && item?.galleryPhotos?.map((el, index) => {
                        return (
                            <Photos item={item} el={el} key={index} index={index} />
                        )
                    })}
                    {(!item?.galleryPhotos || item.galleryPhotos.length === 0) && [1, 2, 3, 4].map((el, index) => {
                        return (
                            <Photos item={item} el={`${CDN_URL}/${item.slug}_${index}.jpg`} key={el} index={index} />
                        )
                    })}
                </div>
                <Suspense>
                    <ProductInfo item={item} />
                </Suspense>
            </section>
        </>
    );
};

export default ProductPage;
