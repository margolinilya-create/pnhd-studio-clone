import React from 'react';
import styles from './page.module.css';
import Image from "next/image";
import type { StaticImageData } from "next/image";
import PriceScreen from "@/components/pages-components/main-page/price-screen/price-screen";
import MapScreen from "@/components/pages-components/main-page/map-screen/map-screen";
import { Metadata } from "next";
import { ssOptions } from '@/app/utils/method-options-data';
import {prices} from "@/app/utils/constants";
import MarkupScript from "@/components/shared-components/markup-script/markup-script";
import AdvantagesComponent from "@/components/pages-components/method-page/advantages/advantages";
import { getPrintTypeItem } from '@/lib/queries/print-type-items';



export const generateMetadata = async (props: { params: Promise<{ slug: string, type: string }>}): Promise<Metadata> => {
    const params = await props.params;
    const { slug, type } = params;

    // Try Payload first, fall back to static data
    const payloadItem = await getPrintTypeItem(slug, type);
    if (payloadItem) {
        return {
            title: payloadItem.metaTitle ?? undefined,
            description: payloadItem.metaDescription ?? undefined,
            keywords: payloadItem.metaKeywords ?? undefined,
            openGraph: {
                type: 'website',
                url: `https://studio.pnhd.ru/methods/${slug}/${type}`,
                title: payloadItem.title ?? undefined,
                description: payloadItem.subtitle ?? undefined,
                siteName: 'ПИНХЭД СТУДИЯ',
            }
        }
    }

    const option: typeof ssOptions[0] = ssOptions.filter((item) => item.slug === slug && item.type === type)[0];
    return {
        title: option?.meta.metaTitle,
        description: option?.meta.metaDescription,
        keywords: option?.meta.metaKeywords,
        openGraph: {
            type: 'website',
            url: `https://studio.pnhd.ru/${params.slug}`,
            title: option?.title,
            description: option?.subtitle,
            siteName: 'ПИНХЭД СТУДИЯ',
        }
    }
}
export const dynamicParams = false;
export const generateStaticParams = async ({ params }: { params: { slug: string }}) => {
    const filtered = ssOptions.filter((item) => item.slug === params.slug);
    return filtered.map((item) => ({type: item.type }))
}


const MethodOptionsPage: React.FC<{
    params: Promise<{ slug: string, type: string }>;
}> = async props => {
    const params = await props.params;
    const {slug, type} = params;

    // Try Payload first, fall back to static data
    const payloadItem = await getPrintTypeItem(slug, type);

    if (payloadItem) {
        const coverPath = payloadItem.coverPath ?? null;
        const galleryPaths = (payloadItem.gallery ?? [])
            .map((g) => g.path)
            .filter(Boolean) as string[];
        const title = payloadItem.title ?? '';
        const subtitle = payloadItem.subtitle ?? '';

        const jsonLdWebPage = {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": `${title} ${subtitle}`,
            "description": payloadItem.metaDescription ?? "",
            "url": `https://studio.pnhd.ru/methods/${slug}/${type}`,
            "mainEntity": {
                "@type": "Service",
                "name": title.replace(/>/g, '').trim()
            },
            ...(coverPath ? {
                "primaryImageOfPage": {
                    "@type": "ImageObject",
                    "url": `https://studio.pnhd.ru${coverPath}`,
                }
            } : {}),
        };
        const offers: object[] = [];
        prices.forEach((priceGroup) => {
            priceGroup.prices.forEach((price) => {
                const cleanedPrice = price.price.replace(/Р\./g, '').trim();
                if (cleanedPrice.includes('/')) {
                    const [whitePrice, colorPrice] = cleanedPrice.split('/').map(p => p.trim());
                    offers.push({ "@type": "Offer", "price": whitePrice, "priceCurrency": "RUB", "description": `${priceGroup.name} ${price.format} на белой ткани`, "availability": "https://schema.org/InStock" });
                    offers.push({ "@type": "Offer", "price": colorPrice, "priceCurrency": "RUB", "description": `${priceGroup.name} ${price.format} на цветной ткани`, "availability": "https://schema.org/InStock" });
                } else {
                    offers.push({ "@type": "Offer", "price": cleanedPrice, "priceCurrency": "RUB", "description": `${priceGroup.name} ${price.format}`, "availability": "https://schema.org/InStock" });
                }
            });
        });
        const jsonLdService = {
            "@context": "https://schema.org",
            "@type": "Service",
            "name": `${title} ${subtitle}`,
            "description": payloadItem.mainText ?? "",
            "provider": { "@type": "LocalBusiness", "name": "PNHD>STUDIO", "address": { "@type": "PostalAddress", "addressLocality": "Санкт-Петербург", "streetAddress": "ул. Чапыгина, д. 1" } },
            "areaServed": "Санкт-Петербург",
            "offers": offers
        };
        const jsonLdBreadcrumbList = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Главная", "item": "https://studio.pnhd.ru/" },
                { "@type": "ListItem", "position": 2, "name": "Методы печати", "item": "https://studio.pnhd.ru/methods" },
                { "@type": "ListItem", "position": 3, "name": title.replace(/>/g, '').trim(), "item": `https://studio.pnhd.ru/methods/${slug}` },
                { "@type": "ListItem", "position": 4, "name": payloadItem.metaTitle ?? `${title} ${subtitle}`, "item": `https://studio.pnhd.ru/methods/${slug}/${type}` },
            ]
        };

        return (
            <>
                <section className={styles.method_mainScreen}>
                    <div className={styles.method_titleWrapper}>
                        <h1 className={styles.method_title}>{`${title} ${subtitle}`}</h1>
                    </div>
                    {coverPath && (
                        <Image
                            src={coverPath}
                            alt="обложка"
                            className={styles.method_cover}
                            width={800}
                            height={600}
                        />
                    )}
                </section>
                <section className={styles.method_brief}>
                    <div className={styles.main_text_wrapper}>
                        <h2 className={styles.brief_title}>КРАТКО</h2>
                        <p className={styles.brief_text}>{payloadItem.mainText}</p>
                    </div>
                    <div className={styles.blocks_wrapper}>
                        <div className={styles.block}>
                            <h2 className={styles.brief_title}>ПЛЮСЫ</h2>
                            <ul className={styles.pros_list}>
                                {payloadItem.pros && payloadItem.pros.split(',').map((item, index) => (
                                    <li className={styles.pros_list_item} key={index}>{item.trim()}</li>
                                ))}
                            </ul>
                        </div>
                        <div className={styles.block}>
                            <h2 className={styles.brief_title}>МИНУСЫ</h2>
                            <ul className={styles.pros_list}>
                                {payloadItem.cons && payloadItem.cons.split(',').map((item, index) => (
                                    <li className={styles.pros_list_item} key={index}>{item.trim()}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>

                <section className={styles.method_gallery}>
                    {galleryPaths.map((path, index) => (
                        <Image
                            className={styles.gallery_img}
                            alt="print sample"
                            src={path}
                            width={400}
                            height={300}
                            loading="lazy"
                            decoding="async"
                            key={index}
                        />
                    ))}
                </section>
                <AdvantagesComponent />
                <PriceScreen />
                <MapScreen />
                <section></section>

                {payloadItem.bodyHtml && (
                    <section className={styles.method_description}>
                        <h2 className={styles.brief_title}>AI/RBTS CONTENT</h2>
                        <div className={styles.robots_block} dangerouslySetInnerHTML={{ __html: payloadItem.bodyHtml }} />
                    </section>
                )}

                <MarkupScript jsonLd={jsonLdWebPage}/>
                <MarkupScript jsonLd={jsonLdService}/>
                <MarkupScript jsonLd={jsonLdBreadcrumbList}/>
            </>
        );
    }

    // Static fallback
    const option: typeof ssOptions[0] = ssOptions.filter((item) => item.slug === slug && item.type === type)[0];

    const jsonLdWebPage = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": `${option.title} ${option.subtitle}`,
        "description": option?.meta.metaDescription ?? "",
        "url": `https://studio.pnhd.ru/methods/${option?.slug}/${option?.type}`
        ,
        "mainEntity": {
            "@type": "Service",
            "name": (option.title ?? "").replace(/>/g, '').trim()
        },
        "primaryImageOfPage": {
            "@type": "ImageObject",
            "url": `https://studio.pnhd.ru${option.cover.src ?? ""}`,
        }
    }
    const offers: object[] = [];

    prices.forEach((priceGroup) => {
        priceGroup.prices.forEach((price) => {
            const cleanedPrice = price.price.replace(/Р\./g, '').trim();
            if (cleanedPrice.includes('/')) {
                const [whitePrice, colorPrice] = cleanedPrice.split('/').map(p => p.trim());
                offers.push({
                    "@type": "Offer",
                    "price": whitePrice,
                    "priceCurrency": "RUB",
                    "description": `${priceGroup.name} ${price.format} на белой ткани`,
                    "availability": "https://schema.org/InStock"
                });
                offers.push({
                    "@type": "Offer",
                    "price": colorPrice,
                    "priceCurrency": "RUB",
                    "description": `${priceGroup.name} ${price.format} на цветной ткани`,
                    "availability": "https://schema.org/InStock"
                });
            } else {
                offers.push({
                    "@type": "Offer",
                    "price": cleanedPrice,
                    "priceCurrency": "RUB",
                    "description": `${priceGroup.name} ${price.format}`,
                    "availability": "https://schema.org/InStock"
                });
            }
        });
    });
    const jsonLdService = {
        "@context": "https://schema.org",
        "@type": "Service",
        "name": `${option.title} ${option.subtitle}`,
        "description": option?.mainText ?? "",
        "provider": {
            "@type": "LocalBusiness",
            "name": "PNHD>STUDIO",
            "address": {
                "@type": "PostalAddress",
                "addressLocality": "Санкт-Петербург",
                "streetAddress": "ул. Чапыгина, д. 1"
            }
        },
        "areaServed": "Санкт-Петербург",
        "offers": offers
    }
    const jsonLdBreadcrumbList = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Главная",
                "item": "https://studio.pnhd.ru/"
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": "Методы печати",
                "item": "https://studio.pnhd.ru/methods"
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": (option.title ?? "").replace(/>/g, '').trim(),
                "item": `https://studio.pnhd.ru/methods/${option?.slug}`
            },
            {
                "@type": "ListItem",
                "position": 4,
                "name": `${option.meta.metaTitle}`,
                "item": `https://studio.pnhd.ru/methods/${option?.slug}/${option?.type}`
            },

        ]
    }

    return (
        <>
            { option && (
                <>
                    <section className={styles.method_mainScreen}>
                        <div className={styles.method_titleWrapper}>
                            <h1
                                className={styles.method_title}
                            >{`${option.title} ${option.subtitle}`}</h1>
                        </div>
                        <Image
                            src={option.cover as StaticImageData}
                            alt="обложка"
                            className={styles.method_cover}
                        />
                    </section>
                    <section className={styles.method_brief}>
                        <div className={styles.main_text_wrapper}>
                            <h2 className={styles.brief_title}>КРАТКО</h2>
                            <p className={styles.brief_text}>{option.mainText}</p>
                        </div>
                        <div className={styles.blocks_wrapper}>
                            <div className={styles.block}>
                                <h2 className={styles.brief_title}>ПЛЮСЫ</h2>
                                <ul className={styles.pros_list}>
                                    {option.pros && option.pros.split(',').map((item, index) => (
                                        <li className={styles.pros_list_item} key={index}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className={styles.block}>
                                <h2 className={styles.brief_title}>МИНУСЫ</h2>
                                <ul className={styles.pros_list}>
                                    {option.cons && option.cons.split(',').map((item, index) => (
                                        <li className={styles.pros_list_item} key={index}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className={styles.method_gallery}>
                        {option.gallery && option.gallery.map((item, index) => (
                            <Image
                                className={styles.gallery_img}
                                alt="print sample"
                                src={item as StaticImageData}
                                loading="lazy"
                                decoding="async"
                                key={index}
                            />
                        ))}
                    </section>
                    <AdvantagesComponent />
                    <PriceScreen />
                    <MapScreen />
                    <section></section>

                    <section className={styles.method_description}>
                        <h2 className={styles.brief_title}>AI/RBTS CONTENT</h2>
                        <div className={styles.robots_block} dangerouslySetInnerHTML={option.robotsText}></div>
                    </section>

                    <MarkupScript jsonLd={jsonLdWebPage}/>
                    <MarkupScript jsonLd={jsonLdService}/>
                    <MarkupScript jsonLd={jsonLdBreadcrumbList}/>
                </>
        )}
        </>
    )
}

export default MethodOptionsPage;