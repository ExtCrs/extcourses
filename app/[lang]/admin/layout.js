// app/[lang]/admin/layout.js
// Серверный layout для сегмента /[lang]/admin.
// Здесь же генерируем метаданные. В Next.js 15 объект params в generateMetadata — асинхронный.

import Breadcrumbs from "@/components/navs/Breadcrumbs";
import { getTranslations } from "@/lib/i18n";

/**
 * Генерация метаданных для /[lang]/admin.
 * Важно: в Next 15 нужно await params, иначе будет ошибка
 * "params should be awaited before using its properties".
 * Используем только локальные JSON-переводы (никаких сетевых запросов — экономим Vercel Free).
 */
export async function generateMetadata( { params } ) {
  const { lang } = await params || { lang : 'ru' };

  // Берём SEO-тексты для страницы "admin" из локализации
  const { seo } = getTranslations( lang || 'ru', 'admin' );

  return {
    title       : seo?.title || 'Admin',
    description : seo?.description || '',
    openGraph   : seo?.og,
  };
}

/**
 * Основной layout: хлебные крошки + контент.
 * Это серверный компонент (без 'use client'), рендерится дёшево и быстро.
 */
export default function AdminLayout( { children } ) {
  return (
    <div className="mx-auto py-4">
      <Breadcrumbs />
      { children }
    </div>
  );
}