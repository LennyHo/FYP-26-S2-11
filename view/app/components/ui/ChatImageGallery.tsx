"use client";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./ChatImageGallery.module.css";

interface Props {
  images: string[];
}

const VISIBLE_COUNT = 2;

export default function ChatImageGallery({ images }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const visible = images.slice(0, VISIBLE_COUNT);
  const hiddenCount = images.length - VISIBLE_COUNT;

  useEffect(() => {
    if (openIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpenIndex(null); return; }
      if (e.key === "ArrowLeft") { setOpenIndex(i => (i && i > 0 ? i - 1 : i)); return; }
      if (e.key === "ArrowRight") { setOpenIndex(i => (typeof i === "number" && i < images.length - 1 ? i + 1 : i)); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openIndex, images.length]);

  return (
    <>
      <div className={styles.thumbRow} role="list" aria-label="Attached screenshots">
        {visible.map((src, i) => {
          const isLastVisible = i === VISIBLE_COUNT - 1;
          const showOverlay = isLastVisible && hiddenCount > 0;
          return (
            <button
              key={i}
              type="button"
              className={styles.thumbButton}
              onClick={() => setOpenIndex(i)}
              aria-label={showOverlay ? `View all ${images.length} screenshots` : `View screenshot ${i + 1}`}
            >
              <img src={src} alt="" className={styles.thumbImg} />
              {showOverlay && (
                <span className={styles.thumbOverlay}>+{hiddenCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {openIndex !== null && createPortal(
        <div
          className={styles.lightboxOverlay}
          role="dialog"
          aria-modal="true"
          onClick={() => setOpenIndex(null)}
        >
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            {images.length > 1 && (
              <button
                type="button"
                className={`${styles.lightboxNavButton} ${styles.lightboxPrev}`}
                onClick={() => setOpenIndex(i => (i && i > 0 ? i - 1 : i))}
                aria-label="Previous screenshot"
              >
                ‹
              </button>
            )}
            <img src={images[openIndex]} alt="" className={styles.lightboxImg} />
            {images.length > 1 && (
              <button
                type="button"
                className={`${styles.lightboxNavButton} ${styles.lightboxNext}`}
                onClick={() => setOpenIndex(i => (typeof i === "number" && i < images.length - 1 ? i + 1 : i))}
                aria-label="Next screenshot"
              >
                ›
              </button>
            )}
          </div>
          <button
            type="button"
            className={styles.lightboxClose}
            onClick={() => setOpenIndex(null)}
            aria-label="Close preview"
          >
            ×
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
