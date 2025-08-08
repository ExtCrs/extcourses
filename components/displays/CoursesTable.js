'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { MagnifyingGlassIcon, ChevronDownIcon, TrashIcon } from '@heroicons/react/24/outline'
import { getTranslations } from '@/lib/i18n'
import coursesList from '@/data/courses.json'

/**
 * Возможные состояния курса (фильтры)
 */
const COURSE_STATES = [
  'all',
  'SignUp',
  'PaidConfirm',
  'Started',
  'Bugged',
  'AccountedFor',
  'Completed',
  'ResignNeeded',
  'AllCoursesDone'
]
const COURSE_STATUS_ACTIONS = COURSE_STATES.slice(1)

/**
 * Читаем локальные названия курсов из файла (без запросов в БД)
 */
function getCoursesMapFromFile (lang) {
  const map = {}
  coursesList.forEach(course => {
    if (!course.id) return
    const courseId = course.id.toString().trim()
    const title = lang === 'en'
      ? (course.title_en?.trim?.() || course.title_ru?.trim?.() || courseId)
      : (course.title_ru?.trim?.() || course.title_en?.trim?.() || courseId)
    map[courseId] = title
  })
  return map
}

/**
 * Карта организаций { id: { id, name_ru, name_en } }
 */
async function getOrgMap () {
  const { data } = await supabase.from('orgs').select('id, name_ru, name_en')
  const map = {}
  ;(data || []).forEach(org => { map[org.id] = org })
  return map
}

export default function CoursesTable ({ lang = 'ru', orgId = undefined }) {
  const { t } = getTranslations(lang, 'common')

  // --- Данные и их вспомогательные состояния
  const [courses, setCourses] = useState([])
  const [orgs, setOrgs] = useState({})
  const [coursesMap, setCoursesMap] = useState({})

  // --- Пагинация и итоги
  const PAGE_SIZE = 12
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  // --- UI/загрузка/ошибки
  const [loading, setLoading] = useState(false)
  const [errorText, setErrorText] = useState('')

  // --- Фильтры
  const [statusFilter, setStatusFilter] = useState('all')
  const [orgFilter, setOrgFilter] = useState('all')

  // --- Поиск: "search" — текущее в инпуте, "lastSearch" — применённое значение (после дебаунса/Enter)
  const [search, setSearch] = useState('')
  const [lastSearch, setLastSearch] = useState('')

  // --- Выбор строк
  const [selected, setSelected] = useState([])
  const [allSelected, setAllSelected] = useState(false)
  const [showActions, setShowActions] = useState(false)

  // --- Подтверждение удаления
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(false)

  // --- Служебное
  const isFirstLoad = useRef(true)
  const abortRef = useRef(null) // AbortController для отмены загрузки страницы

  /**
   * Инициализация локальных справочников
   */
  useEffect(() => {
    setCoursesMap(getCoursesMapFromFile(lang))
    getOrgMap().then(setOrgs)
  }, [lang])

  /**
   * Дебаунс поиска: применяем в lastSearch через 400мс
   * - Пустая строка -> применяем сразу (сброс)
   * - < 3 символов -> не применяем (lastSearch остаётся тем, что было)
   * - >= 3 символов -> применяем через таймер
   */
  useEffect(() => {
    // Сброс страницы при новом вводе/поиске
    setPage(1)

    // Если пользователь стёр поиск — применяем мгновенно
    if (search.length === 0) {
      setLastSearch('')
      return
    }

    // Если строка короткая (<3), не трогаем lastSearch (старый фильтр остаётся)
    if (search.length > 0 && search.length < 3) {
      return
    }

    // Дебаунс 400мс
    const timer = setTimeout(() => {
      setLastSearch(search)
    }, 400)

    return () => clearTimeout(timer)
  }, [search])

  /**
   * Загрузка страницы данных (без подсчёта total)
   * Вынесена в useCallback для стабильной ссылки
   */
  const fetchPage = useCallback(async (appliedSearch) => {
    // Отменяем предыдущий незавершённый запрос
    if (abortRef.current) {
      abortRef.current.abort()
    }
    const ac = new AbortController()
    abortRef.current = ac

    setLoading(true)
    setErrorText('')

    try {
      // 1) Если есть поиск — сначала получаем список id студентов
      let studentIds = []
      if (appliedSearch && appliedSearch.length >= 3) {
        const { data: profs, error: profErr } = await supabase
          .from('profiles')
          .select('id')
          .or([
            `full_name.ilike.%${appliedSearch}%`,
            `email.ilike.%${appliedSearch}%`,
            `phone.ilike.%${appliedSearch}%`
          ].join(','))

        if (profErr) throw profErr
        studentIds = (profs || []).map(x => x.id)
        // Если никого не нашли — сразу отрисуем пусто
        if (studentIds.length === 0) {
          setCourses([])
          setSelected([])
          setAllSelected(false)
          setShowActions(false)
          setLoading(false)
          return
        }
      }

      // 2) Основной запрос по courses
      let query = supabase
        .from('courses')
        .select(`
          id,
          course_id,
          org_id,
          student_id,
          state,
          created_at,
          updated_at,
          profiles:student_id!left (
            full_name,
            email,
            phone,
            current_org_id
          )
        `) // <--- без count, чтобы не делать «двойной» запрос на каждую страницу

      if (statusFilter !== 'all') {
        query = query.eq('state', statusFilter)
      }

      if (typeof orgId === 'number') {
        query = query.eq('org_id', orgId)
      } else if (orgFilter !== 'all') {
        query = query.eq('org_id', orgFilter)
      }

      if (studentIds.length > 0) {
        query = query.in('student_id', studentIds)
      }

      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data, error } = await query
        .range(from, to)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Успех
      setCourses(data || [])
      setSelected([])
      setAllSelected(false)
      setShowActions(false)
      setErrorText('')
    } catch (e) {
      if (e.name === 'AbortError') {
        // Запрос отменён — ничего не делаем
        return
      }
      setCourses([])
      setSelected([])
      setAllSelected(false)
      setShowActions(false)
      setErrorText(e?.message || t.common?.noData || 'Error')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, orgFilter, orgId, t])

  /**
   * Подсчёт total выносим отдельно и реже:
   * - считаем при изменении фильтров/поиска/языка/orgId
   * - используем быстрый подсчёт: head + count:'estimated'
   * Это сильно дешевле, чем 'exact' на каждый лист.
   */
  const fetchTotal = useCallback(async (appliedSearch) => {
    try {
      let studentIds = []
      if (appliedSearch && appliedSearch.length >= 3) {
        const { data: profs, error: profErr } = await supabase
          .from('profiles')
          .select('id')
          .or([
            `full_name.ilike.%${appliedSearch}%`,
            `email.ilike.%${appliedSearch}%`,
            `phone.ilike.%${appliedSearch}%`
          ].join(','))
        if (profErr) throw profErr
        studentIds = (profs || []).map(x => x.id)
        if (studentIds.length === 0) {
          setTotal(0)
          return
        }
      }

      let totalQuery = supabase
        .from('courses')
        // head:true — вернёт только заголовки, без данных
        // count:'estimated' — быстро, без тяжелых точных подсчётов
        .select('id', { count: 'estimated', head: true })

      if (statusFilter !== 'all') {
        totalQuery = totalQuery.eq('state', statusFilter)
      }

      if (typeof orgId === 'number') {
        totalQuery = totalQuery.eq('org_id', orgId)
      } else if (orgFilter !== 'all') {
        totalQuery = totalQuery.eq('org_id', orgFilter)
      }

      if (studentIds.length > 0) {
        totalQuery = totalQuery.in('student_id', studentIds)
      }

      const { count, error } = await totalQuery
      if (error) throw error
      setTotal(count || 0)
    } catch (e) {
      // При ошибке не роняем UI, просто покажем 0
      setTotal(0)
    }
  }, [statusFilter, orgFilter, orgId])

  /**
   * Первый рендер: загрузим данные и total
   */
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false
      fetchTotal('')
      fetchPage('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Перезагрузка данных при изменении страницы/фильтров/поиска/языка/orgId
   * - fetchPage вызывается чаще (включая переключение страниц)
   */
  useEffect(() => {
    fetchPage(lastSearch)
  }, [page, statusFilter, orgFilter, lastSearch, lang, orgId, fetchPage])

  /**
   * Пересчёт total только при изменении фильтров/поиска/языка/orgId (без page)
   */
  useEffect(() => {
    // при изменении условий выдачи сбрасываем страницу на 1
    setPage(1)
    fetchTotal(lastSearch)
  }, [statusFilter, orgFilter, lastSearch, lang, orgId, fetchTotal])

  /**
   * Обработчики UI
   */
  function handleStatusRadio (e) {
    setStatusFilter(e.target.value)
  }

  function handleOrgSelect (e) {
    setOrgFilter(e.target.value)
  }

  function handleSearchChange (e) {
    setSearch(e.target.value)
  }

  function handleSearchKeyDown (e) {
    // По Enter применяем мгновенно вне зависимости от длины
    if (e.key === 'Enter') {
      setLastSearch(e.currentTarget.value)
      // на всякий случай синхронизируем и setSearch (если у пользователя триггер из автозамены)
      setSearch(e.currentTarget.value)
    }
  }

  function handleSelect (id) {
    const next = selected.includes(id)
      ? selected.filter(cid => cid !== id)
      : [...selected, id]
    setSelected(next)
    setShowActions(next.length > 0)
    setAllSelected(next.length === courses.length && courses.length > 0)
  }

  function handleSelectAll () {
    if (allSelected) {
      setSelected([])
      setAllSelected(false)
      setShowActions(false)
    } else {
      const ids = courses.map(c => c.id)
      setSelected(ids)
      setAllSelected(ids.length > 0)
      setShowActions(ids.length > 0)
    }
  }

  function getOrgName (orgIdVal) {
    const org = orgs[orgIdVal]
    if (!org) return '-'
    return lang === 'en' ? (org.name_en || org.name_ru || '-') : (org.name_ru || org.name_en || '-')
  }

  function getCourseTitle (courseId) {
    return coursesMap[courseId] || courseId || '-'
  }

  function getProfileField (row, field) {
    return row?.profiles?.[field] || '-'
  }

  async function handleAction (action, newStatus = null) {
    if (action === 'delete') {
      setShowDeleteConfirm(true)
    } else if (action === 'changeStatus' && newStatus) {
      await supabase.from('courses').update({ state: newStatus }).in('id', selected)
      // после массового изменения — перегружаем текущую страницу и total
      fetchPage(lastSearch)
      fetchTotal(lastSearch)
    }
  }

  async function confirmDelete () {
    setPendingDelete(true)
    await supabase.from('courses').delete().in('id', selected)
    setShowDeleteConfirm(false)
    setPendingDelete(false)
    // после удаления — перегружаем текущую страницу и total
    fetchPage(lastSearch)
    fetchTotal(lastSearch)
  }

  function cancelDelete () {
    setShowDeleteConfirm(false)
    setPendingDelete(false)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function getDeleteConfirmText () {
    const count = selected.length
    let plural = ''
    if (lang === 'en') plural = count > 1 ? 's' : ''
    else plural = count > 1 ? 'ов' : ''
    return t.common.deleteConfirmText
      .replace('{count}', count)
      .replace('{plural}', plural)
  }

  return (
    <div>
      {/* Панель фильтров и действий */}
      <div className="flex flex-wrap gap-4 items-center mb-6">
        {/* Фильтр по статусу */}
        <div className="filter">
          {COURSE_STATES.map((st, i) => (
            <input
              key={st}
              className={`btn${i === 0 ? ' filter-reset' : ''}${statusFilter === st ? ' btn-primary' : ''}`}
              type="radio"
              name="courseState"
              aria-label={t.courseStates?.[st] || st}
              value={st}
              checked={statusFilter === st}
              onChange={handleStatusRadio}
            />
          ))}
        </div>

        {/* Фильтр по организации (если orgId не фиксирован пропсами) */}
        {typeof orgId !== 'number' && (
          <select
            className="select select-bordered"
            value={orgFilter}
            onChange={handleOrgSelect}
          >
            <option value="all">{lang === 'en' ? 'All organizations' : 'Все организации'}</option>
            {Object.values(orgs).map(org => (
              <option key={org.id} value={org.id}>
                {lang === 'en' ? (org.name_en || org.name_ru) : (org.name_ru || org.name_en)}
              </option>
            ))}
          </select>
        )}

        {/* Поиск с иконкой.
            - По Enter применяем немедленно
            - Дебаунс 400мс применит автоматически (для >=3 символов) */}
        <label className="input input-bordered flex items-center gap-2">
          <MagnifyingGlassIcon className="h-5 w-5 opacity-60" />
          <input
            type="search"
            className="grow"
            placeholder={t.common.search}
            value={search}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            minLength={0}
          />
        </label>

        {/* Действия над выбранными */}
        {showActions && (
          <details className="dropdown">
            <summary className="btn btn-secondary">
              {t.common.actionsWithSelected} <ChevronDownIcon className="w-5 ml-1" />
            </summary>
            <ul className="menu dropdown-content bg-base-200 rounded-lg z-1 w-full p-2 shadow-sm mt-px ring-1 ring-secondary/30">
              <li className="menu-title uppercase">{t.common.assign_state}</li>
              {COURSE_STATUS_ACTIONS.map(st => (
                <li key={st}>
                  <button onClick={() => handleAction('changeStatus', st)}>
                    {t.courseStates?.[st] || st}
                  </button>
                </li>
              ))}
              <li className="menu-divider"></li>
              <li>
                <button
                  onClick={() => handleAction('delete')}
                  className="text-error"
                >
                  <TrashIcon className="w-5 mr-1" />
                  {t.common.deleteSelected}
                </button>
              </li>
            </ul>
          </details>
        )}
      </div>

      {/* Таблица */}
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
              <th>{t.courses_list || t.courses?.courses_list || t.courses?.all}</th>
              <th>{t.common.fullName} & E-mail</th>
              <th>{t.common.contacts} / {t.common.organization}</th>
              <th>{t.common.status}</th>
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
            {!loading && courses.length === 0 && (
              <tr>
                <td colSpan={5}>{errorText || t.common.noData}</td>
              </tr>
            )}
            {!loading && courses.map(row => (
              <tr
                key={row.id}
                className={selected.includes(row.id) ? 'bg-base-200' : ''}
                onClick={() => handleSelect(row.id)}
                style={{ cursor: 'pointer' }}
              >
                <td>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={selected.includes(row.id)}
                    onChange={() => handleSelect(row.id)}
                    onClick={e => e.stopPropagation()}
                  />
                </td>
                <td>
                  <div>{getCourseTitle(row.course_id)}</div>
                </td>
                <td>
                  <div>{getProfileField(row, 'full_name')}</div>
                  <div className="text-sm opacity-50">{getProfileField(row, 'email')}</div>
                </td>
                <td>
                  <div>{getProfileField(row, 'phone')}</div>
                  <span className="badge badge-ghost badge-sm">
                    {getOrgName(row.org_id)}
                  </span>
                </td>
                <td>
                  <span className="badge badge-outline">{t.common.courseStates?.[row.state] || row.state}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Пагинация: без изменений в UI */}
      {total > PAGE_SIZE && (
        <div className="join justify-center flex mt-6">
          {Array.from({ length: Math.ceil(total / PAGE_SIZE) }, (_, i) => i + 1)
            .filter(i =>
              i === 1 ||
              i === Math.ceil(total / PAGE_SIZE) ||
              (i >= page - 1 && i <= page + 1)
            ).map((p, idx, arr) =>
              arr[idx - 1] && p - arr[idx - 1] > 1 ? (
                <button className="join-item btn btn-disabled" key={'dots' + p}>...</button>
              ) : (
                <button
                  key={p}
                  className={`join-item btn${page === p ? ' btn-primary' : ''}`}
                  onClick={() => setPage(p)}
                >{p}</button>
              )
            )}
        </div>
      )}

      {/* Модалка удаления */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
          <div className="bg-base-100 p-8 rounded-lg max-w-md w-full shadow-lg flex flex-col items-center">
            <h2 className="text-lg font-semibold mb-4">
              {t.common.deleteConfirmTitle}
            </h2>
            <p className="mb-6 text-center">
              {getDeleteConfirmText()}
            </p>
            <div className="flex gap-4">
              <button
                className="btn btn-error"
                disabled={pendingDelete}
                onClick={confirmDelete}
              >
                {pendingDelete
                  ? (lang === 'en' ? 'Deleting...' : 'Удаление...')
                  : t.common.delete}
              </button>
              <button
                className="btn"
                disabled={pendingDelete}
                onClick={cancelDelete}
              >
                {t.common.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}