import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enGB from './app/locales/en-GB.json';
import zhCN from './app/locales/zh-CN.json';
import zhTW from './app/locales/zh-TW.json';
import ko from './app/locales/ko.json';
import es from './app/locales/es.json';
import it from './app/locales/it.json';
import fr from './app/locales/fr.json';
import id from './app/locales/id.json';

const resources = {
  'en-GB': { translation: enGB },
  'zh-CN': { translation: zhCN },
  'zh-TW': { translation: zhTW },
  'ko': { translation: ko },
  'es': { translation: es },
  'it': { translation: it },
  'fr': { translation: fr },
  'id': { translation: id },
};

// Get saved language from localStorage or default to English
const getSavedLanguage = () => {
  if (typeof window === 'undefined') return 'en-GB';
  return localStorage.getItem('driptea_language') || 'en-GB';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getSavedLanguage(),
    fallbackLng: 'en-GB',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
