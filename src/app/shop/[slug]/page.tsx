import React from "react";
import { notFound } from "next/navigation";
import styles from "./page.module.css";
import { getAllProductSlugs, getProductBySlug } from "@/lib/queries/products";
import Photos from "@/components/pages-components/shop-page/product-photos/product-photos";
import ProductDescription from "@/components/pages-components/shop-page/product-description/product-description";
import {Metadata} from 'next'
import { CDN_URL } from "@/app/utils/constants";
import {SITE_INFO} from "@/app/constants";

type TMetadataProps = {
    params: { slug: string },
    searchParams: { id: string },
}

export const generateStaticParams = async () => {
    const slugs = await getAllProductSlugs();
    return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({params, searchParams}: TMetadataProps): Promise<Metadata> {
    const currItem = await getProductBySlug(params.slug);

    return {
        title: `${currItem?.name} | PINHEAD STUDIO`,
        description: `${currItem?.name} - ${currItem?.description}`,
        keywords: [currItem?.category!, currItem?.type!, currItem?.color!],
        openGraph: {
            images: currItem?.image_url,
            type: 'website',
            url: `https://studio.pnhd.ru/shop/${params.slug}?id=${searchParams.id}`,
            description: currItem?.description,
            siteName: 'PINHEAD STUDIO',
            title: currItem?.name,
        },
        alternates: {
            canonical: SITE_INFO.domain + '/shop/' + params.slug
        },
    }
}


const ProductPage: React.FC<{
    params: { slug: string };
    searchParams: { id: string };
}> = async ({ params, searchParams }) => {

    const item = await getProductBySlug(params.slug);
    if (!item) notFound();
    return (
        <section className={styles.screen}>
            {/* <Photos item={item} /> */}
            <div className={styles.photo_box}>
                {item?.galleryPhotos && item.galleryPhotos.length > 0 && item?.galleryPhotos?.map((el, index) => {
                    return (
                        <Photos item={item} el={el} key={index} index={index} />
                    )
                })}
                {(!item?.galleryPhotos || item.galleryPhotos.length === 0) && [1,2,3,4].map((el, index) => {
                    return (
                        <Photos item={item} el={`${CDN_URL}/${item.slug}_${index}.jpg`} key={el} index={index} />
                    )
                })}
            </div>
            <ProductDescription item={item} />
        </section>
    );
};

export default ProductPage;
