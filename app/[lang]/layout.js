// app/[lang]/layout.js
// Серверный layout для сегмента /[lang], без <html>/<body> и без 'use client'.

import LangShell from './LangShell';
import { getTranslations } from '@/lib/i18n';

/**
 * Generate static params for supported languages
 * This ensures both /ru and /en routes are pre-generated
 */
export function generateStaticParams() {
  return [
    { lang: 'ru' },
    { lang: 'en' }
  ]
}

/**
 * Генерация метаданных для корневого сегмента /[lang]
 * — params в Next.js 15 асинхронный, поэтому обязательно await.
 * — используем только локальные JSON-переводы (дёшево для Vercel Free).
 */
export async function generateMetadata( { params } ) {
  const { lang } = await params || { lang: 'ru' };
  const safeLang = lang === 'en' ? 'en' : 'ru';

  const { seo } = getTranslations(safeLang, 'home');

  return {
    title       : seo?.title || 'Home',
    description : seo?.description || '',
    openGraph   : seo?.og,
  };
}

/**
 * Основной layout: оборачивает дочерние страницы в LangShell.
 * Здесь выбираем безопасный язык (только 'ru' или 'en').
 */
export default async function LangLayout({ children, params }) {
  const { lang } = await params;
  const safeLang = lang === 'en' ? 'en' : 'ru';

  return (
    <LangShell lang={safeLang}>
      {children}
    </LangShell>
  );
}