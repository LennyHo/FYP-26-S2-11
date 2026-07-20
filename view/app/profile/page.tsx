// User Story Architecture Trace — profile/page.tsx
//
// #246 Update Account (Customer)
//      View: profile/page.tsx (this file) → Route: user.routes.js → Model: user.model.js
"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './Profile.module.css';
import { updateUser } from '../utils/customerApi';
import { getStoredUser, storeUser, type DripTeaAddress } from '../utils/api.base';

const MAX_ADDRESSES = 4;
const ADDRESS_CATEGORIES = ["Home", "Work", "Others"] as const;
type AddressCategory = (typeof ADDRESS_CATEGORIES)[number];

function getAddressCategory(label: string): AddressCategory {
  const normalizedLabel = label.trim().toLowerCase();
  if (normalizedLabel.includes("home")) return "Home";
  if (normalizedLabel.includes("work")) return "Work";
  return "Others";
}

function CategoryIcon({ category }: { category: AddressCategory }) {
  if (category === "Home") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.5 11.5 12 4l8.5 7.5" />
        <path d="M5.5 10v9a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1v-9" />
      </svg>
    );
  }

  if (category === "Work") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3.5" y="7.5" width="17" height="12" rx="2" />
        <path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" />
        <path d="M3.5 13h17" />
      </svg>
    );
  }

  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-6.5-5.4-6.5-10.4A6.5 6.5 0 0 1 18.5 10.6C18.5 15.6 12 21 12 21z" />
      <circle cx="12" cy="10.4" r="2.1" />
    </svg>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [profilePic, setProfilePic] = useState<string>("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [addresses, setAddresses] = useState<DripTeaAddress[]>([]);
  const [activeAddressCategory, setActiveAddressCategory] = useState<AddressCategory>("Home");
  const [status, setStatus] = useState("");
  const [carouselIndex, setCarouselIndex] = useState(0);

  const filteredAddresses = addresses
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => getAddressCategory(String(entry.label || "")) === activeAddressCategory);

  const carouselMax = Math.max(filteredAddresses.length - 1, 0);
  const currentSlide = Math.min(carouselIndex, carouselMax);

  useEffect(() => {
    const user = getStoredUser();
    setProfilePic(user?.profilePic || "/profile_empty.png");
    setName(user?.fullName || "");
    setEmail(user?.email || "");
    setAddresses(user?.addresses
      ? user.addresses.slice(0, MAX_ADDRESSES).map((address: DripTeaAddress) => ({ ...address }))
      : []);
  }, []);

  function addAddress() {
    setAddresses(current => {
      if (current.length >= MAX_ADDRESSES) return current;

      return [
        ...current,
        {
          label: activeAddressCategory === "Others" ? "Other" : activeAddressCategory,
          address: "",
          isDefault: current.length === 0,
        },
      ];
    });
  }

  function removeAddress(index: number) {
    setAddresses(current => {
      const next = current.filter((_, itemIndex) => itemIndex !== index);

      if (current[index]?.isDefault && next.length > 0 && !next.some(address => address.isDefault)) {
        next[0] = { ...next[0], isDefault: true };
      }

      return next;
    });
  }

  function updateAddressField(index: number, field: "label" | "address", value: string) {
    setAddresses(current =>
      current.map((entry, itemIndex) =>
        itemIndex === index ? { ...entry, [field]: value } : entry
      )
    );
  }

  function setDefaultAddress(index: number) {
    setAddresses(current =>
      current.map((entry, itemIndex) => ({
        ...entry,
        isDefault: itemIndex === index,
      }))
    );
  }

  function cleanAddresses() {
    const cleaned = addresses
      .map(entry => ({
        label: String(entry.label || "").trim(),
        address: String(entry.address || "").trim(),
        isDefault: Boolean(entry.isDefault),
      }))
      .filter(entry => entry.address.length > 0)
      .slice(0, MAX_ADDRESSES);

    if (cleaned.length > 0 && !cleaned.some(entry => entry.isDefault)) {
      cleaned[0].isDefault = true;
    }

    return cleaned;
  }

  function handlePicChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const url = ev.target?.result as string;
      setProfilePic(url);
      const user = getStoredUser();
      if (user) {
        try {
          const response = await updateUser(user.id, { profilePic: url });
          storeUser(response.data);
          window.dispatchEvent(new Event('profileUpdated'));
        } catch {
          setStatus("Failed to save profile picture.");
        }
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const user = getStoredUser();
    if (user) {
      try {
        const response = await updateUser(user.id, {
          profilePic,
          fullName: name,
          email,
          addresses: cleanAddresses(),
        });
        storeUser(response.data);
        window.dispatchEvent(new Event('profileUpdated'));
        setStatus("Profile updated!");
        setTimeout(() => setStatus(""), 2500);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Profile update failed.");
      }
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <button type="button" className={styles.backBtn} onClick={() => router.back()} aria-label="Go back">
            <span className={styles.backBtnArrow}>‹</span>
            Back
          </button>
          <div className={styles.headingGroup}>
            <h1 className={styles.heading}>Profile Settings</h1>
            <p className={styles.headingHint}>Manage your details and delivery addresses.</p>
          </div>
          <div className={styles.headerSpacer} />
        </div>

        {/* Form */}
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.profileFields}>
          {/* Avatar */}
          <div className={styles.avatarSection}>
            <div className={styles.avatarWrapper}>
            <img
              src={profilePic || "/profile_empty.png"}
              alt="Profile"
              className={styles.avatarImg}
            />
            <label htmlFor="profilePic" className={styles.avatarEditBtn} aria-label="Change profile picture">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </label>
            <input id="profilePic" name="profilePic" type="file" accept="image/*" onChange={handlePicChange} className={styles.fileInput} />
            </div>
            <p className={styles.avatarHint}>Tap to change your profile photo</p>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="name">Full Name</label>
            <input
              className={styles.input}
              id="name"
              name="name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your full name"
              autoComplete="off"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="email">Email Address</label>
            <input
              className={styles.input}
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="off"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Password</label>
            <div className={styles.passwordRow}>
              <span className={styles.passwordDots}>••••••••</span>
              <button
                type="button"
                className={styles.changePasswordBtn}
                onClick={() => router.push('/change-password')}
              >
                Change Password
              </button>
            </div>
          </div>

          <button className={styles.saveBtn} type="submit">Save Changes</button>

          {status && (
            <div className={styles.successMsg}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {status}
            </div>
          )}
          </div>

          <section className={styles.addressSection}>
            <div className={styles.addressHeader}>
              <div>
                <h2 className={styles.addressTitle}>Saved Delivery Addresses</h2>
                <p className={styles.addressHint}>The default address is used first during delivery checkout.</p>
              </div>

              <button
                type="button"
                className={styles.addAddressBtn}
                onClick={addAddress}
                disabled={addresses.length >= MAX_ADDRESSES}
                title={addresses.length >= MAX_ADDRESSES ? `You can save up to ${MAX_ADDRESSES} addresses.` : undefined}
              >
                {addresses.length >= MAX_ADDRESSES ? "Address limit reached" : `Add Address (${addresses.length}/${MAX_ADDRESSES})`}
              </button>
            </div>

            <div className={styles.addressBody}>
              <div className={styles.addressPillars} role="tablist" aria-label="Address categories">
                {ADDRESS_CATEGORIES.map(category => {
                  const categoryCount = addresses.filter(
                    entry => getAddressCategory(String(entry.label || "")) === category
                  ).length;

                  return (
                    <button
                      key={category}
                      type="button"
                      role="tab"
                      data-category={category.toLowerCase()}
                      aria-selected={activeAddressCategory === category}
                      className={`${styles.addressPillar} ${activeAddressCategory === category ? styles.addressPillarActive : ""}`}
                      onClick={() => {
                        setActiveAddressCategory(category);
                        setCarouselIndex(0);
                      }}
                    >
                      <span className={styles.addressPillarDot} />
                      <CategoryIcon category={category} />
                      <span className={styles.addressPillarLabel}>{category}</span>
                      <span className={styles.addressPillarCount}>{categoryCount}</span>
                    </button>
                  );
                })}
              </div>

              <div className={styles.addressPanel}>
                {filteredAddresses.length === 0 ? (
                  <div className={styles.emptyAddresses}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 21s-6.5-5.4-6.5-10.4A6.5 6.5 0 0 1 18.5 10.6C18.5 15.6 12 21 12 21z" />
                      <circle cx="12" cy="10.4" r="2.1" />
                    </svg>
                    <p>No {activeAddressCategory.toLowerCase()} addresses yet.</p>
                  </div>
                ) : (
                  <div className={styles.addressCarousel}>
                    <div className={styles.addressCarouselViewport}>
                      <div
                        className={styles.addressCarouselTrack}
                        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                      >
                        {filteredAddresses.map(({ entry, index }) => (
                          <div key={index} className={styles.addressCarouselSlide}>
                            <div
                              className={styles.addressCard}
                              data-category={activeAddressCategory.toLowerCase()}
                            >
                              <div className={styles.addressCardHeader}>
                                <span>{activeAddressCategory} address</span>
                              </div>
                              <div className={styles.addressInputs}>
                                <input
                                  className={styles.input}
                                  value={entry.label || ""}
                                  onChange={event => updateAddressField(index, "label", event.target.value)}
                                  placeholder="Label, e.g. Home"
                                />
                                <textarea
                                  className={`${styles.input} ${styles.addressTextarea}`}
                                  value={entry.address || ""}
                                  onChange={event => updateAddressField(index, "address", event.target.value)}
                                  placeholder="Full delivery address"
                                  rows={3}
                                />
                              </div>

                              <div className={styles.addressActions}>
                                {entry.isDefault ? (
                                  <span className={styles.defaultAddressBadge}>
                                    <span className={styles.defaultAddressDot} />
                                    Default address
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    className={styles.setDefaultAddressBtn}
                                    onClick={() => setDefaultAddress(index)}
                                  >
                                    Set as default
                                  </button>
                                )}

                                <button
                                  type="button"
                                  className={styles.removeAddressBtn}
                                  onClick={() => removeAddress(index)}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className={`${styles.carouselNav} ${filteredAddresses.length <= 1 ? styles.carouselNavHidden : ""}`}>
                      {filteredAddresses.length > 1 && (
                        <>
                          <button
                            type="button"
                            className={styles.carouselArrow}
                            aria-label="Previous address"
                            onClick={() => setCarouselIndex(current => Math.max(current - 1, 0))}
                            disabled={currentSlide === 0}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M15 18l-6-6 6-6" />
                            </svg>
                          </button>

                          <div className={styles.carouselDots}>
                            {filteredAddresses.map((_, dotIndex) => (
                              <button
                                key={dotIndex}
                                type="button"
                                className={`${styles.carouselDot} ${dotIndex === currentSlide ? styles.carouselDotActive : ""}`}
                                aria-label={`Go to address ${dotIndex + 1}`}
                                onClick={() => setCarouselIndex(dotIndex)}
                              />
                            ))}
                          </div>

                          <button
                            type="button"
                            className={styles.carouselArrow}
                            aria-label="Next address"
                            onClick={() => setCarouselIndex(current => Math.min(current + 1, carouselMax))}
                            disabled={currentSlide === carouselMax}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 18l6-6-6-6" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}
