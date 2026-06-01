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
import { useAppDispatch, useAppSelector } from '@/redux/redux-hooks';
import { actions as cartActions } from '@/redux/cart-slice/cart.slice';
import { useRouter, useSearchParams } from 'next/navigation';
import { uploadPrintFile, deletePrintFile } from '@/lib/storage/upload-print';
import { SIDES_FOR_LOCATION, PRINT_PRICE_TABLE } from './print-config';

const formatRub = (n: number) => new Intl.NumberFormat('ru-RU').format(n) + ' ₽';

const ProductInfo: React.FC<{ item: IProduct }> = ({ item }) => {
  const searchParams = useSearchParams();
  const editItemCartId = searchParams.get('edit') ?? undefined;
  const isHydrated = useAppSelector((store) => store.cart.isHydrated);
  // Если открыли с ?edit= — ждём гидрации корзины из sessionStorage (см. CartIcon
  // hydration race fix), иначе useState ниже инициализируется до того как Redux
  // подтянет редактируемый item, и prefill сорвётся.
  if (editItemCartId && !isHydrated) {
    return (
      <div className={styles.box}>
        <p style={{ fontSize: 14, color: '#888' }}>Загружаем корзину…</p>
      </div>
    );
  }
  return <ProductInfoInner item={item} editItemCartId={editItemCartId} />;
};

const ProductInfoInner: React.FC<{
  item: IProduct;
  editItemCartId: string | undefined;
}> = ({ item, editItemCartId }) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const editEntry = useAppSelector((store) =>
    editItemCartId ? store.cart.order.find((e) => e.itemCartId === editItemCartId) : undefined,
  );
  const isEditMode = Boolean(editEntry);

  const initialQty = useMemo(() => {
    const map: Record<string, number> = {};
    item.sizes.forEach((s) => {
      // В edit-mode инициализируем выбранные ранее количества (userQty с момента
      // прошлого «В корзину»). Иначе — нули.
      const fromCart = editEntry?.item.sizes.find((cs) => cs.name === s.name)?.userQty ?? 0;
      map[s.name] = fromCart;
    });
    return map;
  }, [item.sizes, editEntry]);
  const [qty, setQty] = useState<Record<string, number>>(initialQty);
  const [printConfig, setPrintConfig] = useState<IPrintConfig>(
    editEntry?.printConfig ?? { location: 'none', files: {} },
  );
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
    // audit C8 — pre-cart orphan: если на этом side уже был файл (юзер
    // перезагрузил без commit'а в Redux), удаляем старый из Storage.
    // cart-orphan-cleanup middleware не видит pre-cart state, поэтому
    // делаем это локально.
    const previousRef = printConfig.files[side];
    if (previousRef?.path && previousRef.path !== ref.path) {
      void deletePrintFile(previousRef.path);
    }
    setPrintConfig((prev) => ({
      ...prev,
      files: { ...prev.files, [side]: ref },
    }));
    return ref;
  };

  const handleClearFile = (side: TPrintSide) => {
    setPrintConfig((prev) => {
      const next = { ...prev.files };
      // audit C8 — при clear-up до cart-commit'а удаляем из Storage.
      const removed = prev.files[side];
      if (removed?.path) {
        void deletePrintFile(removed.path);
      }
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
    if (isEditMode && editItemCartId) {
      dispatch(
        cartActions.updateCartItem({
          itemCartId: editItemCartId,
          item: { ...item, sizes: sizesWithUserQty },
          printConfig,
        }),
      );
    } else {
      dispatch(
        cartActions.addToCart({
          itemCartId: uuidv4(),
          item: { ...item, sizes: sizesWithUserQty },
          printConfig,
        }),
      );
    }
    router.push('/cart');
  };

  return (
    <div className={styles.box}>
      {isEditMode && (
        <div className={styles.editBanner} role="status">
          Редактируете товар в корзине: размеры и макет уже подставлены, измените что нужно и нажмите «Сохранить изменения».
        </div>
      )}
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
          {isEditMode ? 'Сохранить изменения' : 'В корзину'}
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

export default ProductInfo;
