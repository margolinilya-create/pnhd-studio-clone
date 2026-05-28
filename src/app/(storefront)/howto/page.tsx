import React from "react";
import styles from "./page.module.css";
import cover from "../../../../public/photos_screen_image_two.png";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";

import FeedbackScreen from "@/components/pages-components/main-page/feedback-screen/feedback-screen";
import MapScreen from "@/components/pages-components/main-page/map-screen/map-screen";

import tf from "../../../../public/howto/tf.jpg";
import tb from "../../../../public/howto/tb.jpg";
import ts from "../../../../public/howto/ts.jpg";
import hf from "../../../../public/howto/hf.jpg";
import hs from "../../../../public/howto/hs.jpg";
import sf from "../../../../public/howto/sf.jpg";
import { buildMetadata } from "@/app/_lib/build-metadata";

const imgArr = [tf, tb, ts, hf, hs, sf];

export const generateMetadata = (): Metadata => buildMetadata({
    title: 'Как заказать печать на одежде | PINHEAD STUDIO',
    description: 'Пошаговая инструкция: выбираете одежду в каталоге, размер, расположение принта (грудь/спина/рукав), загружаете макет — менеджер связывается в течение 30 минут.',
    path: '/howto',
});

const Page: React.FC = () => {
    return (
        <>
            <section className={styles.method_mainScreen}>
                <div className={styles.method_titleWrapper}>
                    <h1 className={styles.method_title}>{`HOW TO > КАК ЗАКАЗАТЬ`}</h1>
                </div>
                <Image src={cover} alt="обложка" className={styles.method_cover} />
            </section>

            <section className={styles.method_brief}>
                <div className={styles.main_text_wrapper}>
                    <h2 className={styles.brief_title}>КАК ЭТО РАБОТАЕТ</h2>
                    <p className={styles.brief_text}>
                        Заказать печать у нас — это 6 простых шагов. Вы выбираете одежду из{' '}
                        <Link href="/shop">каталога</Link>, размер и место принта, загружаете макет (PNG, JPG или WEBP),
                        оставляете контакты — а менеджер связывается в течение 30 минут, чтобы согласовать
                        итоговое расположение, цену и сроки. Никакого 3D-конструктора, никакого долгого онбординга:
                        одобрение макета и оплата происходят в переписке с дизайнером.
                    </p>
                </div>
            </section>

            <section className={styles.method_brief}>
                <div className={styles.card}>
                    <h2 className={styles.brief_title}>1. ВЫБЕРИ ОДЕЖДУ</h2>
                    <p className={styles.brief_text}>
                        Перейди в <Link href="/shop">каталог</Link> и выбери понравившийся товар — футболку, худи,
                        свитшот, лонгслив, кепку или шоппер. Кликни на карточку, чтобы открыть страницу товара.
                    </p>
                </div>
                <div className={styles.card}>
                    <h2 className={styles.brief_title}>2. ВЫБЕРИ РАЗМЕР</h2>
                    <p className={styles.brief_text}>
                        В правой панели карточки товара укажи нужный размер. Под каждой кнопкой указано
                        количество в наличии — sold out размеры подсвечены.
                    </p>
                </div>
                <div className={styles.card}>
                    <h2 className={styles.brief_title}>3. ВЫБЕРИ МЕСТО ПРИНТА</h2>
                    <p className={styles.brief_text}>
                        Тыкни на одну из 5 кнопок: «На груди», «На спине», «На рукаве», «На груди и спине» или
                        «Без принта». Под каждой кнопкой появятся слоты для загрузки файлов.
                    </p>
                </div>
                <div className={styles.card}>
                    <h2 className={styles.brief_title}>4. ЗАГРУЗИ МАКЕТ</h2>
                    <p className={styles.brief_text}>
                        Перетащи в слот PNG, JPG или WEBP (до 20 МБ каждый). Если есть только идея — оставь
                        слот пустым и опиши задачу в комментарии при оформлении: менеджер поможет с макетом.
                    </p>
                </div>
                <div className={styles.card}>
                    <h2 className={styles.brief_title}>5. ОФОРМИ ЗАЯВКУ</h2>
                    <p className={styles.brief_text}>
                        Нажми «В корзину», открой страницу <Link href="/cart">корзины</Link> и оформи заявку.
                        Достаточно имени, телефона и города доставки — менеджер сам уточнит детали.
                    </p>
                </div>
                <div className={styles.card}>
                    <h2 className={styles.brief_title}>6. СОГЛАСУЕМ И ПЕЧАТАЕМ</h2>
                    <p className={styles.brief_text}>
                        В течение 30 минут с тобой свяжется менеджер: уточнит расположение, размер принта,
                        технологию печати, окончательную стоимость и сроки. После согласования и оплаты
                        отправляем в производство — типичный срок 3-7 рабочих дней + доставка СДЭКом.
                    </p>
                </div>
            </section>
            <section className={styles.method_gallery}>
                {imgArr.map((item, index) => (
                    <Image
                        className={styles.gallery_img}
                        alt="примеры расположения принтов"
                        src={item}
                        loading="lazy"
                        decoding="async"
                        key={index}
                    />
                ))}
            </section>
            <FeedbackScreen />
            <MapScreen />
        </>
    );
};

export default Page;
