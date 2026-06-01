import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import styles from './page.module.css';
import { buildMetadata } from "@/app/_lib/build-metadata";
import { getSiteSettings } from "@/lib/queries/site-settings";

export async function generateMetadata(): Promise<Metadata> {
    const settings = await getSiteSettings();
    const siteName = settings?.siteName ?? 'PINHEAD STUDIO';
    return await buildMetadata({
        title: `Заявка отправлена | ${siteName}`,
        description: 'Спасибо! Менеджер свяжется в течение 30 минут.',
        path: '/thanks',
    });
}

const Page: React.FC = () => {
    return (
        <section className={styles.page}>
            <div className={styles.wrapper}>
                <h1 className={styles.title}>СПАСИБО!</h1>
                <p className={styles.text}>
                    Заявка отправлена. Менеджер свяжется с вами <strong>в течение 30 минут</strong> по
                    указанному телефону — согласует расположение принта, итоговую стоимость и условия доставки.
                </p>
                <p className={styles.text}>
                    Если вы не получите звонок — напишите нам в Telegram <a href="https://t.me/pnhd_studio" target="_blank" rel="noopener noreferrer">@pnhd_studio</a> или
                    позвоните по номеру <a href="tel:+78129046156">+7 (812) 904-61-56</a>.
                </p>
                <div className={styles.actions}>
                    <Link href="/" className={styles.linkBtn}>На главную</Link>
                    <Link href="/shop" className={styles.linkBtnPrimary}>Вернуться в каталог</Link>
                </div>
            </div>
        </section>
    );
};

export default Page;
