import React from "react";
import Image from "next/image";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import type { StaticImageData } from "next/image";

import { getStaticPage } from "@/lib/queries/static-pages";

import styles from "./page.module.css";

import classicTee from "../../../../public/sizeChart/tee_classic_sizes.png";
import oversizeTee from "../../../../public/sizeChart/tee_oversize_sizes.png";
import freeFit from "../../../../public/sizeChart/tee_freefit_sizes.png";
import standartTee from "../../../../public/sizeChart/tee_standart_sizes.png";
import gildanTee from "../../../../public/sizeChart/tee_gildan_sizes.png";
import promoTee from "../../../../public/sizeChart/tee_promo_sizes.png";
import classicHood from "../../../../public/sizeChart/hoodie_classic_sizes.png";

export const revalidate = 60;

export const metadata: Metadata = {
    title: "Таблицы размеров одежды | ПИНХЭД СТУДИЯ",
    description:
        "Свертесь с нашей таблицей размеров одежды перед заказом печати в ПИНХЭД СТУДИЯ. Найдите идеальную посадку для ваших изделий.",
    keywords:
        "печать на футболках, санкт-петербург, недорого, на заказ, цена, от 1 шт, срочный, заказать, хороший, сделать, стоимость, доставка, быстрый, качественный, черный, оверсайз, белый, онлайн, спортивный, свой дизайн, конструктор, создать макет, нанесение, собственный, толстовка, худи, студия, услуги, каталог, а3, а4, одежда, свитшот",
    metadataBase: new URL("https://studio.pnhd.ru"),
    openGraph: {
        type: "website",
        title: "PNHD STUDIO | Главная",
        images: "/opengraph-image.jpg",
    },
};

// Fallback static images keyed by `type` text — used until admin uploads media
// for sizeChartItems via Payload admin UI.
const FALLBACK_IMAGES: Record<string, StaticImageData> = {
    "Футболки CLASSIC": classicTee,
    "Футболки OVERSIZE": oversizeTee,
    "Футболки FREEFIT": freeFit,
    "Футболки BASIC STANDART": standartTee,
    "Футболки PROMO": promoTee,
    "Футболки GILDAN HAMMER": gildanTee,
    "Худи CLASSIC": classicHood,
};

const SizeChartPage = async (props: { searchParams?: Promise<{ preview?: string }> }) => {
    const searchParams = (await props.searchParams) ?? {};
    const preview = searchParams.preview === "true";
    const page = await getStaticPage("size_chart", { preview });

    if (!page) {
        notFound();
    }

    const items = page.sizeChartItems ?? [];

    return (
        <section className={styles.sizeChart}>
            <h1 className={styles.sizeChart_mainTitle}>РАЗМЕРЫ / SIZE CHART</h1>
            {items.map((item) => {
                // Payload image field is `(number | null) | Media` — only render when populated.
                const payloadImage =
                    item.image && typeof item.image === "object" ? item.image : null;
                const fallbackImage = FALLBACK_IMAGES[item.type] ?? null;

                return (
                    <div className={styles.sizeChart_item} key={item.id ?? item.type}>
                        <h2 className={styles.item_title}>{item.type}</h2>
                        {payloadImage?.url ? (
                            <Image
                                src={payloadImage.url}
                                alt={payloadImage.alt ?? `size chart ${item.type}`}
                                width={payloadImage.width ?? 800}
                                height={payloadImage.height ?? 600}
                                className={styles.item_img}
                            />
                        ) : fallbackImage ? (
                            <Image
                                src={fallbackImage}
                                alt={`size chart ${item.type}`}
                                className={styles.item_img}
                            />
                        ) : null}
                    </div>
                );
            })}
        </section>
    );
};

export default SizeChartPage;
