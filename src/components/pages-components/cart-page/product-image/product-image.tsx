'use client'
import React, { useState } from "react";
import Link from "next/link";
import styles from './product-image.module.css';
import { ICartOrderElement } from "@/app/utils/types";

const LOCAL_PLACEHOLDER = '/product-placeholder.svg';

const ProductImage: React.FC<{ elem: ICartOrderElement }> = ({ elem }) => {
    const [imageSrc, setImageSrc] = useState(elem?.item?.image_url || LOCAL_PLACEHOLDER);

    const handleError = () => setImageSrc(LOCAL_PLACEHOLDER);

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
