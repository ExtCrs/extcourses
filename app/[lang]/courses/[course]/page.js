'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import coursesCats from '@/data/courses_categories.json'
import { getTranslations } from '@/lib/i18n'
import { loadCoursesData } from '@/lib/utils/courseDataLoader'
import Breadcrumbs from '@/components/navs/Breadcrumbs'
import SignUpModal from '@/components/modals/SignUpModal'

export default function CoursePage({ params }) {
  // Современный способ получения params (Promise -> React.use)
  const resolvedParams = React.use(params)
  const { lang, course: courseUrl } = resolvedParams
  const { t } = getTranslations(lang, 'courses')

  // Состояния для модального окна и курса
  const [modalOpen, setModalOpen] = useState(false)
  const [modalCourse, setModalCourse] = useState({ id: null, title: '' })
  const [coursesData, setCoursesData] = useState([])
  const [loading, setLoading] = useState(true)

  // Load course data based on language
  useEffect(() => {
    const loadData = async () => {
      const courses = await loadCoursesData(lang)
      setCoursesData(courses)
      setLoading(false)
    }
    loadData()
  }, [lang])

  // Находим курс по его url
  const course = coursesData.find(c => c.url === courseUrl)

  // Выбор заголовка по языку, запасной вариант — title
  const title = course?.title || t.courses.course_not_found
  const intro = course?.intro || t.courses.course_not_found
  const description = course?.description || t.courses.course_not_found

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <span className="loading loading-infinity loading-lg" />
      </div>
    )
  }

  if (!course) {
    // 404 если курс не найден
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">{t.courses.course_not_found}</h1>
      </div>
    )
  }

  // Локализованный заголовок курса
  const getCourseTitle = (course) => {
    return course.title
  }
  // Локализованный intro курса
  const getCourseIntro = (course) => {
    return course.intro
  }
  // Картинка курса
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

  return (
    <div className="drawer lg:drawer-open mt-1 xl:rounded-lg overflow-hidden">
      <input id="coursesListDrawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content p-6">
        {/* Page content here */}
        <label htmlFor="coursesListDrawer" className="btn btn-link drawer-button -ml-4 lg:hidden">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block h-6 w-6 stroke-current"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path> </svg>
        </label>
        <Breadcrumbs />
        <article className="prose">
          <h1 className="text-3xl font-bold mb-6">{title}</h1>
          <section
            dangerouslySetInnerHTML={{
              __html: intro
            }}
            className="border-l-2 border-secondary/50 pl-4 xl:pl-6 mb-2 italic"
          />
          <section
            dangerouslySetInnerHTML={{
              __html: description
            }}
          />
          <div className="border-t border-secondary/30 mt-6 pt-6">
            <button
              onClick={() => handleSignUp(course)}
              className='btn btn-secondary'
              >
              {t.courses.signup}
            </button>
          </div>
        </article>
      </div>
      <div className="drawer-side h-fit">
        <label htmlFor="coursesListDrawer" aria-label="close sidebar" className="drawer-overlay"></label>
        <ul className="list w-80 bg-base-200">
          <li className="p-4 pb-2 opacity-60 tracking-wide font-black uppercase">{t.common.ext_courses}</li>
          {
            coursesData?.map(course => {
              return (
                <li className={`list-row items-center${course.url === courseUrl ? " bg-secondary/10 text-base-content rounded-none border-l border-secondary": ""}`} key={course.id}>
                  <div>
                    <img
                      src={getCourseImg(course)}
                      alt={getCourseTitle(course)}
                      className="size-10 rounded-box"
                    />
                  </div>
                  <div>
                    <div className="uppercase text-[10px] font-bold">{coursesCats?.find(cat => cat.id === course.category_id)[`title_${lang}`]}</div>
                    <div className="text-[11px] uppercase font-semibold opacity-60"
                      dangerouslySetInnerHTML={{
                        __html: getCourseTitle(course)
                      }}
                    />
                  </div>
                  <Link
                    className="btn btn-square btn-ghost text-secondary"
                    href={`/${lang}/courses/${course.url}`}
                    prefetch={false}
                  >
                    <svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor"><path d="M6 3L20 12 6 21 6 3z"></path></g></svg>
                  </Link>
                </li>
              )
            })
          }
        </ul>
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