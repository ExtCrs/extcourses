'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { getTranslations } from '@/lib/i18n'
import courses from '@/data/courses_ru.json'

/**
 * Получить заголовок курса по url и текущему языку.
 */
function getCourseTitle(courseUrl, lang) {
  const course = courses.find(c => c.url === courseUrl)
  if (!course) return courseUrl
  return course.title
}

export default function Breadcrumbs() {
  const pathname = usePathname()
  const params = useParams()
  const lang = params.lang || 'ru'
  const { t } = getTranslations(lang)
  const breadcrumbsDict = t.breadcrumbs || {}
  const segments = pathname.split('/').filter(Boolean)

  const crumbs = []

  // Первая крошка — Главная
  crumbs.push(
    <li key="home">
      <Link className='text-secondary' href={`/${lang}`}>
        {breadcrumbsDict.home}
      </Link>
    </li>
  )

  let pathAccumulator = ''
  segments.forEach((segment, idx) => {
    // Пропуск языка
    if (idx === 0 && (segment === 'ru' || segment === 'en')) return

    pathAccumulator += `/${segment}`
    const isLast = idx === segments.length - 1
    let label

    // /courses/current -> "current_course"
    if (
      segments[idx - 1] === 'courses' &&
      segment === 'current' &&
      isLast
    ) {
      label = breadcrumbsDict.current_course
    }
    // /courses/[course]
    else if (
      segments[idx - 1] === 'courses' &&
      isLast
    ) {
      label = getCourseTitle(segment, lang)
    }
    // /admin (или другие уникальные)
    else if (breadcrumbsDict[segment]) {
      label = breadcrumbsDict[segment]
    }
    // универсально: ищем t[segment]?.title или fallback на сам сегмент
    else {
      label =
        t[segment]?.title ||
        decodeURIComponent(segment)
    }

    crumbs.push(
      <li key={idx} className={isLast ? 'font-semibold text-secondary/50' : 'text-secondary'}>
        {isLast ? (
          label
        ) : (
          <Link href={`/${lang}${pathAccumulator}`}>{label}</Link>
        )}
      </li>
    )
  })

  return (
    <div className="breadcrumbs max-w-xl text-sm mt-4 ml-4">
      <ul>
        {crumbs}
      </ul>
    </div>
  )
}