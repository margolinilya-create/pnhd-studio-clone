import React from 'react';
import styles from './faq-screen.module.css';

import FaqCard from './faq-card';

import Image from 'next/image';
import faq1_image from '../../../../../public/faq_image1.png';
import faq2_image from '../../../../../public/faq_image2.png';
import faq3_image from '../../../../../public/faq_image3.png';
import shape from '../../../../../public/faq_shape.svg';

export type FaqItem = {
    // Legacy shape (still accepted from category pages):
    title?: string;
    text?: string;
    // Block shape (from Payload HomePage):
    question?: string;
    answer?: string;
}

export type FaqScreenProps = {
    sectionTitle?: string | null;
    faqSet?: FaqItem[]
    items?: { question: string; answer: string }[] | null;
}

// Fallback content used when neither faqSet nor items are provided.
const DEFAULT_ITEMS: FaqItem[] = [
    { title: 'В какие дни работает студия?', text: 'Ежедневно с 11 до 20 часа. Без выходных' },
    {
        title: 'Как к вам проехать?',
        text: 'Повернуть с Каменноостровского проспекта на улицу Чапыгина и пройти к следующему крыльцу после Wildberries',
    },
    {
        title: 'Можно ли сделать шелкографию на 1 штуку?',
        text: 'Шелкография — тиражный метод печати, делаем её только для заказов от 50 штук. Ближайший аналог — DTF',
    },
    {
        title: 'Есть ли доставка?',
        text:
            'По СПб можно вызвать к нам курьера любой службы. Укажи номер заказа в комментариях и вызови доставку до двери. По РФ доставляем через СДЭК. Если нужна другая транспортная компания, то её можно вызвать самостоятельно',
    },
    {
        title: 'Можно ли вышить/напечатать логотип известного бренда?',
        text:
            'Мы можем отказать в печати логотипа бренда, чтобы не нарушать авторские права, либо запросить подтверждение прав',
    },
];

const FaqScreen = ({ sectionTitle, faqSet, items }: FaqScreenProps) => {
    // Priority: explicit `items` from block → `faqSet` legacy prop → defaults.
    let source: FaqItem[];
    if (items && items.length > 0) {
        source = items.map((i) => ({ title: i.question, text: i.answer }));
    } else if (faqSet && faqSet.length > 0) {
        source = faqSet;
    } else {
        source = DEFAULT_ITEMS;
    }

    // FaqCard expects { title, text }; normalize.
    const cards = source.map((i) => ({
        title: i.title ?? i.question ?? '',
        text: i.text ?? i.answer ?? '',
    }));

    return (
        <section className={styles.screen} id='faq'>
            <h2 className={styles.screen_title}>{sectionTitle ?? 'frequently asked questions'}</h2>
            <div className={styles.screen_wrapper}>
                <div className={styles.screen_faqCardsWrapper}>
                    {cards.map((item, index) => (
                        <FaqCard key={index} item={item} />
                    ))}
                </div>

                <div className={styles.screen_graphics}>
                    <div className={styles.graphics_column}>
                        <p className={styles.graphics_text}>F.</p>
                        <Image src={faq1_image} alt='футболка с принтом на человеке' className={styles.graphics_image} />
                        <p className={styles.graphics_text}>Q.</p>
                    </div>
                    <div className={styles.graphics_column}>
                        <Image src={faq2_image} alt='футболка с принтом на человеке' className={styles.graphics_image} />
                        <p className={styles.graphics_text}>A.</p>
                        <Image src={faq3_image} alt='футболка с принтом на человеке' className={styles.graphics_image} />
                    </div>
                    <Image src={shape} alt='фоновая графика' className={styles.graphics_background} />
                </div>
            </div>
        </section>
    )
}

export default FaqScreen;
