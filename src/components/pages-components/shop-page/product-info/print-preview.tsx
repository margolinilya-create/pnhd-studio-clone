'use client';
import React from 'react';
import { IPrintConfig, TPrintSide } from '@/app/utils/types';
import { getPrintRect, SIDES_FOR_LOCATION } from './print-config';
import styles from './print-preview.module.css';

interface PrintPreviewProps {
    photoUrl: string;
    photoAlt: string;
    productType: string;
    printConfig: IPrintConfig | null | undefined;
    /** Если фото визуально соответствует определённой стороне — рендерим оверлей только для неё. */
    photoSide?: TPrintSide;
    /** Контейнер должен задавать соотношение сторон сам (через CSS aspect-ratio). */
    className?: string;
}

const PrintPreview: React.FC<PrintPreviewProps> = ({
    photoUrl,
    photoAlt,
    productType,
    printConfig,
    photoSide,
    className,
}) => {
    const sides = printConfig ? SIDES_FOR_LOCATION[printConfig.location] : [];
    const sidesToRender = photoSide
        ? sides.filter((s) => s === photoSide)
        : sides;

    return (
        <div className={`${styles.wrapper} ${className ?? ''}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt={photoAlt} className={styles.photo} loading="lazy" decoding="async" />
            {sidesToRender.map((side) => {
                const file = printConfig?.files?.[side];
                if (!file?.url) return null;
                const rect = getPrintRect(productType, side);
                return (
                    <div
                        key={side}
                        className={styles.overlay}
                        style={{
                            top: rect.top,
                            left: rect.left,
                            width: rect.width,
                        }}
                        aria-hidden="true"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={file.url} alt="" className={styles.overlayImg} />
                    </div>
                );
            })}
        </div>
    );
};

export default PrintPreview;
