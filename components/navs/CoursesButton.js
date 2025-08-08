// components/navs/CoursesButton.js
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getTranslations } from '@/lib/i18n'

/**
 * Кнопка "Перейти к курсам", видна только для авторизованных пользователей.
 */
const CoursesButton = ({ lang = 'ru' }) => {
  const [isAuth, setIsAuth] = useState(false)
  const { t } = getTranslations(lang, 'common')

  useEffect(() => {
    // Проверяем авторизацию пользователя
    supabase.auth.getUser().then(({ data }) => {
      setIsAuth(!!data?.user)
    })
  }, [])

  if (!isAuth) return null

  return (
    <li>
      <Link className="text-secondary" href={`/${lang}/courses`}>
        {t.common.go_to_courses}
      </Link>
    </li>
  )
}

export default CoursesButton