'use client';

import React from 'react';
import PrecisionManufacturingOutlinedIcon from '@mui/icons-material/PrecisionManufacturingOutlined';
import CachedOutlinedIcon from '@mui/icons-material/CachedOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import styles from './trust-block.module.css';

const ICON_MAP: Record<string, React.ReactNode> = {
  factory: <PrecisionManufacturingOutlinedIcon sx={{ fontSize: 18 }} />,
  return: <CachedOutlinedIcon sx={{ fontSize: 18 }} />,
  quality: <VerifiedOutlinedIcon sx={{ fontSize: 18 }} />,
  shipping: <LocalShippingOutlinedIcon sx={{ fontSize: 18 }} />,
};

const DEFAULT_ITEMS: TrustItem[] = [
  { icon: 'factory', text: 'Производство СПб' },
  { icon: 'return',  text: 'Возврат 14 дней' },
  { icon: 'quality', text: 'Гарантия 40 стирок' },
  { icon: 'shipping', text: 'Доставка по России' },
];

export type TrustItem = { icon: string; text: string };

const TrustBlock: React.FC<{ items?: TrustItem[] | null }> = ({ items }) => {
  const resolved = items && items.length > 0 ? items : DEFAULT_ITEMS;
  return (
    <div className={styles.trustBlock}>
      {resolved.map((item, i) => (
        <div key={i} className={styles.trustItem}>
          <span className={styles.trustIcon}>{ICON_MAP[item.icon] ?? ICON_MAP['factory']}</span>
          <span className={styles.trustText}>{item.text}</span>
        </div>
      ))}
    </div>
  );
};

export default TrustBlock;
