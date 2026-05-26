'use client';

import React from 'react';
import styles from './product-info.module.css';
import UploadSlot from './upload-slot';
import { IPrintConfig, IPrintFileRef, TPrintLocation, TPrintSide } from '@/app/utils/types';
import { PRINT_OPTIONS, SIDES_FOR_LOCATION } from './print-config';

type Props = {
  printConfig: IPrintConfig;
  onLocationChange: (location: TPrintLocation) => void;
  onUpload: (side: TPrintSide, file: File) => Promise<IPrintFileRef>;
  onClearFile: (side: TPrintSide) => void;
};

const PrintSelector: React.FC<Props> = ({
  printConfig,
  onLocationChange,
  onUpload,
  onClearFile,
}) => {
  const sides = SIDES_FOR_LOCATION[printConfig.location];
  return (
    <div className={styles.printSection}>
      <div className={styles.sizesHead}>
        <span className={styles.sizesEyebrow}>Принт</span>
        {sides.length > 0 && (
          <span className={styles.printHint}>Загрузи изображение для печати</span>
        )}
      </div>
      <div className={styles.printOptions}>
        {PRINT_OPTIONS.map((opt) => {
          const cls = [
            styles.printChip,
            printConfig.location === opt.id ? styles.isActive : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={opt.id}
              type="button"
              className={cls}
              onClick={() => onLocationChange(opt.id)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {sides.length > 0 && (
        <div
          className={`${styles.uploadGrid} ${
            sides.length === 1 ? styles.uploadGridCols1 : styles.uploadGridCols2
          }`}
        >
          {sides.map((side) => (
            <UploadSlot
              key={side}
              side={side}
              file={printConfig.files[side]}
              onUpload={(file) => onUpload(side, file)}
              onClear={() => onClearFile(side)}
            />
          ))}
        </div>
      )}
      {sides.length > 0 && (
        <div className={styles.printNote}>
          <span className={styles.printNoteIcon} aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.6" />
              <path d="M7 4v3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="7" cy="10" r="0.9" fill="currentColor" />
            </svg>
          </span>
          <span>
            Для корректного отображения изображения менеджер свяжется с вами.
            <br />
            Контакты для связи укажете на следующем шаге.
          </span>
        </div>
      )}
    </div>
  );
};

export default PrintSelector;
