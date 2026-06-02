import React from 'react';
import styles from './feedback-screen.module.css';

import Image from 'next/image';
import rating_stars from '../../../../../public/rating_star.svg';
import feedback_image from '../../../../../public/feedback_image.svg';

import FeedbackBlock, { type FeedbackItem } from './feedback-block';

export type FeedbackScreenProps = {
    sectionTitle?: string | null;
    ratingValue?: string | null;
    ratingText?: string | null;
    yandexUrl?: string | null;
    googleUrl?: string | null;
    items?: FeedbackItem[] | null;
};

const DEFAULT_TITLE = 'когда говорят о топовых принтах и заботливом сервисе, говорят о нас';
const DEFAULT_RATING = '5,0';
const DEFAULT_RATING_TEXT = 'Оценка на Yandex и Google';
const DEFAULT_YANDEX = 'https://yandex.ru/profile/183887374171';
const DEFAULT_GOOGLE = 'https://maps.app.goo.gl/vhWL7yY1VUQUGZ5SA';

const FeedbackScreen: React.FC<FeedbackScreenProps> = ({
    sectionTitle,
    ratingValue,
    ratingText,
    yandexUrl,
    googleUrl,
    items,
}) => {
    return (
        <section className={styles.screen} id='feedback'>
            <div className={styles.screen_titleWrapper}>
                <div className={styles.screen_ratingWrapper}>
                    <div className={styles.rating_box}>
                        <p className={styles.rating_number}>{ratingValue ?? DEFAULT_RATING}</p>
                        <Image src={rating_stars} alt='пять звезд рейтинга' />
                    </div>
                    <p className={styles.rating_text}>{ratingText ?? DEFAULT_RATING_TEXT}</p>
                </div>
                <h2 className={styles.screen_title}>
                    {sectionTitle ?? DEFAULT_TITLE}
                </h2>
            </div>
            <FeedbackBlock
                items={items}
                yandexUrl={yandexUrl ?? DEFAULT_YANDEX}
                googleUrl={googleUrl ?? DEFAULT_GOOGLE}
            />
            <Image src={feedback_image} alt='логотип яндекса и гугла' className={styles.screen_image} />
        </section>
    )
}

export default FeedbackScreen;
