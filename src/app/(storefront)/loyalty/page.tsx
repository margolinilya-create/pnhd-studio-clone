import React from "react";
import styles from "./page.module.css";
import { Metadata } from "next";
import FeedbackScreen from "@/components/pages-components/main-page/feedback-screen/feedback-screen";
import MapScreen from "@/components/pages-components/main-page/map-screen/map-screen";
import Link from "next/link";
import LoyaltyCarousel from "./loyalty-carousel";

export const metadata: Metadata = {
    title: "Программа лояльности Pinhead Studio — бонусы за заказы",
    description:
        "Программа лояльности Пинхэд Студии: накапливайте бонусы за каждый заказ и оплачивайте до 50% стоимости. 500 бонусов после регистрации. Кешбэк до 10%.",
    keywords:
        "программа лояльности, бонусы, кешбэк, печать на одежде, скидки, Pinhead Studio",
    metadataBase: new URL("https://studio.pnhd.ru"),
    alternates: {
        canonical: "/loyalty",
    },
    openGraph: {
        type: "website",
        title: "Программа лояльности Pinhead Studio",
        images: "/opengraph-image.jpg",
    },
};

const levels = [
    {
        level: "Уровень 1",
        sum: "до 3 000 ₽",
        cashback: null,
        label: "базовый",
    },
    {
        level: "Уровень 2",
        sum: "от 3 000 ₽",
        cashback: "3%",
        label: null,
    },
    {
        level: "Уровень 3",
        sum: "от 10 000 ₽",
        cashback: "5%",
        label: null,
    },
    {
        level: "Уровень 4",
        sum: "от 30 000 ₽",
        cashback: "7%",
        label: null,
    },
    {
        level: "Уровень 5",
        sum: "от 100 000 ₽",
        cashback: "10%",
        label: null,
    },
];

const Page: React.FC = () => {
    return (
        <>
            <section className={styles.hero}>
                <div className={styles.hero_content}>
                    <p className={styles.hero_eyebrow}>Программа лояльности Pinhead Studio</p>
                    <h1 className={styles.hero_title}>Оплачивайте до&nbsp;50%&nbsp;заказа бонусами</h1>
                    <p className={styles.hero_sub}>1 бонус = 1 ₽ &nbsp;·&nbsp; кешбэк до 10% &nbsp;·&nbsp; 500 бонусов при регистрации</p>
                    <Link href="https://t.me/pnhd_bonus_bot" target="_blank" className={styles.hero_button}>Зарегистрироваться в боте</Link>
                </div>
            </section>

            <section className={styles.section}>
                <div className={styles.card}>
                    <h2 className={styles.card_title}>О программе</h2>
                    <p className={styles.card_text}>
                        Программа лояльности Пинхэд Студии — это простой способ возвращать часть денег с каждого заказа.
                        Вы становитесь участником сразу после регистрации:
                    </p>
                    <ul className={styles.list}>
                        <li>через QR-код в студии</li>
                        <li><Link href="https://t.me/pnhd_bonus_bot" target="_blank" className={styles.inline_link}>через Telegram-бота</Link></li>
                        <li>или с помощью администратора</li>
                    </ul>
                    <p className={styles.card_text}>
                        Если у вас есть карта лояльности — значит, вы уже в системе.
                    </p>
                    <p className={styles.card_text}>
                        Всё максимально просто: вы делаете заказы — мы возвращаем часть суммы бонусами.
                    </p>
                    <ul className={styles.list}>
                        <li>1 бонус = 1 рубль</li>
                        <li>Бонусами можно оплатить до 50% стоимости заказа</li>
                        <li>Чем больше вы печатаете — тем выше ваш кешбэк</li>
                    </ul>
                </div>
            </section>

            <section className={styles.section}>
                <h2 className={styles.section_title}>Уровни программы</h2>
                <p className={styles.section_subtitle}>В Пинхэд Студии действует накопительная система уровней. Чем выше уровень — тем выгоднее каждый следующий заказ.</p>
                <div className={styles.levels_grid}>
                    {levels.map((item) => (
                        <div
                            key={item.level}
                            className={styles.level_card}
                        >
                            <p className={styles.level_name}>{item.level}</p>
                            <p className={styles.level_sum}>{item.sum}</p>
                            {item.cashback ? (
                                <p className={styles.level_cashback}>{item.cashback}</p>
                            ) : (
                                <p className={styles.level_no_cashback}>без кешбэка</p>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            <LoyaltyCarousel />

            <section className={styles.section}>
                <div className={`${styles.card} ${styles.support_card}`}>
                    <h2 className={styles.card_title}>Поддержка</h2>
                    <p className={styles.card_text}>
                        Если у вас возникли вопросы, обратитесь к администратору Пинхэд Студии — мы поможем разобраться.
                    </p>
                    <div className={styles.support_buttons}>
                        <Link href="https://t.me/pnhd_bonus_bot" target="_blank" className={styles.support_link}>Telegram-бот</Link>
                        <Link href="/contacts" className={styles.support_link}>Контакты</Link>
                    </div>
                </div>
            </section>

            <FeedbackScreen />
            <MapScreen />
        </>
    );
};

export default Page;
