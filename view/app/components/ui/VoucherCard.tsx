"use client";
import styles from "./VoucherCard.module.css";

interface VoucherItem {
    code: string;
    title: string;
    description?: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
    maxDiscount?: number | null;
    minSpend?: number;
    expiresAt?: string | null;
}

export interface VoucherCardData {
    title?: string;
    vouchers: VoucherItem[];
}

interface Props {
    voucherCard: VoucherCardData;
}

function formatDiscount(voucher: VoucherItem) {
    if (voucher.discountType === "percentage") {
        const cap = voucher.maxDiscount != null ? ` (up to S$ ${Number(voucher.maxDiscount).toFixed(2)})` : "";
        return `${voucher.discountValue}% off${cap}`;
    }
    return `S$ ${Number(voucher.discountValue).toFixed(2)} off`;
}

function formatMinSpend(voucher: VoucherItem) {
    const minSpend = Number(voucher.minSpend || 0);
    return minSpend > 0 ? `Min. spend S$ ${minSpend.toFixed(2)}` : "No minimum spend";
}

function formatExpiry(voucher: VoucherItem) {
    if (!voucher.expiresAt) return "No expiry date";
    const date = new Date(voucher.expiresAt);
    if (Number.isNaN(date.getTime())) return "No expiry date";
    return `Expires ${date.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}`;
}

export default function VoucherCard({ voucherCard }: Props) {
    const vouchers = Array.isArray(voucherCard?.vouchers) ? voucherCard.vouchers : [];
    if (!vouchers.length) return null;

    return (
        <div className={styles.root}>
        {voucherCard.title && <div className={styles.header}>{voucherCard.title}</div>}

        {vouchers.map((voucher) => (
            <div key={voucher.code} className={styles.voucherBlock}>
            <div className={styles.topRow}>
                <span className={styles.voucherName}>{voucher.title}</span>
                <span className={styles.discountBadge}>{formatDiscount(voucher)}</span>
            </div>

            {voucher.description && <p className={styles.description}>{voucher.description}</p>}

            <div className={styles.metaRow}>
                <span className={styles.codePill}>{voucher.code}</span>
                <span className={styles.minSpend}>{formatMinSpend(voucher)}</span>
                <span className={styles.minSpend}>{formatExpiry(voucher)}</span>
            </div>
            </div>
        ))}

        <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => (window as any).handleVouchers?.()}
        >
            View All Vouchers
        </button>
        </div>
    );
}
