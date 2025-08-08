import { getTranslations } from '@/lib/i18n'

// Генерация SEO-метаданных для страницы конкретного курса
export async function generateMetadata({ params }) {
  // params теперь иногда Promise — ждем его!
  const resolvedParams = await params
  const lang = resolvedParams.lang || 'ru'
  const { seo } = getTranslations(lang, 'course')

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

// Обязательный layout для вложенных страниц Next.js App Router
export default function CourseLayout({ children, params }) {
  return <>{children}</>
}