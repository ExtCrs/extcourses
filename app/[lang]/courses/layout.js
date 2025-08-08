import { getTranslations } from '@/lib/i18n'

// Обязательно ждем params, иначе будет ошибка!
export async function generateMetadata({ params }) {
  // params теперь иногда Promise — ждем его!
  const resolvedParams = await params
  const lang = resolvedParams.lang || 'ru'
  const { seo } = getTranslations(lang, 'courses')
  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      title: seo.og?.title,
      description: seo.og?.description,
      images: seo.og?.image ? [seo.og.image] : [],
      url: seo.og?.url,
    },
  }
}

export default function CoursesLayout({ children }) {
  // params не нужны, если не используешь здесь
  return <>{children}</>
}