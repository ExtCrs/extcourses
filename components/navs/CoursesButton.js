// components/navs/CoursesButton.js
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getTranslations } from '@/lib/i18n'

/**
 * Кнопка "Перейти к курсам", видна только для авторизованных пользователей.
 */
const CoursesButton = ({ lang = 'ru' }) => {
  const [isAuth, setIsAuth] = useState(false)
  const pathname = usePathname()
  const { t } = getTranslations(lang, 'common')

  useEffect(() => {
    // Проверяем авторизацию пользователя
    supabase.auth.getUser().then(({ data }) => {
      setIsAuth(!!data?.user)
    })
  }, [])

  if (!isAuth) return null

  // Check if current page is courses related
  const isActive = pathname.includes('/courses')
  const linkClass = isActive ? 'text-secondary menu-active' : 'text-secondary'

  const handleClick = (e) => {
    if (isActive) {
      e.preventDefault()
    }
  }

  return (
    <li>
      <Link 
        className={linkClass} 
        href={`/${lang}/courses`}
        onClick={handleClick}
        {...(isActive && { 'aria-disabled': 'true' })}
      >
        {t.common.go_to_courses}
      </Link>
    </li>
  )
}

export default CoursesButton