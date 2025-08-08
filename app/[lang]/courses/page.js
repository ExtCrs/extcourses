'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { getTranslations } from '@/lib/i18n'
import categories from '@/data/courses_categories.json'
import coursesData from '@/data/courses.json'
import Breadcrumbs from '@/components/navs/Breadcrumbs'
import SignUpModal from '@/components/modals/SignUpModal'
import CourseStats from '@/components/displays/CourseStats'

export default function CoursesPage({ params }) {
  const resolvedParams = React.use(params)
  const lang = resolvedParams.lang

  const { t } = getTranslations(lang, 'courses')

  const [selectedCategory, setSelectedCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Состояния для модального окна и курса
  const [modalOpen, setModalOpen] = useState(false)
  const [modalCourse, setModalCourse] = useState({ id: null, title: '' })

  useEffect(() => {
    let isMounted = true
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session && isMounted) {
        router.replace(`/${lang}`)
      } else if (isMounted) {
        setLoading(false)
      }
    }
    checkAuth()
    return () => { isMounted = false }
  }, [lang, router])

  const getCategoryTitle = (cat) => (lang === 'ru' ? cat.title_ru : cat.title_en)

  const filteredCourses = selectedCategory === 'all'
    ? coursesData
    : coursesData.filter(course => course.category_id === selectedCategory)

  const getCourseTitle = (course) => {
    if (lang === 'en' && course.title_en) return course.title_en
    return course.title_ru
  }
  const getCourseIntro = (course) => {
    if (lang === 'en' && course.intro_en) return course.intro_en
    return course.intro_ru
  }
  const getCourseImg = (course) =>
    `/images/courses/ec-${course.id}.png`

  // Открытие модалки с нужным курсом
  const handleSignUp = (course) => {
    setModalCourse({
      id: course.id,
      title: getCourseTitle(course)
    })
    setModalOpen(true)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <span className="loading loading-infinity loading-lg" />
      </div>
    )
  }

  return (
    <div className="p-8">
      <Breadcrumbs />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-10">
        <div>
          <h1 className="text-2xl font-bold mb-4">{t.seo.courses.title}</h1>
          <p className="mb-4 text-gray-500">{t.seo.courses.description}</p>

          {/* Фильтр категорий */}
          <div className="filter flex gap-2 flex-wrap mb-6">
            <input
              className={`btn btn-sm filter-reset${selectedCategory === 'all' ? ' btn-active' : ''}`}
              type="radio"
              name="course_category"
              aria-label={t.courses.all}
              checked={selectedCategory === 'all'}
              onChange={() => setSelectedCategory('all')}
            />
            {categories.map(cat => cat.id !== 3 && (
              <input
                key={cat.id}
                className={`btn btn-sm${selectedCategory === cat.id ? ' btn-active' : ''}`}
                type="radio"
                name="course_category"
                aria-label={getCategoryTitle(cat)}
                checked={selectedCategory === cat.id}
                onChange={() => setSelectedCategory(cat.id)}
              />
            ))}
          </div>
        </div>
        <div>
          {/* name of each tab group should be unique */}
          <div className="tabs tabs-border justify-center">
            <input type="radio" name="courses_tabs" className="tab" aria-label={t.courses.current_course} defaultChecked />
            <div className="tab-content">
              <CourseStats lang={lang} />
            </div>

            <input type="radio" name="courses_tabs" className="tab" aria-label={t.courses.completed_courses} />
            <div className="tab-content">Список завершенных курсов</div>
          </div>
        </div>
      </div>

      {/* Текущая категория */}
      <div className="mt-4 mb-4 text-lg font-semibold border-b pb-2 border-secondary/30">
        {t.courses.selected_category}:{' '}
        {selectedCategory === 'all'
          ? t.courses.all
          : getCategoryTitle(categories.find(c => c.id === selectedCategory))}
      </div>

      {/* Сетка карточек: только 1 или 2 колонки */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 xl:gap-10 pt-2">
        {filteredCourses.map(course => (
          <div key={course.id} className="card sm:card-side bg-base-100 sm:border-l border-primary/50 flex sm:flex-row">
            <figure className="min-w-fit max-w-64">
              <img
                src={getCourseImg(course)}
                alt={getCourseTitle(course)}
                className="object-fit h-full w-full"
              />
            </figure>
            <div className="card-body p-4">
              <h2 className="card-title mb-2">{getCourseTitle(course)}</h2>
              <p
                className="mb-4 line-clamp-4"
                dangerouslySetInnerHTML={{
                  __html: getCourseIntro(course)
                }}
              />
              <div className="card-actions justify-end">
                <Link
                  className="btn btn-sm"
                  href={`/${lang}/courses/${course.url}`}
                  prefetch={false}
                >
                  {t.courses.view}
                </Link>
                <button
                  onClick={() => handleSignUp(course)}
                  className='btn btn-sm btn-outline btn-secondary'
                  >
                  {t.courses.signup}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Модальное окно */}
      <SignUpModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        courseId={modalCourse.id}
        courseTitle={modalCourse.title}
        lang={lang}
      />
    </div>
  )
}