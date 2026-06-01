import React, { Suspense } from "react";
import { notFound } from "next/navigation";
import styles from "./page.module.css";
import { getAllProductSlugs, getProductBySlug, getProductSeoBySlug } from "@/lib/queries/products";
import type { Media } from "@/payload-types";
import Photos from "@/components/pages-components/shop-page/product-photos/product-photos";
import ProductInfo from "@/components/pages-components/shop-page/product-info/product-info";
import { Metadata } from 'next';
import { SITE_INFO } from "@/app/constants";
import { buildMetadata } from "@/app/_lib/build-metadata";
import MarkupScript from "@/components/shared-components/markup-script/markup-script";

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
    const [currItem, seo] = await Promise.all([
        getProductBySlug(params.slug),
        getProductSeoBySlug(params.slug),
    ]);

    const fallbackTitle = currItem ? `${currItem.name} — печать на одежде | ${SITE_INFO.name}` : `Товар | ${SITE_INFO.name}`;
    const fallbackDescription = currItem?.description
        ? `${currItem.name}. ${currItem.description}`.slice(0, 300)
        : `${currItem?.name ?? 'Товар'} с печатью под заказ. Доставка по России.`;

    const metaImage = seo?.meta?.image && typeof seo.meta.image === 'object'
        ? (seo.meta.image as Media).url ?? undefined
        : undefined;

    return {
        ...buildMetadata({
            title: seo?.meta?.title ?? fallbackTitle,
            description: seo?.meta?.description ?? fallbackDescription,
            path: `/shop/${params.slug}`,
            image: metaImage ?? currItem?.image_url ?? undefined,
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
                <MarkupScript key={i} jsonLd={ld as Record<string, unknown>} />
            ))}
            <section className={styles.screen}>
                <div className={styles.photo_box}>
                    {item?.galleryPhotos && item.galleryPhotos.length > 0 ? (
                        item.galleryPhotos.map((el, index) => (
                            <Photos item={item} el={el} key={index} index={index} />
                        ))
                    ) : item?.image_url ? (
                        <Photos item={item} el={item.image_url} index={0} />
                    ) : null}
                </div>
                <Suspense>
                    <ProductInfo item={item} />
                </Suspense>
            </section>
        </>
    );
};

export default ProductPage;
