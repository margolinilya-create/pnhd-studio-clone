'use client'
import React, { useState, useMemo } from "react";
import Link from "next/link";
import styles from './product-image.module.css';
import { ICartOrderElement } from "@/app/utils/types";
import { CDN_URL } from "@/app/utils/constants";

const ProductImage: React.FC<{ elem: ICartOrderElement }> = ({ elem }) => {
    // Источники в порядке убывания доверия:
    //   1. Supabase product.image_url (после PR #3 — это абсолютный URL на cdn.pnhd.ru / Storage)
    //   2. cdn.pnhd.ru/<slug>_0.jpg (legacy convention из импорта)
    //   3. /no-photo.png placeholder
    const candidates = useMemo(() => {
        const list: string[] = [];
        if (elem?.item?.image_url) list.push(elem.item.image_url);
        list.push(`${CDN_URL}/${elem.item.slug}_0.jpg`);
        list.push(`${CDN_URL}/no-photo.png`);
        return list;
    }, [elem?.item?.image_url, elem.item.slug]);

    const [srcIndex, setSrcIndex] = useState(0);
    const imageSrc = candidates[srcIndex];

    const handleError = () => {
        if (srcIndex < candidates.length - 1) {
            setSrcIndex(srcIndex + 1);
        }
    };

    return (
        <div className={styles.cart_productImageWrapper}>
            <Link href={`/shop/${elem.item.slug}`} className={styles.cart_link}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={imageSrc}
                    alt={elem.item.name}
                    className={styles.cart_productImage}
                    loading="lazy"
                    onError={handleError}
                />
            </Link>
        </div>
    );
};

export default ProductImage;
