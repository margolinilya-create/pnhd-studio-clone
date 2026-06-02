'use client';
import React from 'react';
import styles from './FormScreen.module.css';
import Image from 'next/image';
import cover from './cover.png'
import LeadButton from '@/components/shared-components/lead-button/lead-button';

export type FormScreenProps = {
    title?: string | null;
    description?: string | null;
    ctaLabel?: string | null;
};

const DEFAULT_TITLE = 'Рассчитаем стоимость нанесения за 15 минут';
const DEFAULT_DESCRIPTION =
    'Есть логотип для нанесения? Отправьте заявку и получите готовый расчёт по цене и срокам в телефонном режиме. Мы перезвоним в течение 15 минут.';

const FormScreen: React.FC<FormScreenProps> = ({ title, description, ctaLabel }) => {
    const resolvedTitle = title ?? DEFAULT_TITLE;
    const resolvedDescription = description ?? DEFAULT_DESCRIPTION;
    const resolvedCtaLabel = ctaLabel ?? undefined; // LeadButton applies its own default

    return (
        <section className={styles.screen}>
            <div className={styles.screen_imgWrapper}>
                <Image src={cover} alt='форма' />
            </div>
            <div className={styles.screen_content}>
                <p className={styles.screen_content_title}>
                    {resolvedTitle}
                </p>

                <p className={styles.screen_content_text}>
                    {resolvedDescription}
                </p>

                <LeadButton styleType='green' label={resolvedCtaLabel} />
            </div>
        </section>
    )
}

export default FormScreen;
