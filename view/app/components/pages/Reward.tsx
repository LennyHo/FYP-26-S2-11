"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../layout/Header";
import { getVouchers, getUsedVouchers } from "../../utils/customerApi";
import { getStoredUser, PENDING_VOUCHER_KEY } from "../../utils/api.base";
import type { DripTeaVoucher } from "../../utils/api.base";
import "./Reward.css";

// Client-only display details (image + validity copy) for each voucher code.
// Title, code, and terms all come from the vouchers collection — this map must
// NOT duplicate those, it only adds what the database has no field for.
const VOUCHER_DISPLAY: Record<string, { image: string; validity: string }> = {
  BOGO2026: { image: "/img/bubble_teas/b001.jpg", validity: "Valid until 31 Dec 2026" },
  HALF50: { image: "/img/bubble_teas/b006.jpg", validity: "Valid until 31 Dec 2026" },
  FREE1CUP: { image: "/img/bubble_teas/b013.jpg", validity: "Valid until 31 Dec 2026" },
  SAVE5: { image: "/img/bubble_teas/b002.jpg", validity: "Valid until 31 Dec 2026" },
  WELCOME15: { image: "/img/bubble_teas/b009.jpg", validity: "Valid until 31 Dec 2026" },
  TOPUP20: { image: "/img/bubble_teas/b017.jpg", validity: "Valid until 31 Dec 2026" },
};
const DEFAULT_DISPLAY = { image: "/img/bubble_teas/b001.jpg", validity: "Valid while stocks last" };

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

export default function Reward() {
  const router = useRouter();
  const [activeSubTab, setActiveSubTab] = useState<typeof SUB_TABS[number]>("My Vouchers");
  const [vouchers, setVouchers] = useState<DripTeaVoucher[]>([]);
  const [usedVouchers, setUsedVouchers] = useState<UsedVoucher[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    async function loadVouchers() {
      try {
        const response = await getVouchers();
        setVouchers(response.data || []);
      } catch (error) {
        console.error("[DripTea reward vouchers]", error);
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
    router.push("/order-type");
  };

  return (
    <div className="reward-page">
      <Header />

      <main className="reward-main">
        {/* Highlight banner — pillar-style callout showing how many rewards are ready */}
        <div className="reward-highlight">
          <div className="reward-highlight-pillar">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 12v9H4v-9" />
              <path d="M2 7h20v5H2z" />
              <path d="M12 22V7" />
              <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
              <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
            </svg>
          </div>
          <div className="reward-highlight-body">
            <strong>{vouchers.length} rewards waiting for you</strong>
            <span>Redeem them on your next order before they expire</span>
          </div>
          <div className="reward-highlight-decor" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>

        {/* Sub tabs */}
        <div className="reward-subtabs">
          {SUB_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`reward-subtab${activeSubTab === tab ? " active" : ""}`}
              onClick={() => setActiveSubTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeSubTab === "My Vouchers" ? (
          <div className="reward-list">
            {vouchers.map((voucher) => {
              const display = VOUCHER_DISPLAY[voucher.code] || DEFAULT_DISPLAY;

              return (
                <article key={voucher.code} className="reward-card">
                  <img src={display.image} alt={voucher.title} className="reward-card-image" />
                  <div className="reward-card-body">
                    <h2 className="reward-card-title">{voucher.title}</h2>
                    <p className="reward-card-validity">{display.validity}</p>
                    <p className="reward-card-code">
                      Referral code: <strong>{voucher.code}</strong>
                    </p>
                    <p className="reward-card-terms">{voucher.description}</p>
                  </div>
                  <div className="reward-card-actions">
                    <button type="button" className="reward-use-btn" onClick={() => handleUseNow(voucher.code)}>
                      USE NOW
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : usedVouchers.length > 0 ? (
          <div className="reward-list">
            {usedVouchers.map((used) => (
              <article key={used.orderId} className="reward-card reward-card-history">
                <div className="reward-card-body">
                  <h2 className="reward-card-title">{used.voucherTitle}</h2>
                  <p className="reward-card-validity">Used on {formatUsedDate(used.usedAt)} · Order #{used.orderNo}</p>
                  <p className="reward-card-code">
                    Referral code: <strong>{used.voucherCode}</strong>
                  </p>
                  <p className="reward-card-terms">S$ {used.discountAmount.toFixed(2)} discount applied.</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="reward-empty">
            <div className="reward-empty-icon">
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
