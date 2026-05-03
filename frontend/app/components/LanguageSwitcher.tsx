"use client";

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiGlobe } from 'react-icons/fi';
import styles from './LanguageSwitcher.module.css';

const languages = [
  { code: 'en-GB', name: 'englishUK' },
  { code: 'zh-CN', name: 'chineseSimplified' },
  { code: 'zh-TW', name: 'chineseTraditional' },
  { code: 'ko', name: 'korean' },
  { code: 'es', name: 'spanish' },
  { code: 'it', name: 'italian' },
  { code: 'fr', name: 'french' },
  { code: 'id', name: 'bahasa' },
];

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('driptea_language', langCode);
    setIsOpen(false);
  };

  if (!isMounted) {
    return null;
  }

  const currentLanguage = languages.find(lang => lang.code === i18n.language);

  return (
    <div className={styles.container}>
      <button
        className={styles.button}
        onClick={() => setIsOpen(!isOpen)}
        title={t('language')}
        aria-label={t('language')}
      >
        <FiGlobe size={20} />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>{t('language')}</div>
          <div className={styles.languageList}>
            {languages.map((lang) => (
              <button
                key={lang.code}
                className={`${styles.languageItem} ${
                  i18n.language === lang.code ? styles.active : ''
                }`}
                onClick={() => handleLanguageChange(lang.code)}
              >
                {t(lang.name)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
