import React from "react";
import styles from "./print-methods-screen.module.css";

import Image from "next/image";
import card_image_one from "../../../../../public/card_image_one.png";
import card_image_two from "../../../../../public/card_image_two.png";
import card_image_three from "../../../../../public/card_image_three.png";
import card_image_four from "../../../../../public/card_image_four.png";
import card_image_five from "../../../../../public/card_image_five.png";
import button_arrow_right from "../../../../../public/button_arrow_right.svg";
import Link from "next/link";

interface PrintMethodsScreenProps {
    excludedMethods?: string[];
    sectionTitle?: string | null;
    sectionSubtitle?: string | null;
}

const PrintMethodsScreen: React.FC<PrintMethodsScreenProps> = ({
    excludedMethods = [],
    sectionTitle,
    sectionSubtitle,
}) => {
    const resolvedTitle = sectionTitle ?? 'воплощай смелые идеи';
    const resolvedSubtitle = sectionSubtitle ?? 'с любым методом нанесения';
    const printMethodsList = {
        shelkografiya: {
            'name': 'шелкография',
            'txt': 'Обеспечивает высокую детализацию принтов разных цветов и оттенков, устойчивость к стирке и износу',
            'url': '/methods/shelkografiya',
            'img': card_image_one
        },
        'termotransfernaya-pechat': {
            'name': 'флекс',
            'txt': 'Подходит для принтов с кислотными, золотыми, медными цветами и светоотражателей',
            'url': '/methods/termotransfernaya-pechat',
            'img': card_image_two
        },
        'dtf-pechat': {
            'name': 'dtf',
            'txt': 'Помогает нанести рисунок с яркими насыщенными цветами, которые не выцветают со временем',
            'url': '/methods/dtf-pechat',
            'img': card_image_four
        },
        'pryamaya-dtg-pechat': {
            'name': 'dtg',
            'txt': 'Наносится на белые вещи за 5–15 минут, а рисунок сохраняется столько же, сколько на обычных вещах из магазинов',
            'url': '/methods/pryamaya-dtg-pechat',
            'img': card_image_five
        },
        vishivka: {
            'name': 'вышивка',
            'txt': 'Используется для лого и фраз, которые выделяются на одежде и добавляют индивидуальности',
            'url': '/methods/vishivka',
            'img': card_image_three
        },
    } as const;

    return (
        <section className={styles.screen} id='methods'>
            <div className={styles.screen_firstRow}>
                {!excludedMethods.includes('shelkografiya') &&
                    <div className={styles.firstRow_card}>
                        <div className={styles.card_textWrapper}>
                            <h3 className={styles.card_title}>{"> "}{printMethodsList['shelkografiya']['name']}</h3>
                            <p className={styles.card_text}>{printMethodsList['shelkografiya']['txt']}</p>
                            <Link href={printMethodsList['shelkografiya']['url']}>
                                <button type="button" className={styles.card_button}>
                                    <Image src={button_arrow_right} alt="стрелка вправо"/>
                                </button>
                            </Link>
                        </div>

                        <div className={styles.card_imageWrapper}>
                            <Image
                                src={printMethodsList['shelkografiya']['img']}
                                alt="фото мерча"
                                className={styles.card_image}
                            />
                        </div>
                    </div>
                }

                <h2 className={styles.screen_titleWrapper}>
                    <span className={styles.screen_title}>{resolvedTitle}</span>
                    <span className={styles.screen_subtitle}>{resolvedSubtitle}</span>
                </h2>
            </div>
            <div className={styles.screen_secondRow}>
                {!excludedMethods.includes('termotransfernaya-pechat') &&
                    <div className={styles.secondRow_vertCard}>
                        <div className={styles.vertCard_imageWrapper}>
                            <Image
                                src={printMethodsList['termotransfernaya-pechat']['img']}
                                alt="стрелка вправо"
                                style={{objectFit: "cover", width: "100%", height: '100%'}}
                            />
                        </div>
                        <div className={styles.card_textWrapper}>
                            <h3 className={styles.card_title}>{"> "}{printMethodsList['termotransfernaya-pechat']['name']}</h3>
                            <p className={styles.card_text}>{printMethodsList['termotransfernaya-pechat']['txt']}</p>
                            <Link href={printMethodsList['termotransfernaya-pechat']['url']}>
                                <button type="button" className={styles.card_button}>
                                    <Image src={button_arrow_right} alt="стрелка вправо"/>
                                </button>
                            </Link>
                        </div>
                    </div>
                }

                <div className={styles.secondRow_horizCardWrapper}>
                    {!excludedMethods.includes('dtf-pechat') &&
                        <div className={styles.firstRow_card}>
                            <div className={styles.card_textWrapper}>
                                <h3 className={styles.card_title}>{"> "}{printMethodsList['dtf-pechat']['name']}</h3>
                                <p className={styles.card_text}>{printMethodsList['dtf-pechat']['txt']}</p>
                                <Link href={printMethodsList['dtf-pechat']['url']}>
                                    <button type="button" className={styles.card_button}>
                                        <Image src={button_arrow_right} alt="стрелка вправо"/>
                                    </button>
                                </Link>
                            </div>
                            <div className={styles.card_imageWrapper}>
                                <Image
                                    src={printMethodsList['dtf-pechat']['img']}
                                    alt="фото мерча"
                                    className={styles.card_image}
                                />
                            </div>
                        </div>
                    }

                    {!excludedMethods.includes('pryamaya-dtg-pechat') &&
                        <div className={styles.firstRow_card}>
                            <div className={styles.card_textWrapper}>
                                <h3 className={styles.card_title}>{"> "}{printMethodsList['pryamaya-dtg-pechat']['name']}</h3>
                                <p className={styles.card_text}>{printMethodsList['pryamaya-dtg-pechat']['txt']}</p>
                                <Link href={printMethodsList['pryamaya-dtg-pechat']['url']}>
                                    <button type="button" className={styles.card_button}>
                                        <Image src={button_arrow_right} alt="стрелка вправо"/>
                                    </button>
                                </Link>
                            </div>

                            <div className={styles.card_imageWrapper}>
                                <Image
                                    src={printMethodsList['pryamaya-dtg-pechat']['img']}
                                    alt="фото мерча"
                                    className={styles.card_image}
                                />
                            </div>
                        </div>
                    }
                </div>

                {!excludedMethods.includes('vishivka') &&
                    <div className={styles.secondRow_vertCard}>
                        <div className={styles.vertCard_imageWrapper}>
                            <Image
                                src={printMethodsList['vishivka']['img']}
                                alt="стрелка вправо"
                                style={{objectFit: "cover", width: "100%", height: '100%'}}
                            />
                        </div>
                        <div className={styles.card_textWrapper}>
                            <h3 className={styles.card_title}>{"> "}{printMethodsList['vishivka']['name']}</h3>
                            <p className={styles.card_text}>{printMethodsList['vishivka']['txt']}</p>
                            <Link href={printMethodsList['vishivka']['url']}>
                                <button type="button" className={styles.card_button}>
                                    <Image src={button_arrow_right} alt="стрелка вправо"/>
                                </button>
                            </Link>
                        </div>
                    </div>
                }
            </div>
        </section>
    );
};

export default PrintMethodsScreen;
