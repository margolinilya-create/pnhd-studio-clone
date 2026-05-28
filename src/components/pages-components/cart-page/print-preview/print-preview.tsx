'use client';
import React from 'react';
import styles from './print-preview.module.css';
import { ICartOrderElement } from '@/app/utils/types';
import { getPrintFilesArray, ruPrintPlace } from '@/app/utils/cart-utils';
import { actions as cartActions } from '@/redux/cart-slice/cart.slice';
import { useAppDispatch } from '@/redux/redux-hooks';

const PrintPreview: React.FC<{ elem: ICartOrderElement }> = ({ elem }) => {
  const dispatch = useAppDispatch();
  const printFiles = getPrintFilesArray(elem.printConfig);

  if (printFiles.length === 0) return null;

  return (
    <div className={styles.cart_productPrintPreviews}>
      {printFiles.map(({ side, file }) => (
        <div key={side} className={`${styles.cart_preview} ${styles.cart_preview__border}`}>
          <img className={styles.cart_previewImg} src={file.url} alt={`Превью принта (${ruPrintPlace(side)})`} />
          <div className={styles.prints_info}>
            <p className={styles.printsInfo_size}>{ruPrintPlace(side)}</p>
            <p className={styles.printsInfo_format} title={file.filename}>
              {file.filename}
            </p>
            <p className={styles.printsInfo_priceHint}>
              + стоимость нанесения (рассчитает менеджер)
            </p>
          </div>
          <div className={styles.printsInfo_controlButtonsWrapper}>
            <button
              type="button"
              className={styles.printsInfo_controlButton}
              onClick={() =>
                dispatch(cartActions.clearPrintFile({ itemCartId: elem.itemCartId, side }))
              }
            >
              Удалить
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PrintPreview;
