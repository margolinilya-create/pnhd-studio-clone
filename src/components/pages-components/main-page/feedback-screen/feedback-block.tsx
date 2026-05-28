'use client'
import React, { useState } from "react"
import styles from './feedback-block.module.css';

import Image from "next/image";
import right_arrow from '../../../../../public/button_arrow_right.svg'
import left_arrow from '../../../../../public/button_arrow_left.svg'
import { feedbackArr } from "@/app/utils/constants";
import Link from "next/link";






const FeedbackBlock: React.FC = () => {

    const [ feedbacks, setFeedbacks ] = useState<Array<{ name: string, id: number, feedback: string }>>(feedbackArr)

    const nextClickHandler = () => {
        
        let newFeedbacks = feedbacks;
        const firstElem = newFeedbacks.shift();
        newFeedbacks.push(firstElem!);

        setFeedbacks([...newFeedbacks]); 
    }

    const previousClickHandler = () => {
        
        let newFeedbacks = feedbacks;
        const lastElem = newFeedbacks.pop();
        newFeedbacks.unshift(lastElem!);

        setFeedbacks([...newFeedbacks]);
    }

    return (
        <div className={styles.screen_feedbacks}>

                <div className={styles.feedbacks_wrapper}>
                {feedbacks.map((item, index) => (
                        <div className={styles.feedback_box} key={index}>
                            <p className={styles.feedback_name}>{item.name}</p>
                            <p className={styles.feedback_text}>{item.feedback}</p>
                        </div>
                    ))}
                </div>
                <div className={styles.feddback_controlsWrapper}>
                    <div className={styles.feedback_buttons}>
                        <button className={styles.feedback_controlButton} type='button'>
                            <Image src={left_arrow} alt='стрелка влево' onClick={previousClickHandler}/>
                        </button>
                        <button className={styles.feedback_controlButton} type='button' onClick={nextClickHandler}>
                            <Image src={right_arrow} alt='стрелка вправо' />
                        </button>
                    </div>

                    <div className={styles.feedback_linkButtons}>
                        <Link href='https://yandex.ru/profile/183887374171' target='_blank' rel='noopener noreferrer'>
                            <button type='button' className={styles.feedback_linkButton}>отзывы yandex</button>
                        </Link>
                        <Link href='https://maps.app.goo.gl/vhWL7yY1VUQUGZ5SA' target='_blank' rel='noopener noreferrer'>
                            <button type='button' className={styles.feedback_linkButton}>отзывы google</button>
                        </Link>
                    </div>
                </div>

        </div>
    )
}

export default FeedbackBlock;