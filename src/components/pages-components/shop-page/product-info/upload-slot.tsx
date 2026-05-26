'use client';

import React, { useRef, useState } from 'react';
import styles from './product-info.module.css';
import { IPrintFileRef, TPrintSide } from '@/app/utils/types';

const SIDE_LABEL: Record<TPrintSide, string> = {
  front: 'Грудь',
  back: 'Спина',
  sleeve: 'Рукав',
};

const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPT = 'image/png,image/jpeg,image/webp';
const ACCEPTED_MIME = ['image/png', 'image/jpeg', 'image/webp'] as const;

type Props = {
  side: TPrintSide;
  file?: IPrintFileRef;
  onUpload: (file: File) => Promise<IPrintFileRef>;
  onClear: () => void;
};

const UploadSlot: React.FC<Props> = ({ side, file, onUpload, onClear }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const [isDrag, setIsDrag] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPicker = () => {
    if (file || isLoading) return;
    inputRef.current?.click();
  };

  const handleFile = async (raw?: File | null) => {
    setError(null);
    if (!raw) return;
    if (!(ACCEPTED_MIME as readonly string[]).includes(raw.type)) {
      setError('Только PNG, JPG или WEBP');
      return;
    }
    if (raw.size > MAX_BYTES) {
      setError('Файл больше 20 МБ');
      return;
    }
    setIsLoading(true);
    try {
      await onUpload(raw);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить');
    } finally {
      setIsLoading(false);
    }
  };

  const classes = [
    styles.uploadSlot,
    isDrag ? styles.isDrag : '',
    file ? styles.hasFile : '',
    isLoading ? styles.isLoading : '',
  ]
    .filter(Boolean)
    .join(' ');

  const interactive = !file && !isLoading;

  return (
    <div
      className={classes}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : -1}
      aria-label={interactive ? `Загрузить файл для печати (${SIDE_LABEL[side]})` : undefined}
      onClick={openPicker}
      onKeyDown={(e) => {
        if (!interactive) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPicker();
        }
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        if (isLoading) return;
        dragCounterRef.current += 1;
        setIsDrag(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
        if (dragCounterRef.current === 0) setIsDrag(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        dragCounterRef.current = 0;
        setIsDrag(false);
        if (isLoading) return;
        handleFile(e.dataTransfer.files?.[0]);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {file ? (
        <>
          <img src={file.url} alt="" className={styles.uploadThumb} />
          <div className={styles.uploadMeta}>
            <span className={styles.uploadSide}>{SIDE_LABEL[side]}</span>
            <span className={styles.uploadFilename} title={file.filename}>
              {file.filename}
            </span>
          </div>
          <button
            type="button"
            className={styles.uploadClear}
            onClick={(e) => {
              e.stopPropagation();
              onClear();
              setError(null);
            }}
            aria-label="удалить файл"
          >
            ×
          </button>
        </>
      ) : (
        <>
          <div className={styles.uploadArrow}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <path
                d="M11 16V6M11 6L6 11M11 6L16 11"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className={styles.uploadSide}>{SIDE_LABEL[side]}</div>
          <div className={styles.uploadHint}>
            {isLoading ? 'Загрузка…' : 'Перетащи файл или нажми'}
          </div>
          <div className={styles.uploadFormats}>PNG · JPG · WEBP · до 20 МБ</div>
          {error && (
            <div className={styles.uploadError} role="alert">
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UploadSlot;
