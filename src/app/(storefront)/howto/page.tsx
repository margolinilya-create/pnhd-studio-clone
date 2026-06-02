import React from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";

import FeedbackScreen from "@/components/pages-components/main-page/feedback-screen/feedback-screen";
import MapScreen from "@/components/pages-components/main-page/map-screen/map-screen";

import { buildMetadata } from "@/app/_lib/build-metadata";
import { getSiteSettings } from "@/lib/queries/site-settings";
import { getStaticPage, lexicalRichTextToHtml } from "@/lib/queries/static-pages";

import cover from "../../../../public/photos_screen_image_two.png";
import tf from "../../../../public/howto/tf.jpg";
import tb from "../../../../public/howto/tb.jpg";
import ts from "../../../../public/howto/ts.jpg";
import hf from "../../../../public/howto/hf.jpg";
import hs from "../../../../public/howto/hs.jpg";
import sf from "../../../../public/howto/sf.jpg";

import styles from "./page.module.css";

export const revalidate = 60;

const imgArr = [tf, tb, ts, hf, hs, sf];

export async function generateMetadata(): Promise<Metadata> {
    const settings = await getSiteSettings();
    const siteName = settings?.siteName ?? "PINHEAD STUDIO";
    return await buildMetadata({
        title: `Как заказать печать на одежде | ${siteName}`,
        description:
            "Пошаговая инструкция: выбираете одежду в каталоге, размер, расположение принта (грудь/спина/рукав), загружаете макет — менеджер связывается в течение 30 минут.",
        path: "/howto",
    });
}

const Page = async (props: { searchParams?: Promise<{ preview?: string }> }) => {
    const searchParams = (await props.searchParams) ?? {};
    const preview = searchParams.preview === "true";
    const page = await getStaticPage("howto", { preview });

    if (!page) {
        notFound();
    }

    const steps = page.howtoSteps ?? [];

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
                        Заказать печать у нас — это 6 простых шагов. Вы выбираете одежду из{" "}
                        <Link href="/shop">каталога</Link>, размер и место принта, загружаете макет (PNG, JPG или WEBP),
                        оставляете контакты — а менеджер связывается в течение 30 минут, чтобы согласовать
                        итоговое расположение, цену и сроки. Никакого 3D-конструктора, никакого долгого онбординга:
                        одобрение макета и оплата происходят в переписке с дизайнером.
                    </p>
                </div>
            </section>

            <section className={styles.method_brief}>
                {steps.map((step) => (
                    <div className={styles.card} key={step.id ?? step.title}>
                        <h2 className={styles.brief_title}>{step.title}</h2>
                        <div
                            className={styles.brief_text}
                            dangerouslySetInnerHTML={{ __html: lexicalRichTextToHtml(step.body) }}
                        />
                    </div>
                ))}
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
