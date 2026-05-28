import React from "react";
import styles from "./page.module.css";
import methodsData from "@/app/utils/print-methods-data";
import Image from "next/image";
import PriceScreen from "@/components/pages-components/main-page/price-screen/price-screen";
import MapScreen from "@/components/pages-components/main-page/map-screen/map-screen";
import { Metadata } from "next";
import DtfCalculator from "@/components/pages-components/method-page/dtf-calculator/dtf-calculator";
import Link from "next/link";
import { textileOptions } from "@/app/utils/textile-options-data";

export const generateMetadata = async (
    props: {
        params: Promise<{ slug: string }>;
    }
): Promise<Metadata> => {
    const params = await props.params;
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
    return textileOptions.map((item) => ({slug: item.slug}))
}

const MethodPage: React.FC<{
    params: Promise<{ slug: string }>;
}> = async props => {
    const params = await props.params;
    const textile = textileOptions.find((item) => item.slug === params.slug);
    //const options = ssOptions.filter((item) => item.parent === method?.name);

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
                            src={textile.cover}
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
                                src={item}
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
                        {/* <div className={styles.main_text_wrapper}>
                            <h2 className={styles.brief_title}>ЧТО ЕЩЕ ПОЧИТАТЬ?</h2>
                            <div className={styles.link_wrapper}>
                            {options && options.map((item, index) => (
                                <Link href={`/methods/${item.slug}/${item.type}`} key={index}>{item.title} {item.subtitle}</Link>
                            ))}
                            </div>
                        </div> */}
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
