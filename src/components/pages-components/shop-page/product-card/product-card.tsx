'use client'
import React, { useState } from "react";
import styles from './product-card.module.css';
import Image from "next/image";



type TCardProps = {
  title: String,
  price: Number,
  img: string,
  sizes: Array<{ qty: number, name: String }>,
  slug: string,
  badge?: string | null,
  salePercent?: string | null,
}


const LOCAL_PLACEHOLDER = '/product-placeholder.svg';

const ProductCard: React.FC<TCardProps> = ({ title, price, img, sizes, badge, salePercent }) => {
  const [imageSrc, setImageSrc] = useState(img || LOCAL_PLACEHOLDER);

  return (
    <div className={styles.card}>
      {sizes.length === 0 && (
        <div className={styles.no_stock_icon}>Нет в наличии</div>
      )}
      {badge && badge !== 'none' && (
        <div className={`${styles.badge} ${styles[`badge_${badge}` as keyof typeof styles]}`}>
          {badge === 'hot'   && 'Хит'}
          {badge === 'new'   && 'Новинка'}
          {badge === 'sale'  && (salePercent ? `-${salePercent}%` : 'Скидка')}
          {badge === 'order' && 'Под заказ'}
        </div>
      )}
      <Image
        src={imageSrc}
        alt={title.toString() || 'product photo'}
        className={styles.card_image}
        width={371}
        height={556}
        loading="lazy"
        onError={() => setImageSrc(LOCAL_PLACEHOLDER)}
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