import React from 'react'
import Link from 'next/link'
import styles from './loyalty-banner.module.css'

export type LoyaltyBannerProps = {
    eyebrow?: string | null;
    title?: string | null;
    href?: string | null;
}

const DEFAULT_EYEBROW = 'Программа лояльности Pinhead Studio';
const DEFAULT_TITLE = 'Оплачивайте до 50%\nзаказа бонусами';
const DEFAULT_HREF = '/loyalty';

const LoyaltyBanner: React.FC<LoyaltyBannerProps> = ({ eyebrow, title, href }) => {
    const resolvedEyebrow = eyebrow ?? DEFAULT_EYEBROW;
    const resolvedTitle = title ?? DEFAULT_TITLE;
    const resolvedHref = href ?? DEFAULT_HREF;

    // Convert newlines in title to <br /> for backward compatibility with original markup.
    const titleParts = resolvedTitle.split('\n');

    return (
        <Link href={resolvedHref} className={styles.banner}>
            <div className={styles.banner_left}>
                <p className={styles.banner_eyebrow}>{resolvedEyebrow}</p>
                <p className={styles.banner_title}>
                    {titleParts.map((part, idx) => (
                        <React.Fragment key={idx}>
                            {part}
                            {idx < titleParts.length - 1 && <br />}
                        </React.Fragment>
                    ))}
                </p>
            </div>
        </Link>
    )
}

export default LoyaltyBanner
