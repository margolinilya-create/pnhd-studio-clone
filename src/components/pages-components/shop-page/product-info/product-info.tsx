'use client';

import React, { useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
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
import { SIDES_FOR_LOCATION, PRINT_PRICE_TABLE } from './print-config';
import PrintPreview from './print-preview';

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
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

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
        <button
          type="button"
          className={styles.sizeGuide}
          onClick={() => setSizeGuideOpen(true)}
        >
          Гид по размерам
        </button>
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

      {item.isForPrinting && hasAnyPrintFile(printConfig) && (
        <div className={styles.previewBlock}>
          <h3 className={styles.previewTitle}>Превью принта</h3>
          <PrintPreview
            photoUrl={item.image_url}
            photoAlt={`${item.name} — превью`}
            productType={item.type}
            printConfig={printConfig}
            className={styles.previewImg}
          />
          <p className={styles.previewHint}>
            Это примерное расположение. Финальный масштаб и позиционирование согласует
            дизайнер перед печатью.
          </p>
        </div>
      )}

      {item.isForPrinting && (
        <details className={styles.priceTable}>
          <summary className={styles.priceTableSummary}>Стоимость печати</summary>
          <table>
            <thead>
              <tr>
                <th>Формат</th>
                <th>DTG</th>
                <th>DTF</th>
              </tr>
            </thead>
            <tbody>
              {PRINT_PRICE_TABLE.map((row) => (
                <tr key={row.format}>
                  <td>{row.format}</td>
                  <td>{formatRub(row.dtg)}</td>
                  <td>{formatRub(row.dtf)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.priceTableHint}>
            Окончательную цену рассчитает менеджер по вашему макету и тиражу.
          </p>
        </details>
      )}

      <Dialog
        open={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 1 }}>
          <span style={{ fontFamily: 'Neue_machina', fontSize: 16, fontWeight: 800, textTransform: 'uppercase' }}>
            Гид по размерам
          </span>
          <IconButton onClick={() => setSizeGuideOpen(false)} aria-label="закрыть">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <iframe
            src="/size_chart"
            title="Гид по размерам"
            style={{ width: '100%', height: '70vh', border: 'none', display: 'block' }}
          />
        </DialogContent>
      </Dialog>

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

function isPrintReady(printConfig: IPrintConfig, allowsPrint: boolean): boolean {
  if (!allowsPrint) return true;
  const required = SIDES_FOR_LOCATION[printConfig.location];
  return required.every((side) => Boolean(printConfig.files[side]));
}

function hasAnyPrintFile(printConfig: IPrintConfig): boolean {
  return Object.values(printConfig.files).some((f) => Boolean(f?.url));
}

export default ProductInfo;
