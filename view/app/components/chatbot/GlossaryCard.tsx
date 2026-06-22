"use client";
import React from 'react';
import { GLOSSARY } from '../../data/glossaryData';
import styles from './GlossaryCard.module.css';

interface Props {
  termKey: string;
  onClose: () => void;
}

export default function GlossaryCard({ termKey, onClose }: Props) {
  const entry = GLOSSARY[termKey];
  if (!entry) return null;

  return (
    <div className={styles.overlay} onClick={onClose} aria-modal="true" role="dialog">
      <div className={styles.card} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{entry.term}</h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className={styles.description}>{entry.description}</p>
        {entry.details && entry.details.length > 0 && (
          <table className={styles.table}>
            <tbody>
              {entry.details.map(row => (
                <tr key={row.label}>
                  <td className={styles.tableLabel}>{row.label}</td>
                  <td className={styles.tableValue}>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
