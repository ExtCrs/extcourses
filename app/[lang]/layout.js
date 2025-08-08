'use client'

import "@/app/globals.css";
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import LanguageSwitcher from '@/components/switchers/LanguageSwitcher';
import ScnLogo from "@/components/graphics/ScnLogo";
import ThemeSwitcher from "@/components/switchers/ThemeSwitcher";
import AdminButton from "@/components/auth/AdminButton";
import SupButton from "@/components/auth/SupButton";
import { supabase } from '@/lib/supabase/client'
import { getTranslations } from '@/lib/i18n';
import CoursesButton from "@/components/navs/CoursesButton";
import NovisLogo from "@/components/graphics/NovisLogo";

const Logout = dynamic(() => import('@/components/auth/Logout'), { ssr: false })

export default function LangLayout({ children, params }) {
  const resolvedParams = React.use(params)
  const lang = resolvedParams.lang

  const { t, seo } = getTranslations(lang, 'home');
  const og = seo.og;

  const [orgName, setOrgName] = useState('');
  const [isAuth, setIsAuth] = useState(false)

    // Читаем переменную окружения
  const orgEnv = process.env.NEXT_PUBLIC_ORG

  useEffect(() => {
      // Проверяем авторизацию пользователя
      const checkAuth = async () => {
          const { data: { user } } = await supabase.auth.getUser()
          setIsAuth(!!user)
      }
      checkAuth()

      // Следим за изменением авторизации
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
          setIsAuth(!!session?.user)
      })

      return () => {
          listener?.subscription?.unsubscribe?.()
      }
  }, [])

  useEffect(() => {
    // Устанавливаем тему оформления
    const savedTheme = localStorage.getItem('theme')
    const theme = savedTheme === 'night' ? 'night' : 'silk'
    document.documentElement.setAttribute('data-theme', theme)

    // Получаем организацию пользователя
    const fetchOrg = async () => {
      // Получаем текущего пользователя
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setOrgName('');
        return;
      }

      // Получаем профиль пользователя
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('current_org_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.current_org_id) {
        setOrgName('');
        return;
      }

      // Получаем данные организации
      const orgNameField = lang === 'ru' ? 'name_ru' : 'name_en';
      const { data: org, error: orgError } = await supabase
        .from('orgs')
        .select(orgNameField)
        .eq('id', profile.current_org_id)
        .single();

      if (orgError || !org?.[orgNameField]) {
        setOrgName('');
        return;
      }

      setOrgName(org[orgNameField]);
    };

    fetchOrg();
  }, [lang]);

  return (
    <html lang={lang}>
      <head>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <meta property="og:title" content={og.title} />
        <meta property="og:description" content={og.description} />
        <meta property="og:image" content={og.image} />
        <meta property="og:url" content={og.url} />
        <meta property="og:type" content="website" />
      </head>
      <body className="max-w-7xl mx-auto min-h-screen flex flex-col">
          <nav className="navbar rounded-b-md shadow bg-secondary/10">
            <div className="flex-1">
              {/* Показываем меню только если пользователь авторизован */}
              {isAuth && (
                <div className="dropdown">
                  <div tabIndex="0" role="button" className="btn btn-link btn-circle">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" /></svg>
                  </div>
                    <ul
                      tabIndex="0"
                      className="menu menu-sm dropdown-content bg-base-100 rounded-lg z-10 mt-3 w-52 p-2 shadow ring-1 ring-secondary/30">
                      <CoursesButton lang={lang} />
                      <AdminButton lang={lang} />
                      <SupButton lang={lang} />
                      <Logout lang={lang} />
                    </ul>
                </div>
              )}
              <Link
                href={`/${lang}`}
                prefetch={false}
                className="btn btn-link uppercase text-secondary no-underline hover:!no-underline"
              >
                {
                  orgEnv === '1'
                  ? <NovisLogo className="mx-auto w-28 mt-1 mr-2" monochrome />
                  : <ScnLogo className="mx-auto w-12 mr-2" monochrome />
                }
                <span className="hidden sm:block">{t.common.ext_courses}</span>
              </Link>
              {/* Бейдж организации */}
              {orgName && (
                <div className="badge badge-ghost badge-sm sm:ml-2">{orgName}</div>
              )}
            </div>
            <div className="flex-none">
              <ul className="menu menu-sm menu-horizontal px-1 flex justify-center">
                <ThemeSwitcher />
                <LanguageSwitcher currentLang={lang} />
              </ul>
            </div>
          </nav>
        <main className="grow">
          {children}
        </main>
        <footer className="footer sm:footer-horizontal footer-center bg-base-300 text-base-content p-4 lg:rounded-t-xl">
          <aside>
            <p>Copyright © {new Date().getFullYear()} - All right reserved</p>
          </aside>
        </footer>
      </body>
    </html>
  )
}