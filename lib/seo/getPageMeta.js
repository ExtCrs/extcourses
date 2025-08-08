// lib/seo/getPageMeta.js
// Серверный хелпер: никаких 'use client', только чтение JSON.

import ru from '@/app/i18n/ru.json'
import en from '@/app/i18n/en.json'

export function getPageMeta(lang = 'ru', section = 'home') {
  const dict = lang === 'en' ? en : ru
  const seo = dict?.[section]?.seo || dict?.seo || {}
  const og = seo?.og || {}

  const title = seo.title || 'ExtCourses'
  const description = seo.description || (lang === 'en' ? 'Courses platform' : 'Платформа курсов')

  return {
    title,
    description,
    openGraph: {
      title: og.title || title,
      description: og.description || description,
      url: og.url || undefined,
      type: 'website',
      images: og.image ? [{ url: og.image }] : undefined,
    },
  }
}