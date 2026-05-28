import React from "react";
import styles from "./page.module.css";
import Image from "next/image";
import { Metadata } from "next";
import classicTee from "../../../../public/sizeChart/tee_classic_sizes.png";
import oversizeTee from "../../../../public/sizeChart/tee_oversize_sizes.png";
import freeFit from "../../../../public/sizeChart/tee_freefit_sizes.png";
import standartTee from "../../../../public/sizeChart/tee_standart_sizes.png";
import gildanTee from "../../../../public/sizeChart/tee_gildan_sizes.png";
import promoTee from "../../../../public/sizeChart/tee_promo_sizes.png";
import classicHood from "../../../../public/sizeChart/hoodie_classic_sizes.png";

const itemsArr = [
    {
        title: "Футболки CLASSIC",
        image: classicTee,
    },
    {
        title: "Футболки OVERSIZE",
        image: oversizeTee,
    },
    {
        title: "Футболки FREEFIT",
        image: freeFit,
    },
    {
        title: "Футболки BASIC STANDART",
        image: standartTee,
    },
    {
        title: "Футболки PROMO",
        image: promoTee,
    },
    {
        title: "Футболки GILDAN HAMMER",
        image: gildanTee,
    },
    {
        title: "Худи CLASSIC",
        image: classicHood,
    },
];

export const metadata: Metadata = {
    title: 'Таблицы размеров одежды | ПИНХЭД СТУДИЯ',
    description: 'Свертесь с нашей таблицей размеров одежды перед заказом печати в ПИНХЭД СТУДИЯ. Найдите идеальную посадку для ваших изделий.',
    keywords: 'печать на футболках, санкт-петербург, недорого, на заказ, цена, от 1 шт, срочный, заказать, хороший, сделать, стоимость, доставка, быстрый, качественный, черный, оверсайз, белый, онлайн, спортивный, свой дизайн, конструктор, создать макет, нанесение, собственный, толстовка, худи, студия, услуги, каталог, а3, а4, одежда, свитшот',
    metadataBase: new URL('https://studio.pnhd.ru'),
    openGraph: {
      type: 'website',
      title: 'PNHD STUDIO | Главная',
      images: '/opengraph-image.jpg',
    },
  };

const SizeChartPage: React.FC = () => {
    return (
        <section className={styles.sizeChart}>
            <h1 className={styles.sizeChart_mainTitle}>РАЗМЕРЫ / SIZE CHART</h1>
            {itemsArr.map((item, index) => (
                <div className={styles.sizeChart_item} key={index}>
                    <h2 className={styles.item_title}>{item.title}</h2>
                    <Image
                        src={item.image}
                        alt="size chart classic tee"
                        className={styles.item_img}
                    />
                </div>
            ))}
        </section>
    );
};

export default SizeChartPage;
