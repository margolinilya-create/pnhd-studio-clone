import React from "react";
import styles from './catalogLeadScreen.module.css';
import Image, { type StaticImageData } from "next/image";
import tshirt from './assets/tshirt.png'
import sweatshirt from './assets/sweatshirt.png'
import hoodie from './assets/hoodie.png'
import totebag from './assets/tote.png'
import cap from './assets/hat.png'
import pullover from './assets/pullover.png'
import Link from "next/link";

// Static image lookup. Block can either reference a Media upload OR pick from this set
// via `imageSlug`. Falls back to tshirt if neither is provided.
const IMAGE_BY_SLUG: Record<string, StaticImageData> = {
    tshirt,
    sweatshirt,
    hoodie,
    pullover,
    totebag,
    cap,
};

type CategoryItem = {
    title: string;
    href: string;
    bgColor: string;
    color: string;
    imageSlug?: string | null;
    image?: { url?: string | null; alt?: string | null } | null;
};

export type CatalogLeadScreenProps = {
    sectionTitle?: string | null;
    subtitle?: string | null;
    items?: CategoryItem[] | null;
};

// Fallback config — preserves original (pre-Payload) content.
const DEFAULT_ITEMS: CategoryItem[] = [
    { title: '> Футболки',  href: '/futbolki',  bgColor: '#F3F4F3', color: 'black', imageSlug: 'tshirt' },
    { title: '> Свитшоты',  href: '/svitshoty', bgColor: '#393939', color: 'white', imageSlug: 'sweatshirt' },
    { title: '> Толстовки', href: '/longslivy', bgColor: '#F3F4F3', color: 'black', imageSlug: 'pullover' },
    { title: '> Худи',      href: '/hudi',      bgColor: '#393939', color: 'white', imageSlug: 'hoodie' },
    { title: '> Шопперы',   href: '/shoppery',  bgColor: '#F3F4F3', color: 'black', imageSlug: 'totebag' },
    { title: '> Кепки',     href: '/kepki',     bgColor: '#393939', color: 'white', imageSlug: 'cap' },
];

const CatalogLeadScreen: React.FC<CatalogLeadScreenProps> = ({ sectionTitle, subtitle, items }) => {
    const resolvedItems = items && items.length > 0 ? items : DEFAULT_ITEMS;
    const resolvedTitle = sectionTitle ?? 'Каталог одежды';
    const resolvedSubtitle = subtitle ?? 'отражай индивидуальность в мерче';

    return (
        <section className={styles.catalogLeadScreen}>
            <header className={styles.catalogLeadScreen__header}>
                <h2 className={styles.catalogLeadScreen__title}>{resolvedTitle}</h2>
                <p className={styles.catalogLeadScreen__subtitle}>{resolvedSubtitle}</p>
            </header>
            <div className={styles.catalogLeadScreen__content}>
                {resolvedItems.map((item, index) => {
                    const uploadedUrl = item.image?.url ?? null;
                    const fallbackImg = item.imageSlug ? IMAGE_BY_SLUG[item.imageSlug] : undefined;
                    const altText = item.image?.alt ?? item.title;
                    return (
                        <div key={index} className={styles.catalogLeadScreen__item} style={{ backgroundColor: item.bgColor }}>
                            <Link href={item.href} className={styles.catalogLeadScreen__itemTitle} style={{ color: item.color }}>
                                {item.title}
                            </Link>
                            <div className={styles.catalogLeadScreen__itemImageWrapper}>
                                {uploadedUrl ? (
                                    <Image
                                        src={uploadedUrl}
                                        alt={altText}
                                        width={400}
                                        height={400}
                                        className={styles.catalogLeadScreen__itemImageWrapper_image}
                                    />
                                ) : fallbackImg ? (
                                    <Image
                                        src={fallbackImg}
                                        alt={altText}
                                        className={styles.catalogLeadScreen__itemImageWrapper_image}
                                    />
                                ) : null}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    )
}

export default CatalogLeadScreen;
