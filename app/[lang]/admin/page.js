'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import UsersTable from '@/components/displays/UsersTable'
import CoursesTable from '@/components/displays/CoursesTable'
import { getTranslations } from '@/lib/i18n'
import { AcademicCapIcon, PlayIcon } from '@heroicons/react/24/outline'

export default function AdminPage({ params }) {
  // В App Router params всегда нужно обрабатывать так!
  const { lang } = use(params);
  // Тексты для текущего языка
  const { t } = getTranslations(lang, 'common')

  // Ключ для localStorage (делай уникальным для каждого таб-группы)
  const STORAGE_KEY = 'admin_active_tab'

  // Активный таб: 0 — пользователи, 1 — курсы
  const [activeTab, setActiveTab] = useState(0)

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

  return (
    <div>
      {/* Табы DaisyUI с ручным управлением состоянием */}
      <div className="tabs tabs-lift">
        <button
          className={`tab${activeTab === 0 ? ' tab-active' : ''}`}
          onClick={() => setActiveTab(0)}
          type="button"
        >
          <AcademicCapIcon className="size-5 me-2" />
          {t.courses.students_list}
        </button>
        <button
          className={`tab${activeTab === 1 ? ' tab-active' : ''}`}
          onClick={() => setActiveTab(1)}
          type="button"
        >
          <PlayIcon className="size-5 me-2" />
          {t.courses.courses_list}
        </button>
      </div>

      {/* Контент выбранного таба */}
      <div className="bg-base-100 border-base-300 p-6">
        {activeTab === 0 && <UsersTable lang={lang} />}
        {activeTab === 1 && <CoursesTable lang={lang} />}
      </div>
    </div>
  )
}