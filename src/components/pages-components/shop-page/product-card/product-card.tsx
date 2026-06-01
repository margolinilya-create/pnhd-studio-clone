'use client'
import React, { useEffect, useState } from "react";
import styles from './product-card.module.css';
import { CDN_URL } from "@/app/utils/constants";
import Image from "next/image";



type TCardProps = {
  title: String,
  price: Number,
  img: string,
  sizes: Array<{ qty: number, name: String }>,
  slug: string
}


// audit M3 — раньше fallback цепочка: cdn.pnhd.ru/${slug}_0.jpg → img prop
// → cdn.pnhd.ru/no%20photo.png. Сам final placeholder тоже на cdn.pnhd.ru
// (часть 15 of 25 битых). Теперь fallback в локальный SVG placeholder.
const LOCAL_PLACEHOLDER = '/product-placeholder.svg';

const ProductCard: React.FC<TCardProps> = ({ title, price, img, sizes, slug }) => {
  const [imageSrc, setImageSrc] = useState(`${CDN_URL}/${slug}_0.jpg`);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (imageError) {
      setImageSrc(LOCAL_PLACEHOLDER);
    }
  }, [imageError]);

  return (
    <div className={styles.card}>
      {sizes.length === 0 && (
        <div className={styles.no_stock_icon}>Нет в наличии</div>
      )}
      <Image
        src={imageSrc}
        alt={title.toString() || 'product photo'}
        className={styles.card_image}
        width={371}
        height={556}
        loading="lazy"
        // unoptimized убран — теперь next/image даст webp/avif + lazy через _next/image
        onError={() => {
          if (imageSrc.includes('cdn.pnhd.ru') && !imageError) {
            setImageSrc(img ?? LOCAL_PLACEHOLDER);
          } else if (!imageSrc.includes('cdn.pnhd.ru') && !imageError) {
            setImageError(true);
          }
        }}
      />
      <div className={styles.card_caption}>
        <p className={styles.card_title}>{title}</p>
        <p className={styles.card_price}>
          {price.toString()}
          {' '}
          Р.
        </p>
      </div>
    </div>
  )
}

// PR #5: ProductCard рендерится 25+ раз в каталоге; memo предотвращает
// каскадные ре-рендеры при изменении IntersectionObserver state в parent.
export default React.memo(ProductCard);