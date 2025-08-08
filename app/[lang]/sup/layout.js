// app/[lang]/sup/layout.js
// Серверный layout для сегмента /[lang]/sup: метаданные + хлебные крошки.

import Breadcrumbs from "@/components/navs/Breadcrumbs";
import { getTranslations } from "@/lib/i18n";

/**
 * Генерация метаданных для /[lang]/sup.
 * Next.js 15: params — асинхронный, поэтому await.
 */
export async function generateMetadata( { params } ) {
  const { lang } = await params || { lang : 'ru' };
  const safeLang = lang === 'en' ? 'en' : 'ru';

  const { seo } = getTranslations( safeLang, 'sup' );

  return {
    title       : seo?.title || 'Sup',
    description : seo?.description || '',
    openGraph   : seo?.og,
  };
}

/**
 * Layout с хлебными крошками.
 */
export default function SupLayout( { children } ) {
  return (
    <div className="mx-auto">
      <Breadcrumbs />
      { children }
    </div>
  );
}