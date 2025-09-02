'use client'

import { useState, useEffect } from 'react'
import { Bars3Icon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase/client'
import coursesList from '@/data/courses_ru.json'
import CurrentCourse from '@/components/displays/current_course/CurrentCourse'
import LessonMenu from '@/components/displays/current_course/LessonMenu'
import { loadLessonsMap, getBadge } from '@/components/displays/current_course/utils'

/**
 * Читаем orgId из переменной окружения на клиенте.
 * В Next.js доступны только переменные с префиксом NEXT_PUBLIC_*
 * Приводим к числу, если не удалось — оставляем undefined (значит фильтр не применяется).
 */
const ENV_ORG_ID = (() => {
  const raw = process.env.NEXT_PUBLIC_ORG
  const num = Number(raw)
  return Number.isFinite(num) ? num : undefined
})()

/**
 * Локальная карта id курса → локализованное название из файла.
 */
function getCoursesMap(lang) {
  const map = {}
  coursesList.forEach(course => {
    if (!course?.id) return
    const courseId = course.id.toString().trim()
    const title =
      lang === 'en'
        ? (course.title?.toString().trim?.() || courseId)
        : (course.title?.toString().trim?.() || courseId)
    map[courseId] = title
  })
  return map
}

export default function LessonsToCheck({ t, lang }) {
  const [coursesToCheck, setCoursesToCheck] = useState([])
  const [selected, setSelected] = useState(null)
  const [coursesMap, setCoursesMap] = useState({})
  const [activeLesson, setActiveLesson] = useState(undefined)
  const [lessonsMap, setLessonsMap] = useState({})

  /**
   * Вынесенный загрузчик курсов.
   * Если задан ENV_ORG_ID — добавляем .eq('current_org_id', ENV_ORG_ID)
   * Иначе — оставляем общий список (как раньше).
   */
  const fetchCourses = async () => {
    try {
      let query = supabase
        .from('students_with_lesson_counts')
        .select('*')
        .gt('lessons_to_check', 0)

      // ВАЖНО: жёсткая фильтрация по организации из переменной окружения
      if (ENV_ORG_ID !== undefined) {
        query = query.eq('current_org_id', ENV_ORG_ID)
      }

      const { data, error } = await query

      if (error) {
        console.error('[Ошибка загрузки]:', error)
        setCoursesToCheck([])
        return
      }

      setCoursesToCheck(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('[Исключение при загрузке]:', e)
      setCoursesToCheck([])
    }
  }

  // Первичная загрузка
  useEffect(() => {
    fetchCourses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Карта id → имя курса из локальных данных
  useEffect(() => {
    setCoursesMap(getCoursesMap(lang))
  }, [lang])

  // Подгружаем статусы уроков выбранного студента/курса для бейджей LessonMenu
  useEffect(() => {
    if (!selected?.course_ref_id || !selected?.id) return
    loadLessonsMap(selected.course_ref_id, selected.id).then(setLessonsMap)
  }, [selected])

  // Выбор записи слева
  const handleSelect = (courseData) => {
    setSelected(courseData)
  }

  /**
   * Обработчик завершения проверки (коллбек из CurrentCourse).
   * Перезагружаем список слева и карту уроков для текущего выбранного.
   */
  const handleClose = () => {
    fetchCourses()
    if (selected?.course_ref_id && selected?.id) {
      loadLessonsMap(selected.course_ref_id, selected.id).then(setLessonsMap)
    }
  }

  // Находим метаданные курса (total_lessons и т.п.) из локального файла
  const selectedCourseInfo = selected
    ? coursesList.find(c => Number(c.id) === Number(selected.course_id))
    : null

  return (
    <div className="drawer lg:drawer-open">
      <input id="lessonsToCheckDrawer" type="checkbox" className="drawer-toggle" />

      {/* Контент справа */}
      <div className="drawer-content px-4">
        {/* Кнопка открытия боковой панели на мобилках */}
        <label htmlFor="lessonsToCheckDrawer" className="btn btn-ghost drawer-button lg:hidden">
          <Bars3Icon className="w-7" />
        </label>

        {/* Заголовок на мобилках */}
        <div className="lg:hidden block">
          <h1 className="border-b border-secondary/30 text-2xl font-bold py-4 uppercase">
            {t.courses.courses_list}
          </h1>
        </div>

        {/* Меню уроков (только на lg+ когда выбран курс) */}
        {selected && selectedCourseInfo && (
          <div className="lg:block hidden mb-4">
            <LessonMenu
              totalLessons={Number(selectedCourseInfo.total_lessons) || 1}
              activeLesson={activeLesson}
              setActiveLesson={setActiveLesson}
              getBadge={(num) => getBadge(num, lessonsMap)}
            />
          </div>
        )}

        {/* Правая часть: либо текущий курс, либо плейсхолдер */}
        {selected ? (
          <CurrentCourse
            lang={lang}
            currentCourse={{
              id: selected.course_ref_id,
              course_id: selected.course_id,
              student_id: selected.id,
              org_id: selected.current_org_id,
            }}
            courseInfo={selectedCourseInfo}
            user={{ role: 'supervisor', full_name: 'Супервайзер' }}
            isSup={true}
            activeLesson={activeLesson}
            setActiveLesson={setActiveLesson}
            onReviewComplete={handleClose}
          />
        ) : (
          <div className="text-center text-sm py-8 text-gray-500">
            {t.courses.select_course_to_check || 'Выберите курс для проверки'}
          </div>
        )}
      </div>

      {/* Левая боковая панель со списком студентов/курсов на проверку */}
      <div className="drawer-side">
        <label htmlFor="lessonsToCheckDrawer" aria-label="close sidebar" className="drawer-overlay" />
        <div className="menu bg-base-200 lg:rounded-2xl text-base-content min-h-full w-80 py-4">
          <h1 className="text-center border-b border-secondary/20 text-xl font-bold py-4 text-secondary uppercase">
            {t.courses.courses_list}
          </h1>

          {/* Пустое состояние */}
          {coursesToCheck.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              {t.courses.no_courses_to_check || 'Нет курсов на проверку'}
              {/* Для удобства отладки можно временно вывести активный фильтр */}
              {/* <div className="mt-2 opacity-60 text-xs">org filter: {ENV_ORG_ID ?? 'none'}</div> */}
            </div>
          ) : (
            <ul className="menu w-full">
              {coursesToCheck.map((course) => (
                <li key={`${course.id}-${course.course_id}`}>
                  <button
                    className={`w-full justify-between text-left px-4 py-3 hover:bg-base-300 ${
                      selected?.id === course.id && selected?.course_id === course.course_id
                        ? 'menu-active'
                        : ''
                    }`}
                    onClick={() => handleSelect(course)}
                  >
                    <div className="font-bold">
                      {/* Имя курса из локальной карты; если не нашли — показываем id */}
                      {coursesMap[course.course_id?.toString()] || course.course_id}
                      <div className="text-sm font-normal italic">{course.full_name}</div>
                    </div>
                    <div
                      className="tooltip tooltip-left"
                      data-tip={t.courses.tasks_to_check || 'Заданий на проверку'}
                    >
                      <span className="badge badge-xs badge-warning">
                        {course.lessons_to_check}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}