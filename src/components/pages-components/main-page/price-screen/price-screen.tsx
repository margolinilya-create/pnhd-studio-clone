import React from "react";
import styles from './price-screen.module.css';
import Image from "next/image";
import shape from '../../../../../public/price_screen_shape.svg';
import shape2 from '../../../../../public/price_screen_shape2.svg';
import LeadButton from "@/components/shared-components/lead-button/lead-button";
import PriceBlock from "./price-block";

const PriceScreen: React.FC = () => {


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
                        Скидки на тиражи
                        от 10 штук уточняй
                        у менеджеров
                    </p>
                    <LeadButton
                        styleType="green"
                        label="Заказать срочную печать"
                        popupTitle="Срочный тираж — обсудим сроки и стоимость"
                    />
                    <Image src={shape} alt='графическая форма' className={styles.mainBlock_shape} />
                </div>



                <div className={styles.screen_wrapper}>
                    <h2 className={styles.screen_title}>
                        Рассчитайте стоимость уникального мерча
                        <p className={styles.screen_subtitle}>Делаем яркие принты на любом текстиле: от скромного логотипа до сложных полноцветных изображений на всей поверхности вещи.</p>
                    </h2>


                    <div className={styles.wrapper_cards}>
                        <div className={styles.cards_priceCard}>
                            <PriceBlock />
                        </div>
                        <div className={styles.cards_infoCard}>
                            <p className={styles.infocard_text}>
                                При печати на своей
                                вещи стоимость
                                не увеличивается
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