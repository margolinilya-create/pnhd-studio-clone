import React from "react";
import styles from './price-screen.module.css';
import Image from "next/image";
import shape from '../../../../../public/price_screen_shape.svg';
import shape2 from '../../../../../public/price_screen_shape2.svg';
import LeadButton from "@/components/shared-components/lead-button/lead-button";
import PriceBlock, { type PriceTableRow } from "./price-block";

export type PriceScreenProps = {
    sectionTitle?: string | null;
    sectionSubtitle?: string | null;
    mainBlockText?: string | null;
    mainBlockCtaLabel?: string | null;
    mainBlockPopupTitle?: string | null;
    sideInfoText?: string | null;
    rows?: PriceTableRow[] | null;
};

const DEFAULT_TITLE = 'Рассчитайте стоимость уникального мерча';
const DEFAULT_SUBTITLE =
    'Делаем яркие принты на любом текстиле: от скромного логотипа до сложных полноцветных изображений на всей поверхности вещи.';
const DEFAULT_MAIN_TEXT = 'Скидки на тиражи от 10 штук уточняй у менеджеров';
const DEFAULT_CTA_LABEL = 'Заказать срочную печать';
const DEFAULT_POPUP_TITLE = 'Срочный тираж — обсудим сроки и стоимость';
const DEFAULT_SIDE_TEXT = 'При печати на своей вещи стоимость не увеличивается';

const PriceScreen: React.FC<PriceScreenProps> = ({
    sectionTitle,
    sectionSubtitle,
    mainBlockText,
    mainBlockCtaLabel,
    mainBlockPopupTitle,
    sideInfoText,
    rows,
}) => {
    const resolvedTitle = sectionTitle ?? DEFAULT_TITLE;
    const resolvedSubtitle = sectionSubtitle ?? DEFAULT_SUBTITLE;
    const resolvedMainText = mainBlockText ?? DEFAULT_MAIN_TEXT;
    const resolvedCtaLabel = mainBlockCtaLabel ?? DEFAULT_CTA_LABEL;
    const resolvedPopupTitle = mainBlockPopupTitle ?? DEFAULT_POPUP_TITLE;
    const resolvedSideText = sideInfoText ?? DEFAULT_SIDE_TEXT;

    return (
        <section className={styles.screen}>

            <h2 className={styles.screen_titleMobile}>
                сделай рисунок размером со стикер
            </h2>
            <p className={styles.screen_subtitleMobile}>
                или разгуляйся с принтами
                на всю футболку
            </p>

            <div className={styles.screen_cardsWrapper}>
                <div className={styles.screen_mainBlock}>
                    <p className={styles.mainBlock_title}>
                        {resolvedMainText}
                    </p>
                    <LeadButton
                        styleType="green"
                        label={resolvedCtaLabel}
                        popupTitle={resolvedPopupTitle}
                    />
                    <Image src={shape} alt='графическая форма' className={styles.mainBlock_shape} />
                </div>



                <div className={styles.screen_wrapper}>
                    <h2 className={styles.screen_title}>
                        {resolvedTitle}
                        <p className={styles.screen_subtitle}>{resolvedSubtitle}</p>
                    </h2>


                    <div className={styles.wrapper_cards}>
                        <div className={styles.cards_priceCard}>
                            <PriceBlock rows={rows ?? undefined} />
                        </div>
                        <div className={styles.cards_infoCard}>
                            <p className={styles.infocard_text}>
                                {resolvedSideText}
                            </p>
                            <Image src={shape2} alt='графическая форма' className={styles.infoBlock_shape} />
                        </div>

                    </div>
                </div>
            </div>
        </section>
    )
}

export default PriceScreen;
