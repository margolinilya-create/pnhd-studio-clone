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
          return (
            <button
              key={s.name}
              type="button"
              className={tileClass}
              disabled={out}
              onClick={() => onIncrement(s.name, s.qty)}
            >
              <div className={styles.vbTop}>
                <span className={styles.vbLabel}>{s.name}</span>
                {n > 0 ? (
                  <span className={styles.vbCount}>
                    <span
                      role="button"
                      tabIndex={0}
                      className={styles.vbMinus}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDecrement(s.name);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          onDecrement(s.name);
                        }
                      }}
                    >
                      −
                    </span>
                    <b>{n}</b>
                  </span>
                ) : (
                  !out && <span className={styles.vbAdd}>+</span>
                )}
              </div>
              <div className={styles.vbStockRow}>
                <span className={styles.vbStockNum}>
                  {out ? 'нет в наличии' : `осталось ${remaining}`}
                </span>
                {!out && <span className={styles.vbStockTotal}>из {s.qty}</span>}
              </div>
              {!out && (
                <div className={styles.vbBar}>
                  <div className={styles.vbBarFill} style={{ width: `${pct}%` }} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SizeGrid;
