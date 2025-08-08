'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import { supabase } from '@/lib/supabase/client'
// import StudentsTable from '@/components/displays/StudentsTable'
import SupCoursesView from '@/components/displays/SupCoursesView'
import LessonsToCheck from '@/components/displays/LessonsToCheck'

import { getTranslations } from '@/lib/i18n'
import { loadOrgId } from '@/components/displays/current_course/utils'
import { CheckIcon, QueueListIcon, UsersIcon } from '@heroicons/react/24/outline'
import CoursesTable from '@/components/displays/CoursesTable'

export default function SupPage({ params }) {
  // В App Router params всегда нужно обрабатывать так!
  const { lang } = use(params);
  // Тексты для текущего языка
  const { t } = getTranslations(lang, 'common')

  // Ключ для localStorage (делай уникальным для каждого таб-группы)
  const STORAGE_KEY = 'sup_active_tab'
  // Активный таб: 0 — пользователи, 1 — курсы
  const [activeTab, setActiveTab] = useState(0)
  const [orgId, setOrgId] = useState(null)

  // При первом рендере читаем localStorage (восстанавливаем активный таб)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) {
        setActiveTab(Number(stored))
      }
    } catch (e) {
      // localStorage может быть недоступен (например, на SSR), но тут ошибки можно игнорировать
    }
  }, [])

  // При каждом изменении активного таба — сохраняем в localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(activeTab))
    } catch (e) { /* ignore */ }
  }, [activeTab])


  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      const userId = data?.user?.id
      if (!userId) {
        console.warn('[WARN] userId not found')
        return
      }
      loadOrgId(userId).then((id) => {
        setOrgId(id)
      })
    })
  }, [])

  return (
    <>
      {/* Табы DaisyUI с ручным управлением состоянием */}
      <div className="tabs tabs-lift">
        <button
          className={`tab${activeTab === 0 ? ' tab-active' : ''}`}
          onClick={() => setActiveTab(0)}
          type="button"
        >
          <CheckIcon className="size-5 me-2" />
          {t.courses.tasksToCheck}
        </button>
        {/* <button
          className={`tab${activeTab === 1 ? ' tab-active' : ''}`}
          onClick={() => setActiveTab(1)}
          type="button"
        >
          <AcademicCapIcon className="size-5 me-2" />
          {t.courses.students_list}
        </button> */}
        <button
          className={`tab${activeTab === 2 ? ' tab-active' : ''}`}
          onClick={() => setActiveTab(2)}
          type="button"
        >
          <QueueListIcon className="size-5 me-2" />
          {t.courses.students_progress}
        </button>
        <button
          className={`tab${activeTab === 3 ? ' tab-active' : ''}`}
          onClick={() => setActiveTab(3)}
          type="button"
        >
          <UsersIcon className="size-5 me-2" />
          {t.courses.students_states}
        </button>
      </div>

      {/* Контент выбранного таба */}
      <div className="bg-base-100 border-base-300 py-6">
        {activeTab === 0 && <LessonsToCheck lang={lang} t={t} />}
        {/* {activeTab === 1 && <StudentsTable lang={lang} />} */}
        {activeTab === 2 && <SupCoursesView lang={lang} orgId={orgId} />}
        {activeTab === 3 && <CoursesTable lang={lang} orgId={orgId} />}
      </div>
    </>
  )
}