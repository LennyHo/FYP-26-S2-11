"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../layout/Header";
import "./Reward.css";

type Voucher = {
  id: string;
  title: string;
  image: string;
  validity: string;
  code: string;
  terms: string;
};

// Static voucher catalogue — no backend yet, matches the 3 rewards the customer asked for.
const VOUCHERS: Voucher[] = [
  {
    id: "bogo",
    title: "Buy 1 Get 1 FREE",
    image: "/img/bubble_teas/b001.jpg",
    validity: "Valid until 31 Dec 2026",
    code: "BOGO2026",
    terms: "Valid on any regular-sized drink. Lowest-priced drink is free. Not combinable with other vouchers.",
  },
  {
    id: "half-off",
    title: "50% OFF 1 Drink",
    image: "/img/bubble_teas/b006.jpg",
    validity: "Valid until 31 Dec 2026",
    code: "HALF50",
    terms: "50% off one regular-sized drink of your choice. Not combinable with other vouchers.",
  },
  {
    id: "free-regular",
    title: "1 Free Regular Drink",
    image: "/img/bubble_teas/b013.jpg",
    validity: "Valid until 31 Dec 2026",
    code: "FREE1CUP",
    terms: "One free regular-sized drink, any flavour. Toppings charged separately.",
  },
];

const SUB_TABS = ["My Vouchers", "Vouchers History"] as const;

export default function Reward() {
  const router = useRouter();
  const [activeSubTab, setActiveSubTab] = useState<typeof SUB_TABS[number]>("My Vouchers");

  const handleUseNow = () => {
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
            <strong>{VOUCHERS.length} rewards waiting for you</strong>
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
            {VOUCHERS.map((voucher) => (
              <article key={voucher.id} className="reward-card">
                <img src={voucher.image} alt={voucher.title} className="reward-card-image" />
                <div className="reward-card-body">
                  <h2 className="reward-card-title">{voucher.title}</h2>
                  <p className="reward-card-validity">{voucher.validity}</p>
                  <p className="reward-card-code">
                    Referral code: <strong>{voucher.code}</strong>
                  </p>
                  <p className="reward-card-terms">{voucher.terms}</p>
                </div>
                <div className="reward-card-actions">
                  <button type="button" className="reward-use-btn" onClick={handleUseNow}>
                    USE NOW
                  </button>
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
            <p>Vouchers you've used or that have expired will appear here.</p>
          </div>
        )}
      </main>
    </div>
  );
}
