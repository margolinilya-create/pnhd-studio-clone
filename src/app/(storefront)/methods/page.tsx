import React from "react";
import { Metadata } from "next";
import styles from './page.module.css';
import PrintMethodsScreen from "@/components/pages-components/main-page/print-methods-screen/print-methods-screen";
import { SITE_INFO } from "@/app/constants";
import AdvantagesComponent from "@/components/pages-components/method-page/advantages/advantages";

export const generateMetadata = (): Metadata => {
    return {
        title: 'Методы печати на одежде в Санкт-Петербурге в Pinhead Studio',
        description: 'Методы нанесения принтов на одежду в Pinhead Studio. Печатаем любым способом: DTG, шелкография, термоперенос, вышивка.',
        keywords: 'печать на футболках, санкт-петербург, недорого, на заказ, цена, от 1 шт, срочный, заказать, хороший, сделать, стоимость, доставка, быстрый, качественный, черный, оверсайз, белый, онлайн, спортивный, свой дизайн, конструктор, создать макет, нанесение, собственный, толстовка, худи, студия, услуги, каталог, а3, а4, одежда, свитшот',
        metadataBase: new URL(SITE_INFO.domain),
        openGraph: {
            type: 'website',
            title: 'PNHD STUDIO | Главная',
            images: '/opengraph-image.jpg',
        },
    }
}
// export const metadata: Metadata = {
//     title: 'Методы печати на одежде в Санкт-Петербурге в Pinhead Studio',
//     description: 'Методы нанесения принтов на одежду в Pinhead Studio. Печатаем любым способом: DTG, шелкография, термоперенос, вышивка.',
//     keywords: 'печать на футболках, санкт-петербург, недорого, на заказ, цена, от 1 шт, срочный, заказать, хороший, сделать, стоимость, доставка, быстрый, качественный, черный, оверсайз, белый, онлайн, спортивный, свой дизайн, конструктор, создать макет, нанесение, собственный, толстовка, худи, студия, услуги, каталог, а3, а4, одежда, свитшот',
//     metadataBase: new URL(SITE_INFO.domain),
//     alternates: {
//       canonical: SITE_INFO.domain+'/methods',
//     },
//     openGraph: {
//       type: 'website',
//       title: 'PNHD STUDIO | Главная',
//       images: '/opengraph-image.jpg',
//     },
// };


const Page: React.FC = () => {

    return (
        <>
            <div className={styles.title_wrapper}>
                <h1 className={styles.page_title}>Методы печати</h1>
            </div>
            <AdvantagesComponent />
            <PrintMethodsScreen />
        </>
    )
}

export default Page;