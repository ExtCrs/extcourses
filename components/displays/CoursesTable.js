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
 * Приводим orgId к числу или null
 */
function normalizeOrgId (val) {
  const n = Number(val)
  return Number.isFinite(n) ? n : null
}

/**
 * Карта организаций { id: { id, name_ru, name_en } } — для свободного режима
 */
async function getOrgMap () {
  const { data } = await supabase.from('orgs').select('id, name_ru, name_en')
  const map = {}
  ;(data || []).forEach(org => { map[org.id] = org })
  return map
}

/**
 * Загрузка одной организации по id — для фиксированного режима
 */
async function getOneOrg (id) {
  const safeId = normalizeOrgId(id)
  if (safeId === null) return {}
  const { data } = await supabase
    .from('orgs')
    .select('id, name_ru, name_en')
    .eq('id', safeId)
    .maybeSingle()
  if (!data) return {}
  return { [data.id]: data }
}

export default function CoursesTable ({ lang = 'ru', orgId = undefined }) {
  const { t } = getTranslations(lang, 'common')

  // Строго используем словарь статусов из t.courses.courseStates
  const dictCourseStates = t?.courseStates || {}

  // Режимы
  const isFixedOrgProp = (typeof orgId !== 'undefined')              // сам факт, что проп передан
  const fixedOrgId = isFixedOrgProp ? normalizeOrgId(orgId) : null   // нормализованный orgId (число или null)
  const isWaitingForOrg = isFixedOrgProp && fixedOrgId === null      // ждём, пока родитель передаст валидный id

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

  // --- Поиск
  const [search, setSearch] = useState('')
  const [lastSearch, setLastSearch] = useState('')

  // --- Выбор строк
  const [selected, setSelected] = useState([])
  const [allSelected, setAllSelected] = useState(false)
  const [showActions, setShowActions] = useState(false)

  // --- Модалка удаления
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(false)

  // --- Служебное
  const isFirstLoad = useRef(true)
  const abortRef = useRef(null)

  /**
   * Инициализация локальных справочников
   * - Список курсов — из файла
   * - Организации:
   *   • свободный режим → загружаем все (для селекта и названий)
   *   • фиксированный режим → загружаем только одну по fixedOrgId (для отображения названия)
   */
  useEffect(() => {
    setCoursesMap(getCoursesMapFromFile(lang))

    if (!isFixedOrgProp) {
      getOrgMap().then(setOrgs)
    } else {
      // фиксированный режим
      if (!isWaitingForOrg) {
        getOneOrg(fixedOrgId).then(setOrgs)
      } else {
        setOrgs({})
      }
    }
  }, [lang, isFixedOrgProp, fixedOrgId, isWaitingForOrg])

  /**
   * Дебаунс поиска
   */
  useEffect(() => {
    setPage(1)
    if (search.length === 0) {
      setLastSearch('')
      return
    }
    if (search.length > 0 && search.length < 3) {
      return
    }
    const timer = setTimeout(() => setLastSearch(search), 400)
    return () => clearTimeout(timer)
  }, [search])

  /**
   * Загрузка страницы данных
   */
  const fetchPage = useCallback(async (appliedSearch) => {
    // В фиксированном режиме — не грузим, пока нет валидного числа
    if (isFixedOrgProp && isWaitingForOrg) return

    if (abortRef.current) abortRef.current.abort()
    const ac = new AbortController()
    abortRef.current = ac

    setLoading(true)
    setErrorText('')

    try {
      // Поиск по профилям → список studentIds
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
          setCourses([])
          setSelected([])
          setAllSelected(false)
          setShowActions(false)
          setLoading(false)
          return
        }
      }

      // Основной запрос по courses
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
        `)

      if (statusFilter !== 'all') query = query.eq('state', statusFilter)

      // Фильтр по организации
      if (isFixedOrgProp) {
        query = query.eq('org_id', fixedOrgId)
      } else if (orgFilter !== 'all') {
        query = query.eq('org_id', orgFilter)
      }

      if (studentIds.length > 0) query = query.in('student_id', studentIds)

      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data, error } = await query
        .range(from, to)
        .order('created_at', { ascending: false })

      if (error) throw error

      setCourses(data || [])
      setSelected([])
      setAllSelected(false)
      setShowActions(false)
      setErrorText('')
    } catch (e) {
      if (e.name === 'AbortError') return
      setCourses([])
      setSelected([])
      setAllSelected(false)
      setShowActions(false)
      setErrorText(e?.message || t.common?.noData || 'Error')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, orgFilter, fixedOrgId, isFixedOrgProp, isWaitingForOrg, t])

  /**
   * Подсчёт total
   */
  const fetchTotal = useCallback(async (appliedSearch) => {
    if (isFixedOrgProp && isWaitingForOrg) return

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
        .select('id', { count: 'estimated', head: true })

      if (statusFilter !== 'all') totalQuery = totalQuery.eq('state', statusFilter)

      if (isFixedOrgProp) {
        totalQuery = totalQuery.eq('org_id', fixedOrgId)
      } else if (orgFilter !== 'all') {
        totalQuery = totalQuery.eq('org_id', orgFilter)
      }

      if (studentIds.length > 0) totalQuery = totalQuery.in('student_id', studentIds)

      const { count, error } = await totalQuery
      if (error) throw error
      setTotal(count || 0)
    } catch {
      setTotal(0)
    }
  }, [statusFilter, orgFilter, fixedOrgId, isFixedOrgProp, isWaitingForOrg])

  /**
   * Первая загрузка
   * - свободный режим: сразу грузим
   * - фиксированный режим: ждём валидный fixedOrgId
   */
  useEffect(() => {
    if (!isFirstLoad.current) return

    if (isFixedOrgProp) {
      if (!isWaitingForOrg) {
        isFirstLoad.current = false
        fetchTotal('')
        fetchPage('')
      }
    } else {
      isFirstLoad.current = false
      fetchTotal('')
      fetchPage('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFixedOrgProp, isWaitingForOrg])

  /**
   * Перезагрузка данных при изменении условий
   */
  useEffect(() => {
    if (isFixedOrgProp && isWaitingForOrg) return
    fetchPage(lastSearch)
  }, [page, statusFilter, orgFilter, lastSearch, lang, fixedOrgId, isFixedOrgProp, isWaitingForOrg, fetchPage])

  /**
   * Пересчёт total при изменениях (без page)
   */
  useEffect(() => {
    if (isFixedOrgProp && isWaitingForOrg) return
    setPage(1)
    fetchTotal(lastSearch)
  }, [statusFilter, orgFilter, lastSearch, lang, fixedOrgId, isFixedOrgProp, isWaitingForOrg, fetchTotal])

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
    if (e.key === 'Enter') {
      setLastSearch(e.currentTarget.value)
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
      fetchPage(lastSearch)
      fetchTotal(lastSearch)
    }
  }

  async function confirmDelete () {
    setPendingDelete(true)
    await supabase.from('courses').delete().in('id', selected)
    setShowDeleteConfirm(false)
    setPendingDelete(false)
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
    return (t.common?.deleteConfirmText || '{count} запись{plural} будет удалена безвозвратно')
      .replace('{count}', count)
      .replace('{plural}', plural)
  }

  const showOrgSelect = !isFixedOrgProp

  return (
    <div>
      {/* Панель фильтров и действий */}
      <div className="flex flex-wrap gap-4 items-center mb-6">
        {/* Фильтр по статусу — подписи строго из t.courses.courseStates */}
        <div className="filter">
          {COURSE_STATES.map((st, i) => (
            <input
              key={st}
              className={`btn${i === 0 ? ' filter-reset' : ''}${statusFilter === st ? ' btn-primary' : ''}`}
              type="radio"
              name="courseState"
              aria-label={dictCourseStates?.[st] || st}
              value={st}
              checked={statusFilter === st}
              onChange={handleStatusRadio}
            />
          ))}
        </div>

        {/* Фильтр по организации (только в свободном режиме) */}
        {showOrgSelect && (
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

        {/* Поиск */}
        <label className="input input-bordered flex items-center gap-2">
          <MagnifyingGlassIcon className="h-5 w-5 opacity-60" />
          <input
            type="search"
            className="grow"
            placeholder={t.common?.search || 'Поиск'}
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
              {(t.common?.actionsWithSelected || 'Действия с выбранными')} <ChevronDownIcon className="w-5 ml-1" />
            </summary>
            <ul className="menu dropdown-content bg-base-200 rounded-lg z-1 w-full p-2 shadow-sm mt-px ring-1 ring-secondary/30">
              <li className="menu-title uppercase">{t.common?.assign_state || 'Назначить статус'}</li>
              {COURSE_STATUS_ACTIONS.map(st => (
                <li key={st}>
                  <button onClick={() => handleAction('changeStatus', st)}>
                    {dictCourseStates?.[st] || st}
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
                  {t.common?.deleteSelected || 'Удалить выбранные'}
                </button>
              </li>
            </ul>
          </details>
        )}
      </div>

      {/* Ожидание orgId в фиксированном режиме: аккуратный прелоадер */}
      {isWaitingForOrg && (
        <div className="flex items-center justify-center py-16">
          <span className="loading loading-spinner loading-lg" />
        </div>
      )}

      {/* Таблица */}
      {!isWaitingForOrg && (
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
                <th>{t.courses?.courses_list || t.courses?.all || 'Курсы'}</th>
                <th>{(t.common?.fullName || 'ФИО')} & E-mail</th>
                <th>{(t.common?.contacts || 'Контакты')} / {(t.common?.organization || 'Организация')}</th>
                <th>{t.common?.status || 'Статус'}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5}>
                    <div className="flex items-center gap-3 py-6">
                      <span className="loading loading-spinner loading-md" />
                      <span>{t.common?.loading || 'Загрузка...'}</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && courses.length === 0 && (
                <tr>
                  <td colSpan={5}>{errorText || t.common?.noData || 'Нет данных'}</td>
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
                    <span className="badge badge-outline">
                      {dictCourseStates?.[row.state] || row.state}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Пагинация */}
      {!isWaitingForOrg && total > PAGE_SIZE && (
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
              {t.common?.deleteConfirmTitle || 'Удалить записи?'}
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
                  : (t.common?.delete || 'Удалить')}
              </button>
              <button
                className="btn"
                disabled={pendingDelete}
                onClick={cancelDelete}
              >
                {t.common?.cancel || 'Отмена'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}