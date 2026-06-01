'use client';
import React, { useState } from "react";
import styles from './product-photos.module.css';
import { IProduct } from "@/app/utils/types";
import Image from "next/image";

const LOCAL_PLACEHOLDER = '/product-placeholder.svg';

const Photos: React.FC<{ item: IProduct, el: string, index: number }> = ({ item, el, index }) => {
  const [imageSrc, setImageSrc] = useState(el || LOCAL_PLACEHOLDER);

  return (
    <div className={styles.photo_wrapper}>
      <Image
        src={imageSrc}
        alt={item.name ?? 'product photo'}
        className={styles.photo}
        width={371}
        height={556}
        loading={index === 0 ? 'eager' : 'lazy'}
        priority={index === 0}
        onError={() => setImageSrc(LOCAL_PLACEHOLDER)}
      />
    </div>
  )
}

export default Photos;
