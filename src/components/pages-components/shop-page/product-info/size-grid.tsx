'use client';

import React from 'react';
import styles from './product-info.module.css';

type SizeEntry = { name: string; qty: number };

type Props = {
  sizes: SizeEntry[];
  selected: Record<string, number>;
  onIncrement: (name: string, max: number) => void;
  onDecrement: (name: string) => void;
  onClear: () => void;
  total: number;
};

const SizeGrid: React.FC<Props> = ({
  sizes,
  selected,
  onIncrement,
  onDecrement,
  onClear,
  total,
}) => {
  if (!sizes || sizes.length === 0) {
    return (
      <div className={styles.sizesHead}>
        <span className={styles.sizesEyebrow}>Размеры скоро появятся</span>
      </div>
    );
  }
  return (
    <div>
      <div className={styles.sizesHead}>
        <span className={styles.sizesEyebrow}>Размер · видно, сколько осталось</span>
        {total > 0 && (
          <button type="button" className={styles.sizesClear} onClick={onClear}>
            Очистить
          </button>
        )}
      </div>
      <div className={styles.vbGrid} style={{ marginTop: 12 }}>
        {sizes.map((s) => {
          const n = selected[s.name] ?? 0;
          const out = s.qty <= 0;
          const remaining = Math.max(0, s.qty - n);
          const pct = out ? 0 : Math.min(100, (n / s.qty) * 100);
          const tileClass = [
            styles.vbTile,
            n > 0 ? styles.isActive : '',
            out ? styles.isOut : '',
          ]
            .filter(Boolean)
            .join(' ');
          const ariaLabel = out
            ? `${s.name} — нет в наличии`
            : `Добавить размер ${s.name}, осталось ${remaining} из ${s.qty}, выбрано ${n}`;
          return (
            <div key={s.name} className={tileClass} aria-disabled={out}>
              <button
                type="button"
                className={styles.vbTileButton}
                disabled={out}
                onClick={() => onIncrement(s.name, s.qty)}
                aria-label={ariaLabel}
              >
                <div className={styles.vbTop}>
                  <span className={styles.vbLabel}>{s.name}</span>
                  {n > 0 ? (
                    <span className={styles.vbCount} aria-hidden="true">
                      <b>{n}</b>
                    </span>
                  ) : (
                    !out && (
                      <span className={styles.vbAdd} aria-hidden="true">
                        +
                      </span>
                    )
                  )}
                </div>
                <div className={styles.vbStockRow}>
                  <span className={styles.vbStockNum}>
                    {out ? 'нет в наличии' : `осталось ${remaining}`}
                  </span>
                  {!out && <span className={styles.vbStockTotal}>из {s.qty}</span>}
                </div>
                {!out && (
                  <div className={styles.vbBar} aria-hidden="true">
                    <div className={styles.vbBarFill} style={{ width: `${pct}%` }} />
                  </div>
                )}
              </button>
              {n > 0 && (
                <button
                  type="button"
                  className={styles.vbMinus}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDecrement(s.name);
                  }}
                  aria-label={`Убрать одну единицу размера ${s.name}`}
                >
                  −
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SizeGrid;
