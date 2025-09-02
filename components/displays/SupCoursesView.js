'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getTranslations } from '@/lib/i18n'
import coursesList from '@/data/courses_ru.json'
import dynamic from 'next/dynamic'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

// Динамический импорт экрана проверки курса
const CheckCourse = dynamic(() => import('@/components/displays/CheckCourse'), { ssr: false })

/**
 * Формирует карту id курса → локализованное название из локального файла
 */
function getCoursesMapFromFile(lang) {
  const map = {}
  coursesList.forEach(course => {
    if (!course.id) return
    const courseId = course.id.toString().trim()
    let title = lang === 'en'
      ? (course.title?.trim() || courseId)
      : (course.title?.trim() || courseId)
    map[courseId] = title
  })
  return map
}

/**
 * Возвращает общее количество уроков по id курса (для прогресса)
 */
function getTotalLessons(courseId) {
  const course = coursesList.find(c => c.id?.toString() === courseId?.toString())
  return course?.total_lessons || 1
}

export default function SupCoursesView({ lang = 'ru', orgId }) {
  const { t } = getTranslations(lang, 'common')

  // ---- Состояния ----
  const [students, setStudents] = useState([])
  const [coursesMap, setCoursesMap] = useState({})
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [search, setSearch] = useState('')
  const [lastSearch, setLastSearch] = useState('')
  const [selected, setSelected] = useState([])          // Выбранные профили (id)
  const [allSelected, setAllSelected] = useState(false) // Флажок «выбрать всех» в текущей странице
  const [isChecking, setIsChecking] = useState(false)   // Переход в режим проверки
  const PAGE_SIZE = 12

  const isFirstLoad = useRef(true)

  // Карту названий курсов под язык
  useEffect(() => {
    setCoursesMap(getCoursesMapFromFile(lang))
  }, [lang])

  // Загрузка списка студентов
  useEffect(() => {
    if (!orgId) return
    if (isFirstLoad.current) {
      isFirstLoad.current = false
      fetchStudents('')
      return
    }
    fetchStudents(lastSearch)
  }, [page, lastSearch, lang, orgId])

  /**
   * Загрузка студентов из представления students_with_lesson_counts
   * - фильтр по организации
   * - поиск по ФИО/почте/телефону (если введено ≥ 3 символов)
   * - пагинация
   */
  async function fetchStudents(appliedSearch = '') {
    setLoading(true)
    setErrorText('')

    let query = supabase.from('students_with_lesson_counts').select('*', { count: 'exact' })
    query = query.eq('current_org_id', orgId)

    if (appliedSearch.length >= 3) {
      query = query.or(
        `full_name.ilike.%${appliedSearch}%,email.ilike.%${appliedSearch}%,phone.ilike.%${appliedSearch}%`
      )
    }

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data, count, error } = await query
      .range(from, to)
      .order('created_at', { ascending: false })

    setLoading(false)

    if (error) {
      console.error('[ERROR] fetchStudents:', error)
      setStudents([])
      setTotal(0)
      setErrorText(error.message || t.common.noData)
    } else {
      setStudents(data || [])
      setTotal(count || 0)
      // Сброс выделения при обновлении списка
      setSelected([])
      setAllSelected(false)
    }
  }

  /**
   * Получить локализованное название курса по его id
   */
  function getUserCourseTitle(courseId) {
    if (!courseId) return t.common.noCourse
    const title = coursesMap[courseId.toString()]
    return title || courseId
  }

  /**
   * Обработчик строки поиска:
   * - начинаем искать с 3 символов
   * - при очистке — сбрасываем фильтр
   */
  function handleSearch(e) {
    const value = e.target.value
    setSearch(value)
    setPage(1)
    if (value.length === 0) setLastSearch('')
    else if (value.length >= 3) setLastSearch(value)
  }

  /**
   * Переключение выбора конкретного пользователя
   */
  function handleSelect(id) {
    let next
    if (selected.includes(id)) {
      next = selected.filter(uid => uid !== id)
    } else {
      next = [...selected, id]
    }
    setSelected(next)
    setAllSelected(next.length === students.length && students.length > 0)
  }

  /**
   * Выделить/снять выделение со всех строк текущей страницы
   * (Кнопка оставлена для удобства, но действие «Проверить курс»
   * всё равно доступно только при ровно одном выбранном студенте)
   */
  function handleSelectAll() {
    if (allSelected) {
      setSelected([])
      setAllSelected(false)
    } else {
      const ids = students.map(u => u.id)
      setSelected(ids)
      setAllSelected(true)
    }
  }

  /**
   * Переход в режим проверки курса
   * Доступен только при selected.length === 1
   */
  function handleCheckCourse() {
    if (selected.length === 1) {
      setIsChecking(true)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const canCheck = selected.length === 1 // Ровно один выбран — можно «Проверить курс»

  // Если orgId ещё не подгружен — показываем спиннер
  if (!orgId) {
    return <div className="loading loading-infinity" />
  }

  // Режим проверки курса одного студента
  if (isChecking && selected.length === 1) {
    return (
      <div className="relative pt-2">
        <button
          className="btn btn-sm btn-error absolute right-0 top-0 z-10"
          onClick={() => setIsChecking(false)}
        >
          {t.common?.backToList}
        </button>
        <CheckCourse studentId={selected[0]} lang={lang} onClose={() => setIsChecking(false)} />
      </div>
    )
  }

  return (
    <div>
      {/* Панель поиска и действий */}
      <div className="flex flex-wrap gap-4 items-center mb-6">
        {/* Поиск */}
        <label className="input input-bordered flex items-center gap-2">
          <MagnifyingGlassIcon className="h-5 w-5 opacity-60" />
          <input
            type="search"
            className="grow"
            placeholder={t.common.search}
            value={search}
            onChange={handleSearch}
          />
        </label>

        {/* Единственная кнопка действия — появляется ТОЛЬКО при выборе ровно одного студента */}
        {canCheck && (
          <button
            className="btn btn-primary"
            onClick={handleCheckCourse}
          >
            {t.common.checkCourse || 'Проверить курс'}
          </button>
        )}
      </div>

      {/* Ошибка загрузки */}
      {errorText && (
        <div className="alert alert-error mb-2">
          {errorText}
        </div>
      )}

      {/* Таблица со списком студентов */}
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                />
              </th>
              <th>{t.common.fullName}</th>
              <th>{t.common.contacts}</th>
              <th>{t.common.currentCourse}</th>
              <th>{t.courses.tasksToCheck}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5}>
                  <span className="loading loading-infinity loading-md">{t.common.loading}</span>
                </td>
              </tr>
            )}
            {!loading && students.length === 0 && (
              <tr>
                <td colSpan={5}>{t.common.noData}</td>
              </tr>
            )}
            {!loading && students.map(student => {
              const totalLessons = getTotalLessons(student.course_id)
              const acceptedLessons = student.accepted_lessons || 0

              return (
                <tr
                  key={student.id}
                  className={selected.includes(student.id) ? 'bg-base-200' : ''}
                  onClick={() => handleSelect(student.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={selected.includes(student.id)}
                      onChange={() => handleSelect(student.id)}
                      onClick={e => e.stopPropagation()}
                    />
                  </td>
                  <td>
                    <div className="font-bold">{student.full_name || '-'}</div>
                    <div className="text-sm opacity-50">{student.email}</div>
                  </td>
                  <td>
                    <div>{student.phone || '-'}</div>
                  </td>
                  <td>
                    <div>{getUserCourseTitle(student.course_id)}</div>
                    <progress className="progress w-full" value={acceptedLessons} max={totalLessons} />
                  </td>
                  <td>
                    {student.lessons_to_check > 0
                      ? student.lessons_to_check
                      : t.common.noTasks || 'Нет'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Пагинация */}
      {total > PAGE_SIZE && (
        <div className="join justify-center flex mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(i => i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1))
            .map((p, idx, arr) =>
              arr[idx - 1] && p - arr[idx - 1] > 1 ? (
                <button className="join-item btn btn-disabled" key={'dots' + p}>...</button>
              ) : (
                <button
                  key={p}
                  className={`join-item btn${page === p ? ' btn-primary' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              )
            )}
        </div>
      )}
    </div>
  )
}