'use client'

import React, { useEffect, useState } from 'react'
import Auth from "@/components/auth/Auth"
import ScnLogo from "@/components/graphics/ScnLogo"
import NovisLogo from '@/components/graphics/NovisLogo'
import TampaLogo from '@/components/graphics/TampaLogo'
import { getTranslations } from '@/lib/i18n'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

// Главная страница
export default function Home({ params }) {
  // В App Router параметры надо обрабатывать через use()
  const resolvedParams = React.use(params)
  const lang = resolvedParams.lang

  // Берём переводы и SEO для home (описание) и common (кнопка)
  const { t, seo } = getTranslations(lang, 'home')

  const [isAuth, setIsAuth] = useState(false)

  // Читаем переменную окружения
  const orgEnv = process.env.NEXT_PUBLIC_ORG

  useEffect(() => {
    let isMounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) setIsAuth(!!data.session)
    })
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (isMounted) setIsAuth(!!session)
      }
    )
    return () => {
      isMounted = false
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  return (
    <main className="p-8">
      {/* Заголовок */}
      <h1 className="text-2xl uppercase font-bold mb-4 text-center">
        {t.home.description}
      </h1>

      {/* Отображение логотипа в зависимости от NEXT_PUBLIC_ORG */}
      {
        {
          '1': <NovisLogo className="mx-auto w-fit lg:max-w-1/2 md:max-w-2/3 my-20" />,
          '4': <TampaLogo className="mx-auto w-fit lg:max-w-1/2 md:max-w-2/3 my-20" />
        }[orgEnv] || <ScnLogo className="mx-auto w-64 mb-6" />
      }

      {/* Форма авторизации */}
      <Auth lang={lang} />

      {/* Кнопка перехода к курсам для авторизованных */}
      {isAuth && (
        <div className="flex justify-center">
          <Link
            href={`/${lang}/courses`}
            className="btn btn-lg btn-primary"
          >
            {t.common.go_to_courses}
          </Link>
        </div>
      )}
    </main>
  )
}