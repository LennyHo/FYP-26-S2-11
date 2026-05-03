import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enGB from './app/locales/en-GB.json';

const resources = {
  'en-GB': { translation: enGB },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en-GB',
    fallbackLng: 'en-GB',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
