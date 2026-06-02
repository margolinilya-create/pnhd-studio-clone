'use client'
import React, { SyntheticEvent, useState } from 'react'
import styles from './price-block.module.css';

import { tumblers, prices } from '@/app/utils/constants';

export type PriceTableRow = {
    method: string;
    caption?: string | null;
    cells?: { format: string; price: string }[] | null;
};

const getCaption = (method: string, explicit?: string | null) => {
    if (explicit && explicit.length > 0) return explicit;
    if (method === 'DTG') return 'На белом / цветном';
    if (method === 'ВЫШИВКА') return 'Стоимость (от 10 штук)';
    return 'Стоимость';
};

export type PriceBlockProps = {
    rows?: PriceTableRow[];
};

const PriceBlock: React.FC<PriceBlockProps> = ({ rows }) => {
    // Convert prop rows to the same shape as the legacy `prices` const for the existing UI.
    // Fall back to constants if rows not supplied (preserves old behaviour for any
    // legacy callers).
    const effectiveRows: PriceTableRow[] =
        rows && rows.length > 0
            ? rows
            : prices.map((p) => ({
                method: p.name,
                caption: null,
                cells: p.prices,
            }));

    const methodNames = effectiveRows.length > 0
        ? effectiveRows.map((r) => r.method)
        : tumblers;

    const [activeMethod, setActiveMethod] = useState<string>(methodNames[0] ?? 'DTG');
    const activeRow = effectiveRows.find((r) => r.method === activeMethod) ?? effectiveRows[0];

    return (
        <div className={styles.priceBlock}>
            <div className={styles.priceBlock_tumblers}>
                {methodNames.map((item, index) => (
                    <button
                        key={index}
                        type='button'
                        onClick={(e: SyntheticEvent<HTMLButtonElement>) => { setActiveMethod(e.currentTarget.id) }}
                        id={item}
                        className={activeMethod === item ? styles.priceBlock_tumbler__active : styles.priceBlock_tumbler}
                    >
                        {item}
                    </button>
                ))}
            </div>
            <div className={styles.priceBlock_tableHeader}>
                <p className={styles.tableHeader_text}>Формат</p>
                <p className={styles.tableHeader_text}>{getCaption(activeRow?.method ?? activeMethod, activeRow?.caption)}</p>
            </div>

            <div className={styles.priceBlock_table}>
                {(activeRow?.cells ?? []).map((item, index) => (
                    <div className={styles.table_tableRow} key={index}>
                        <p className={styles.tableRow_format}>{item.format}</p>
                        <p className={styles.tableRow_price}>{item.price}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default PriceBlock;
