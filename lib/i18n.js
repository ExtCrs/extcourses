// lib/i18n.js
import ru from '@/app/i18n/ru.json';
import en from '@/app/i18n/en.json';

const translations = {
  ru,
  en,
};

/**
 * Получает переводы и SEO данные по ключу страницы
 * @param {string} [lang='ru'] - язык ('ru', 'en'), по умолчанию 'ru'
 * @param {string} [pageKey='home'] - ключ страницы ('home', 'about', 'auth')
 */
export function getTranslations(lang = 'ru', pageKey = 'home') {
  const langData = translations[lang] || translations.ru;
  const seoData = langData.seo?.[pageKey] || langData.seo.home;

  return {
    t: langData,
    seo: {
      title: seoData.title,
      description: seoData.description,
      og: seoData.og,
    },
  };
}