import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import es from './locales/es.json';
import en from './locales/en.json';

const resources = {
  es: { translation: es },
  en: { translation: en }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'es',
    supportedLngs: ['es', 'en'],
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;

export const changeLanguage = (lang: 'es' | 'en') => {
  i18n.changeLanguage(lang);
  localStorage.setItem('i18nextLng', lang);
};

export const getCurrentLanguage = () => i18n.language;

export const isSpanish = () => i18n.language === 'es';
export const isEnglish = () => i18n.language === 'en';

export const t = i18n.t.bind(i18n);