'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getTranslations } from '@/lib/i18n'
import coursesList from '@/data/courses_ru.json'
import dynamic from 'next/dynamic'
import { MagnifyingGlassIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

const CheckCourse = dynamic(() => import('@/components/displays/CheckCourse'), { ssr: false })

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

export default function StudentsTable({ lang = 'ru' }) {
  const { t } = getTranslations(lang, 'common')

  const [students, setStudents] = useState([])
  const [coursesMap, setCoursesMap] = useState({})
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [search, setSearch] = useState('')
  const [lastSearch, setLastSearch] = useState('')
  const [selected, setSelected] = useState([])
  const [allSelected, setAllSelected] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [isChecking, setIsChecking] = useState(false)

  const isFirstLoad = useRef(true)

  useEffect(() => {
    setCoursesMap(getCoursesMapFromFile(lang))
  }, [lang])

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false
      fetchStudents('')
      return
    }
    fetchStudents(lastSearch)
  }, [page, lastSearch, lang])

  async function fetchStudents(appliedSearch = '') {
    setLoading(true)
    setErrorText('')

    let query = supabase.from('students_with_lesson_counts').select('*', { count: 'exact' })

    if (appliedSearch.length >= 3) {
      query = query.or(
        `full_name.ilike.%${appliedSearch}%,email.ilike.%${appliedSearch}%,phone.ilike.%${appliedSearch}%`
      )
    }

    const PAGE_SIZE = 12
    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data, count, error } = await query.range(from, to).order('created_at', { ascending: false })

    setLoading(false)

    if (error) {
      console.error('[ERROR] fetchStudents:', error)
      setStudents([])
      setTotal(0)
      setErrorText(error.message || t.common.noData)
    } else {
      setStudents(data || [])
      setTotal(count || 0)
      setSelected([])
      setAllSelected(false)
      setShowActions(false)
    }
  }

  function getUserCourseTitle(courseId) {
    if (!courseId) return t.common.noCourse
    const title = coursesMap[courseId.toString()]
    return title || courseId
  }

  function handleSearch(e) {
    const value = e.target.value
    setSearch(value)
    setPage(1)
    if (value.length === 0) {
      setLastSearch('')
    } else if (value.length >= 3) {
      setLastSearch(value)
    }
  }

  function handleSelect(id) {
    let next
    if (selected.includes(id)) {
      next = selected.filter(uid => uid !== id)
    } else {
      next = [...selected, id]
    }
    setSelected(next)
    setShowActions(next.length > 0)
    setAllSelected(next.length === students.length && students.length > 0)
  }

  function handleSelectAll() {
    if (allSelected) {
      setSelected([])
      setAllSelected(false)
      setShowActions(false)
    } else {
      const ids = students.map(u => u.id)
      setSelected(ids)
      setAllSelected(true)
      setShowActions(ids.length > 0)
    }
  }

  async function handleAction(action) {
    if (action === 'delete') {
      await supabase.from('profiles').delete().in('id', selected)
      fetchStudents(lastSearch)
    }
    if (action === 'checkCourse') {
      setIsChecking(true)
    }
  }

  const PAGE_SIZE = 12
  const totalPages = Math.ceil(total / PAGE_SIZE)

  if (isChecking && selected.length === 1) {
    return (
      <div className="relative pt-2">
        <button
          className="btn btn-sm btn-error absolute right-0 top-0 z-10"
          onClick={() => setIsChecking(false)}
        >
          {t.common?.backToList || 'Назад'}
        </button>
        <CheckCourse studentId={selected[0]} lang={lang} onClose={() => setIsChecking(false)} />
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap gap-4 items-center mb-6">
        <label className="input input-bordered flex items-center gap-2">
          <MagnifyingGlassIcon className="h-5 w-5 opacity-60" />
          <input
            type="search"
            className="grow"
            placeholder={t.common.search}
            value={search}
            onChange={handleSearch}
            minLength={0}
          />
        </label>

        {showActions && (
          <details className="dropdown">
            <summary className="btn btn-secondary">{t.common.actionsWithSelected}<ChevronDownIcon className="w-5 ml-1" /></summary>
            <ul className="menu dropdown-content bg-base-200 rounded-lg z-1 w-full p-2 shadow-sm mt-px ring-1 ring-secondary/30">
              <li>
                <button onClick={() => handleAction('delete')} className="text-error">
                  {t.common.deleteSelected}
                </button>
              </li>
              {selected.length === 1 && (
                <li>
                  <button onClick={() => handleAction('checkCourse')}>
                    {t.common.checkCourse || 'Проверить курс'}
                  </button>
                </li>
              )}
            </ul>
          </details>
        )}
      </div>

      {errorText && (
        <div className="alert alert-error mb-2">
          {errorText}
        </div>
      )}

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
                  <span className="loading loading-spinner loading-md">{t.common.loading}</span>
                </td>
              </tr>
            )}
            {!loading && students.length === 0 && (
              <tr>
                <td colSpan={5}>{t.common.noData}</td>
              </tr>
            )}
            {!loading && students.map(student => (
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
                <td>{getUserCourseTitle(student.course_id)}</td>
                <td>
                  {student.lessons_to_check > 0
                    ? student.lessons_to_check
                    : t.common.noTasks || 'Нет'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
