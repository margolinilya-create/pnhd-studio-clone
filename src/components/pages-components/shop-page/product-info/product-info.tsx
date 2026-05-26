'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import styles from './product-info.module.css';
import SizeGrid from './size-grid';
import PrintSelector from './print-selector';
import {
  IPrintConfig,
  IPrintFileRef,
  IProduct,
  TPrintLocation,
  TPrintSide,
} from '@/app/utils/types';
import { useAppDispatch } from '@/redux/redux-hooks';
import { actions as cartActions } from '@/redux/cart-slice/cart.slice';
import { useRouter } from 'next/navigation';
import { uploadPrintFile } from '@/lib/storage/upload-print';

const formatRub = (n: number) => new Intl.NumberFormat('ru-RU').format(n) + ' ₽';

const ProductInfo: React.FC<{ item: IProduct }> = ({ item }) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const initialQty = useMemo(() => {
    const map: Record<string, number> = {};
    item.sizes.forEach((s) => {
      map[s.name] = 0;
    });
    return map;
  }, [item.sizes]);
  const [qty, setQty] = useState<Record<string, number>>(initialQty);
  const [printConfig, setPrintConfig] = useState<IPrintConfig>({
    location: 'none',
    files: {},
  });

  const total = useMemo(
    () => Object.values(qty).reduce((a, b) => a + b, 0),
    [qty],
  );
  const sumRub = total * item.price;

  const increment = (name: string, max: number) =>
    setQty((q) => ({ ...q, [name]: Math.min((q[name] ?? 0) + 1, max) }));
  const decrement = (name: string) =>
    setQty((q) => ({ ...q, [name]: Math.max((q[name] ?? 0) - 1, 0) }));
  const clearSizes = () => setQty(initialQty);

  const handleLocationChange = (location: TPrintLocation) => {
    setPrintConfig((prev) => {
      // Очищаем файлы по сторонам, которые больше не активны.
      const activeSides = SIDES_FOR_LOCATION[location];
      const nextFiles: IPrintConfig['files'] = {};
      activeSides.forEach((side) => {
        if (prev.files[side]) nextFiles[side] = prev.files[side];
      });
      return { location, files: nextFiles };
    });
  };

  const handleUpload = async (
    side: TPrintSide,
    file: File,
  ): Promise<IPrintFileRef> => {
    const ref = await uploadPrintFile(file);
    setPrintConfig((prev) => ({
      ...prev,
      files: { ...prev.files, [side]: ref },
    }));
    return ref;
  };

  const handleClearFile = (side: TPrintSide) => {
    setPrintConfig((prev) => {
      const next = { ...prev.files };
      delete next[side];
      return { ...prev, files: next };
    });
  };

  const canCheckout = total > 0 && isPrintReady(printConfig, item.isForPrinting);

  const handleAddToCart = () => {
    if (!canCheckout) return;
    const sizesWithUserQty = item.sizes.map((s) => ({
      ...s,
      userQty: qty[s.name] ?? 0,
    }));
    dispatch(
      cartActions.addToCart({
        itemCartId: uuidv4(),
        item: { ...item, sizes: sizesWithUserQty },
        printConfig,
      }),
    );
    router.push('/cart');
  };

  return (
    <div className={styles.box}>
      <div className={styles.head}>
        <h1 className={styles.title}>{item.name}</h1>
        <p className={styles.price}>— {formatRub(item.price)}</p>
        {item.description && <p className={styles.desc}>{item.description}</p>}
        <Link href="/size_chart" target="_blank" className={styles.sizeGuide}>
          Гид по размерам
        </Link>
      </div>

      <SizeGrid
        sizes={item.sizes}
        selected={qty}
        onIncrement={increment}
        onDecrement={decrement}
        onClear={clearSizes}
        total={total}
      />

      {item.isForPrinting && (
        <PrintSelector
          printConfig={printConfig}
          onLocationChange={handleLocationChange}
          onUpload={handleUpload}
          onClearFile={handleClearFile}
        />
      )}

      <div className={styles.ctaRow}>
        <div className={styles.hrThin} />
        <div className={styles.totals}>
          <span className={styles.totalsLabel}>Итого</span>
          <span className={styles.totalsAmount}>
            <span className={styles.countChip}>{total} шт.</span>
            {formatRub(sumRub)}
          </span>
        </div>
        <button
          type="button"
          className={styles.btnCart}
          disabled={!canCheckout}
          onClick={handleAddToCart}
        >
          В корзину
        </button>
      </div>
    </div>
  );
};

const SIDES_FOR_LOCATION: Record<TPrintLocation, TPrintSide[]> = {
  none: [],
  front: ['front'],
  back: ['back'],
  sleeve: ['sleeve'],
  both: ['front', 'back'],
};

function isPrintReady(printConfig: IPrintConfig, allowsPrint: boolean): boolean {
  if (!allowsPrint) return true;
  const required = SIDES_FOR_LOCATION[printConfig.location];
  return required.every((side) => Boolean(printConfig.files[side]));
}

export default ProductInfo;
