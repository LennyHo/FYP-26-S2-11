"use client";

import { createPortal } from "react-dom";
import styles from "./ReceiptModal.module.css";

export interface ReceiptLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  customization?: string;
}

export interface ReceiptData {
  orderNo: string;
  orderDate?: string;
  orderType: string;
  customerName: string;
  customerAddress?: string;
  outletName?: string;
  outletAddress?: string;
  paymentStatus?: string;
  items: ReceiptLineItem[];
  subtotal: number;
  deliveryFee?: number;
  discountAmount?: number;
  total: number;
}

interface Props {
  receipt: ReceiptData;
  onClose: () => void;
}

function money(value: number) {
  return `S$ ${Number(value || 0).toFixed(2)}`;
}

function formatReceiptDate(value?: string) {
  const date = value ? new Date(value) : new Date();
  return new Intl.DateTimeFormat("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function ReceiptModal({ receipt, onClose }: Props) {
  // Rendered via a portal directly on <body>, outside the app's nested flex/scroll
  // shell (globalShell/mainPane) — that layout otherwise creates an ambiguous
  // positioning context for print, splitting the receipt across pages.
  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modalShell} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={`${styles.closeBtn} ${styles.noPrint}`} onClick={onClose} aria-label="Close receipt">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className={styles.printArea}>
          <div className={styles.topRow}>
            <div className={styles.companyBlock}>
              <strong>DripTea</strong>
              <span>{receipt.outletName || "DripTea Outlet"}</span>
              {receipt.outletAddress && <span>{receipt.outletAddress}</span>}
            </div>
            <img src="/main_logo.svg" alt="DripTea" className={styles.logo} />
          </div>

          <h2 className={styles.receiptTitle}>RECEIPT</h2>

          <div className={styles.midRow}>
            <div>
              <span className={styles.toLabel}>To</span>
              <div className={styles.customerBlock}>
                <strong>{receipt.customerName || "Guest"}</strong>
                {receipt.customerAddress && <span>{receipt.customerAddress}</span>}
              </div>
            </div>

            <div className={styles.metaTable}>
              <div className={styles.metaRow}>
                <span>Receipt #</span>
                <strong>{receipt.orderNo}</strong>
              </div>
              <div className={styles.metaRow}>
                <span>Date</span>
                <strong>{formatReceiptDate(receipt.orderDate)}</strong>
              </div>
              <div className={styles.metaRow}>
                <span>Order Type</span>
                <strong>{receipt.orderType}</strong>
              </div>
            </div>
          </div>

          <div className={styles.itemsTableWrap}>
            <table className={styles.itemsTable}>
              <thead>
                <tr>
                  <th className={styles.qtyCol}>Qty</th>
                  <th>Description</th>
                  <th className={styles.priceCol}>Unit Price</th>
                  <th className={styles.priceCol}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {receipt.items.map((item, index) => (
                  <tr key={`${item.name}-${index}`}>
                    <td className={styles.qtyCol}>{item.quantity}</td>
                    <td>
                      <span className={styles.itemName}>{item.name}</span>
                      {item.customization && <span className={styles.itemCustom}>{item.customization}</span>}
                    </td>
                    <td className={styles.priceCol}>{money(item.unitPrice)}</td>
                    <td className={styles.priceCol}>{money(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.totalsBlock}>
            <div className={styles.totalsRow}>
              <span>Subtotal</span>
              <span>{money(receipt.subtotal)}</span>
            </div>
            {Boolean(receipt.deliveryFee) && (
              <div className={styles.totalsRow}>
                <span>Delivery Fee</span>
                <span>{money(receipt.deliveryFee || 0)}</span>
              </div>
            )}
            {Boolean(receipt.discountAmount) && (
              <div className={styles.totalsRow}>
                <span>Discount</span>
                <span>-{money(receipt.discountAmount || 0)}</span>
              </div>
            )}
            <div className={`${styles.totalsRow} ${styles.grandTotal}`}>
              <span>Total</span>
              <span>{money(receipt.total)}</span>
            </div>
          </div>

          <div className={styles.footerNote}>
            <p>Thank you for choosing DripTea!</p>
            <p>Payment Status: {receipt.paymentStatus || "Paid"}</p>
          </div>
        </div>

        <div className={`${styles.actions} ${styles.noPrint}`}>
          <button type="button" className={styles.primaryBtn} onClick={() => window.print()}>Download Receipt</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
