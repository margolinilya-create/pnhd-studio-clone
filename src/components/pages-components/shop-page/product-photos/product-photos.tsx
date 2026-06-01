'use client';
import React, { useEffect, useState } from "react";
import styles from './product-photos.module.css';
import { IProduct } from "@/app/utils/types";
import { apiBaseUrl, CDN_URL } from "@/app/utils/constants";
import Image from "next/image";





// audit M3 — final fallback на локальный SVG (cdn.pnhd.ru/no%20photo.png тоже битый).
const LOCAL_PLACEHOLDER = '/product-placeholder.svg';

const Photos: React.FC<{ item: IProduct, el: string, index: number }> = ({ item, el, index }) => {
  const [imageSrc, setImageSrc] = useState(`${CDN_URL}/${item.slug}_${index}.jpg`);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (imageError) {
      setImageSrc(LOCAL_PLACEHOLDER);
    }
  }, [imageError]);

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
        // unoptimized убран — даём next/image оптимизировать (webp/avif).
        onError={() => {
          if (imageSrc.includes('cdn.pnhd.ru') && !imageError) {
            setImageSrc(`${apiBaseUrl}${el}`);
          } else if (!imageSrc.includes('cdn.pnhd.ru') && !imageError) {
            setImageError(true);
          }
        }}
      />
    </div>
  )
}

export default Photos;