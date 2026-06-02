import React from "react";
import styles from "./page.module.css";
import Image from "next/image";
import PriceScreen from "@/components/pages-components/main-page/price-screen/price-screen";
import MapScreen from "@/components/pages-components/main-page/map-screen/map-screen";
import { Metadata } from "next";
import Link from "next/link";
import { textileOptions } from "@/app/utils/textile-options-data";
import { getTextilePage } from "@/lib/queries/textile-pages";
import type { StaticImageData } from "next/image";

export const generateMetadata = async (
    props: {
        params: Promise<{ slug: string }>;
    }
): Promise<Metadata> => {
    const params = await props.params;

    // Try Payload first, fall back to static data
    const payloadPage = await getTextilePage(params.slug);
    if (payloadPage) {
        return {
            title: payloadPage.metaTitle ?? undefined,
            description: payloadPage.metaDescription ?? undefined,
            keywords: payloadPage.metaKeywords ?? undefined,
            openGraph: {
                type: "website",
                url: `https://studio.pnhd.ru/textile/${params.slug}`,
                title: payloadPage.metaTitle ?? undefined,
                description: payloadPage.metaDescription ?? undefined,
                siteName: "ПИНХЭД СТУДИЯ",
            },
        };
    }

    const option = textileOptions.find((item) => item.slug === params.slug);
    return {
        title: option?.meta.metaTitle,
        description: option?.meta.metaDescription,
        keywords: option?.meta.metaKeywords,
        openGraph: {
            type: "website",
            url: `https://studio.pnhd.ru/textile/${params.slug}`,
            title: option?.meta.metaTitle,
            description: option?.meta.metaDescription,
            siteName: "ПИНХЭД СТУДИЯ",
        },
    };
};

export const dynamicParams = false;
export const generateStaticParams = async () => {
    // Static params always use the static data list to ensure zero-downtime build
    return textileOptions.map((item) => ({slug: item.slug}))
}

const MethodPage: React.FC<{
    params: Promise<{ slug: string }>;
}> = async props => {
    const params = await props.params;

    // Try Payload first, fall back to static data
    const payloadPage = await getTextilePage(params.slug);

    if (payloadPage) {
        const coverPath = payloadPage.coverPath ?? null;
        const galleryPaths = (payloadPage.gallery ?? [])
            .map((g) => g.path)
            .filter(Boolean) as string[];

        return (
            <>
                <section className={styles.method_mainScreen}>
                    <div className={styles.method_titleWrapper}>
                        <h1 className={styles.method_title}>
                            {`${payloadPage.title ?? ''} ${payloadPage.subtitle ?? ''}`}
                        </h1>
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
                        <p className={styles.brief_text}>{payloadPage.mainText}</p>
                    </div>
                    {(payloadPage.pros || payloadPage.cons) && (
                        <div className={styles.blocks_wrapper}>
                            <div className={styles.block}>
                                <h2 className={styles.brief_title}>ПЛЮСЫ</h2>
                                <ul className={styles.pros_list}>
                                    {payloadPage.pros && payloadPage.pros.split(',').map((item, index) => (
                                        <li className={styles.pros_list_item} key={index}>{item.trim()}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className={styles.block}>
                                <h2 className={styles.brief_title}>МИНУСЫ</h2>
                                <ul className={styles.pros_list}>
                                    {payloadPage.cons && payloadPage.cons.split(',').map((item, index) => (
                                        <li className={styles.pros_list_item} key={index}>{item.trim()}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
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

                <PriceScreen />
                <MapScreen />
                <section className={styles.more_block}>
                    <div className={styles.main_text_wrapper}>
                        <h2 className={styles.brief_title}>ЧТО ДАЛЬШЕ?</h2>
                        <div className={styles.link_wrapper}>
                            <Link href="/methods">К методам печати</Link>
                            <Link href="/">На главную</Link>
                            <Link href="/shop">В каталог</Link>
                        </div>
                    </div>
                </section>

                {payloadPage.bodyHtml && (
                    <section className={styles.method_description}>
                        <h2 className={styles.brief_title}>AI/RBTS CONTENT</h2>
                        <div
                            className={styles.robots_block}
                            dangerouslySetInnerHTML={{ __html: payloadPage.bodyHtml }}
                        />
                    </section>
                )}
            </>
        );
    }

    // Static fallback
    const textile = textileOptions.find((item) => item.slug === params.slug);

    return (
        <>
            {textile && (
                <>
                    <section className={styles.method_mainScreen}>
                        <div className={styles.method_titleWrapper}>
                            <h1
                                className={styles.method_title}
                            >{`${textile.title} ${textile.subtitle}`}</h1>
                        </div>
                        <Image
                            src={textile.cover as StaticImageData}
                            alt="обложка"
                            className={styles.method_cover}
                        />
                    </section>
                    <section className={styles.method_brief}>
                        <div className={styles.main_text_wrapper}>
                            <h2 className={styles.brief_title}>КРАТКО</h2>
                            <p className={styles.brief_text}>{textile.mainText}</p>
                        </div>
                        <div className={styles.blocks_wrapper}>
                            <div className={styles.block}>
                                <h2 className={styles.brief_title}>ПЛЮСЫ</h2>
                                <ul className={styles.pros_list}>
                                    {textile.pros && textile.pros.split(',').map((item, index) => (
                                        <li className={styles.pros_list_item} key={index}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className={styles.block}>
                                <h2 className={styles.brief_title}>МИНУСЫ</h2>
                                <ul className={styles.pros_list}>
                                    {textile.cons && textile.cons.split(',').map((item, index) => (
                                        <li className={styles.pros_list_item} key={index}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className={styles.method_gallery}>
                        {textile?.gallery?.map((item, index) => (
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

                    <PriceScreen />
                    <MapScreen />
                    <section className={styles.more_block}>
                        <div className={styles.main_text_wrapper}>
                            <h2 className={styles.brief_title}>ЧТО ДАЛЬШЕ?</h2>
                            <div className={styles.link_wrapper}>
                                <Link href="/methods">К методам печати</Link>
                                <Link href="/">На главную</Link>
                                <Link href="/shop">В каталог</Link>
                            </div>
                        </div>
                    </section>

                    <section className={styles.method_description}>
                        <h2 className={styles.brief_title}>AI/RBTS CONTENT</h2>

                        <div
                            className={styles.robots_block}
                            dangerouslySetInnerHTML={textile.robotsText}
                        ></div>
                    </section>
                </>
            )}
        </>
    );
};
export default MethodPage;
