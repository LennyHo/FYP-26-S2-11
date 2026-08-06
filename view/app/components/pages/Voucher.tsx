"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../layout/Header";
import { getVouchers, getUsedVouchers } from "../../utils/customerApi";
import { getStoredUser, PENDING_VOUCHER_KEY } from "../../utils/api.base";
import type { DripTeaVoucher } from "../../utils/api.base";
import "./Voucher.css";

function formatValidity(expiresAt?: string | null) {
  if (!expiresAt) return "Valid while stocks last";
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return "Valid while stocks last";
  return `Valid until ${date.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}`;
}

type UsedVoucher = {
  orderId: string;
  orderNo: string;
  voucherCode: string;
  voucherTitle: string;
  discountAmount: number;
  usedAt?: string;
};

const SUB_TABS = ["My Vouchers", "Vouchers History"] as const;

function formatUsedDate(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
}

export default function Voucher() {
  const router = useRouter();
  const [activeSubTab, setActiveSubTab] = useState<typeof SUB_TABS[number]>("My Vouchers");
  const [vouchers, setVouchers] = useState<DripTeaVoucher[]>([]);
  const [usedVouchers, setUsedVouchers] = useState<UsedVoucher[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    async function loadVouchers() {
      try {
        const currentUser = getStoredUser();
        const response = await getVouchers(currentUser?.id);
        setVouchers(response.data || []);
      } catch (error) {
        console.error("[DripTea vouchers]", error);
      }
    }

    void loadVouchers();
  }, []);

  useEffect(() => {
    const currentUser = getStoredUser();
    if (!currentUser) return;

    async function loadHistory() {
      setIsLoadingHistory(true);
      try {
        const response = await getUsedVouchers(currentUser.id);
        setUsedVouchers(response.data || []);
      } catch (error) {
        console.error("[DripTea voucher history]", error);
      } finally {
        setIsLoadingHistory(false);
      }
    }

    void loadHistory();
  }, []);

  const handleUseNow = (code: string) => {
    window.localStorage.setItem(PENDING_VOUCHER_KEY, code);
    router.push("/buy-driptea");
  };

  return (
    <div className="voucher-page">
      <Header />

      <main className="voucher-main">
        {/* Highlight banner, styled as a ticket stub — the vouchers themselves are the subject */}
        <div className="voucher-highlight">
          <div className="voucher-highlight-main">
            <svg className="voucher-highlight-icon" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 12v9H4v-9" />
              <path d="M2 7h20v5H2z" />
              <path d="M12 22V7" />
              <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
              <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
            </svg>
            <div className="voucher-highlight-body">
              <strong>Vouchers waiting for you</strong>
              <span>Redeem them on your next order before they expire</span>
            </div>
          </div>
          <div className="voucher-highlight-stub" aria-hidden="true">
            <span className="voucher-highlight-count">{vouchers.length}</span>
            <span className="voucher-highlight-label">Ready</span>
          </div>
        </div>

        {/* Sub tabs */}
        <div className="voucher-subtabs">
          {SUB_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`voucher-subtab${activeSubTab === tab ? " active" : ""}`}
              onClick={() => setActiveSubTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeSubTab === "My Vouchers" ? (
          <div className="voucher-list">
            {vouchers.map((voucher) => {
              return (
                <article key={voucher.code} className="voucher-card">
                  <img src="/main_logo.svg" alt="DripTea" className="voucher-card-image" />
                  <div className="voucher-card-body">
                    <h2 className="voucher-card-title">{voucher.title}</h2>
                    <p className="voucher-card-validity">{formatValidity(voucher.expiresAt)}</p>
                    <p className="voucher-card-code">
                      Referral code: <strong>{voucher.code}</strong>
                    </p>
                    <p className="voucher-card-terms">{voucher.description}</p>
                  </div>
                  <div className="voucher-card-actions">
                    <button type="button" className="voucher-use-btn" onClick={() => handleUseNow(voucher.code)}>
                      USE NOW
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : usedVouchers.length > 0 ? (
          <div className="voucher-list">
            {usedVouchers.map((used) => (
              <article key={used.orderId} className="voucher-card voucher-card-history">
                <div className="voucher-card-body">
                  <h2 className="voucher-card-title">{used.voucherTitle}</h2>
                  <p className="voucher-card-validity">Used on {formatUsedDate(used.usedAt)} · Order #{used.orderNo}</p>
                  <p className="voucher-card-code">
                    Referral code: <strong>{used.voucherCode}</strong>
                  </p>
                  <p className="voucher-card-terms">S$ {used.discountAmount.toFixed(2)} discount applied.</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="voucher-empty">
            <div className="voucher-empty-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 12v9H4v-9" />
                <path d="M2 7h20v5H2z" />
                <path d="M12 22V7" />
              </svg>
            </div>
            <h2>No voucher history yet</h2>
            <p>{isLoadingHistory ? "Loading..." : "Vouchers you've used will appear here."}</p>
          </div>
        )}
      </main>
    </div>
  );
}
