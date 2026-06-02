import React from "react";
import styles from "./stages-screen.module.css";
import Link from "next/link";
import Image, { type StaticImageData } from "next/image";
import button_arrow_right from "../../../../../public/button_arrow_right.svg";
import stages_photo_one from "../../../../../public/stages_photo_one.png";
import stage_photo_two from "../../../../../public/stage_photo_two.png";
import stage_photo_three from "../../../../../public/stage_photo_three.png";
import stage_photo_four from "../../../../../public/stage_photo_four.png";

const IMAGE_BY_SLUG: Record<string, StaticImageData> = {
    stage1: stages_photo_one,
    stage2: stage_photo_two,
    stage3: stage_photo_three,
    stage4: stage_photo_four,
};

type StageItem = {
    title: string;
    text: string;
    imageSlug?: string | null;
    image?: { url?: string | null; alt?: string | null } | null;
};

export type StagesScreenProps = {
    sectionTitle?: string | null;
    ctaHref?: string | null;
    items?: StageItem[] | null;
};

const DEFAULT_TITLE =
    'почувствуй себя дизайнером и собери мерч за 4 шага';
const DEFAULT_CTA_HREF = '/shop';
const DEFAULT_ITEMS: StageItem[] = [
    {
        title: 'Выбери одежду из каталога',
        text: 'Открой каталог и выбери текстиль нужного фасона, размера и цвета',
        imageSlug: 'stage1',
    },
    {
        title: 'Расположи принт на вещи и узнай стоимость',
        text: 'Прямо на странице товара выбери расположение принта и загрузи свой макет',
        imageSlug: 'stage2',
    },
    {
        title: 'Оформи заказ',
        text: 'Отправь контактные данные, мы позвоним и расскажем, как забрать мерч',
        imageSlug: 'stage3',
    },
    {
        title: 'Дождись, когда сработает магия, и забери мерч',
        text: 'Приди в пункт выдачи после прибытия посылки и порази всех новой вещью',
        imageSlug: 'stage4',
    },
];

const StagesScreen: React.FC<StagesScreenProps> = ({ sectionTitle, ctaHref, items }) => {
    const resolvedTitle = sectionTitle ?? DEFAULT_TITLE;
    const resolvedHref = ctaHref ?? DEFAULT_CTA_HREF;
    const resolvedItems = items && items.length > 0 ? items : DEFAULT_ITEMS;

    return (
        <section className={styles.screen} id="stages">
            <h2 className={styles.screen_title}>{resolvedTitle}</h2>
            <Link href={resolvedHref}>
                <button type="button" className={styles.screen_button}>
                    <Image src={button_arrow_right} alt="стрелка вправо" />
                </button>
            </Link>
            <div className={styles.screen_cards}>
                {resolvedItems.map((item, idx) => {
                    const uploadedUrl = item.image?.url ?? null;
                    const fallbackImg = item.imageSlug ? IMAGE_BY_SLUG[item.imageSlug] : undefined;
                    const altText = item.image?.alt ?? 'Фото модели';
                    return (
                        <div className={styles.cards_blockWrapper} key={idx}>
                            {idx >= 2 ? (
                                <>
                                    <div className={styles.cards_photoCard}>
                                        <div className={styles.photoCard_wrapper}>
                                            {uploadedUrl ? (
                                                <Image src={uploadedUrl} alt={altText} width={800} height={800} className={styles.card_image} />
                                            ) : fallbackImg ? (
                                                <Image src={fallbackImg} alt={altText} className={styles.card_image} />
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className={styles.cards_textCard}>
                                        <h3 className={styles.textCard_title}>{item.title}</h3>
                                        <p className={styles.textCard_paragraph}>{item.text}</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className={styles.cards_textCard}>
                                        <h3 className={styles.textCard_title}>{item.title}</h3>
                                        <p className={styles.textCard_paragraph}>{item.text}</p>
                                    </div>
                                    <div className={styles.cards_photoCard}>
                                        <div className={styles.photoCard_wrapper}>
                                            {uploadedUrl ? (
                                                <Image src={uploadedUrl} alt={altText} width={800} height={800} className={styles.card_image} />
                                            ) : fallbackImg ? (
                                                <Image src={fallbackImg} alt={altText} className={styles.card_image} />
                                            ) : null}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

export default StagesScreen;
