import React from "react";
import styles from './shop-lead-screen.module.css';

import Link from "next/link";

import Image from "next/image";
import shop_screen_left_shape from '../../../../../public/shop_lead_left_shape.svg'
import shop_screen_right_shape from '../../../../../public/shop_lead_right_shape.svg'
import TeeClient from '../main-screen/tee-client';

export type ShopLeadScreenProps = {
    title?: string | null;
    subtitle?: string | null;
    ctaLabel?: string | null;
    ctaHref?: string | null;
    isExternal?: boolean | null;
};

const DEFAULT_TITLE = 'открой каталог и закажи одежду с уникальными';
const DEFAULT_SUBTITLE = 'принтами';
const DEFAULT_CTA_LABEL = 'перейти в каталог';
const DEFAULT_CTA_HREF = '/shop';

const ShopLeadScreen: React.FC<ShopLeadScreenProps> = ({
    title,
    subtitle,
    ctaLabel,
    ctaHref,
    isExternal,
}) => {
    const resolvedTitle = title ?? DEFAULT_TITLE;
    const resolvedSubtitle = subtitle ?? DEFAULT_SUBTITLE;
    const resolvedCtaLabel = ctaLabel ?? DEFAULT_CTA_LABEL;
    const resolvedCtaHref = ctaHref ?? DEFAULT_CTA_HREF;

    const linkProps = isExternal
        ? { target: '_blank' as const, rel: 'noopener noreferrer' as const }
        : {};

    return (
        <section className={styles.screen}>
            <h2 className={styles.screen_titleWrapper}>
                <span className={styles.screen_title}>{resolvedTitle}</span>
                {resolvedSubtitle && (
                    <span className={styles.screen_subtitle}>{resolvedSubtitle}</span>
                )}
            </h2>

            <div className={styles.screen_box}>
                <div className={styles.box_shapeWrapper}>
                    <Image src={shop_screen_left_shape} alt='графическая форма' className={styles.box_shape} />
                </div>
                <Link href={resolvedCtaHref} className={styles.box_link} {...linkProps}>
                    <button className={styles.box_linkButton}>{resolvedCtaLabel}</button>
                </Link>
                <div className={styles.box_shapeWrapper}>
                    <Image src={shop_screen_right_shape} alt='графическая форма' className={styles.box_shape} />
                </div>
                <div className={styles.box_imageWrapper}>
                    <TeeClient backdropStatus={false} fov={15} />
                </div>
            </div>
        </section>
    )
}

export default ShopLeadScreen;
