'use client'
import React, { useState } from "react"
import styles from './feedback-block.module.css';

import Image from "next/image";
import right_arrow from '../../../../../public/button_arrow_right.svg'
import left_arrow from '../../../../../public/button_arrow_left.svg'
import Link from "next/link";

export type FeedbackItem = {
    author: string;
    text: string;
    rating?: number | null;
};

// Fallback content used if FeedbackBlock receives no items prop (legacy callers).
const DEFAULT_ITEMS: FeedbackItem[] = [
    { author: 'наташа п.',    rating: 5, text: 'Делала худи подарок. Качество огонь, клиент доволен :)' },
    { author: 'дарья т.',     rating: 5, text: 'Отличные футболки, особенно порадовал оверсайз (обычно его никто не делает) ну и качество печати!' },
    { author: 'ира м.',       rating: 5, text: 'Стирала толстовку уже раз 10. Печать как новая!' },
    { author: 'саша м.',      rating: 5, text: 'Ребята, спасибо! Очень выручили когда нужно было срочно напечатать! Качество отличное!' },
    { author: 'елизавета к.', rating: 5, text: 'Хорошее место и очень приветливая девушка-администратор. Все показала, рассказала об уходе и красиво запаковала.' },
    { author: 'дарья м.',     rating: 5, text: 'Очень понравился сервис и результат печати. Всё качественно, быстро.' },
    { author: 'соня к.',      rating: 5, text: 'Обалденные ребята. Сделали качественно, недорого. Я считаю, что могли бы даже побольше взять…Однозначно рекомендую' },
];

export type FeedbackBlockProps = {
    items?: FeedbackItem[] | null;
    yandexUrl?: string;
    googleUrl?: string;
};

const FeedbackBlock: React.FC<FeedbackBlockProps> = ({ items, yandexUrl, googleUrl }) => {
    const initial = items && items.length > 0 ? items : DEFAULT_ITEMS;
    const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>(initial);

    const nextClickHandler = () => {
        const newFeedbacks = [...feedbacks];
        const firstElem = newFeedbacks.shift();
        if (firstElem) newFeedbacks.push(firstElem);
        setFeedbacks(newFeedbacks);
    }

    const previousClickHandler = () => {
        const newFeedbacks = [...feedbacks];
        const lastElem = newFeedbacks.pop();
        if (lastElem) newFeedbacks.unshift(lastElem);
        setFeedbacks(newFeedbacks);
    }

    return (
        <div className={styles.screen_feedbacks}>

            <div className={styles.feedbacks_wrapper}>
                {feedbacks.map((item, index) => (
                    <div className={styles.feedback_box} key={index}>
                        <p className={styles.feedback_name}>{item.author}</p>
                        <p className={styles.feedback_text}>{item.text}</p>
                    </div>
                ))}
            </div>
            <div className={styles.feddback_controlsWrapper}>
                <div className={styles.feedback_buttons}>
                    <button className={styles.feedback_controlButton} type='button' onClick={previousClickHandler}>
                        <Image src={left_arrow} alt='стрелка влево' />
                    </button>
                    <button className={styles.feedback_controlButton} type='button' onClick={nextClickHandler}>
                        <Image src={right_arrow} alt='стрелка вправо' />
                    </button>
                </div>

                <div className={styles.feedback_linkButtons}>
                    {yandexUrl && (
                        <Link href={yandexUrl} target='_blank' rel='noopener noreferrer'>
                            <button type='button' className={styles.feedback_linkButton}>отзывы yandex</button>
                        </Link>
                    )}
                    {googleUrl && (
                        <Link href={googleUrl} target='_blank' rel='noopener noreferrer'>
                            <button type='button' className={styles.feedback_linkButton}>отзывы google</button>
                        </Link>
                    )}
                </div>
            </div>

        </div>
    )
}

export default FeedbackBlock;
