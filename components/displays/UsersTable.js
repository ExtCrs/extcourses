'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getTranslations } from '@/lib/i18n'
import coursesList from '@/data/courses.json'
import dynamic from 'next/dynamic'
import { MagnifyingGlassIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

const UserEdit = dynamic(() => import('@/components/modals/UserEdit'), { ssr: false })

const ROLE_DATA = {
  public:     { short: 'Pub', color: 'bg-base-300' },
  supervisor: { short: 'Sup', color: 'bg-primary text-primary-content' },
  admin:      { short: 'Adm', color: 'bg-accent text-accent-content' },
}

async function getOrgMap() {
  const { data } = await supabase.from('orgs').select('id, name_ru, name_en')
  const map = {}
  ;(data || []).forEach(org => { map[org.id] = org })
  return map
}

function getCoursesMapFromFile(lang) {
  const map = {}
  coursesList.forEach(course => {
    if (!course.id) return
    const courseId = course.id.toString().trim()
    let title = lang === 'en'
      ? (typeof course.title_en === 'string' ? course.title_en.trim() : '')
      : (typeof course.title_ru === 'string' ? course.title_ru.trim() : '')
    if (!title) {
      title = lang === 'en'
        ? (typeof course.title_ru === 'string' ? course.title_ru.trim() : '')
        : (typeof course.title_en === 'string' ? course.title_en.trim() : '')
    }
    map[courseId] = title || courseId
  })
  return map
}

export default function UsersTable({ lang = "ru" }) {
  const { t } = getTranslations(lang, 'common')

  const [users, setUsers] = useState([])
  const [orgs, setOrgs] = useState({})
  const [coursesMap, setCoursesMap] = useState({})
  const [userCourseMap, setUserCourseMap] = useState({})
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errorText, setErrorText] = useState('')

  const [roleFilter, setRoleFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [lastSearch, setLastSearch] = useState('')

  const [selected, setSelected] = useState([])
  const [allSelected, setAllSelected] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)

  const isFirstLoad = useRef(true)

  useEffect(() => {
    setCoursesMap(getCoursesMapFromFile(lang))
  }, [lang])

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false
      fetchAll('')
      return
    }
    fetchAll(lastSearch)
    // eslint-disable-next-line
  }, [page, roleFilter, lastSearch, lang])

  async function fetchAll(appliedSearch = '') {
    setLoading(true)
    setErrorText('')

    getOrgMap().then(setOrgs)

    let query = supabase.from('profiles').select(
      'id, email, full_name, phone, current_org_id, role, active',
      { count: 'exact' }
    )

    if (roleFilter !== 'all') {
      query = query.eq('role', roleFilter)
    }

    if (appliedSearch.length >= 3) {
      query = query.or(
        `full_name.ilike.%${appliedSearch}%,email.ilike.%${appliedSearch}%,phone.ilike.%${appliedSearch}%`
      )
    }

    const PAGE_SIZE = 12
    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data, count, error } = await query
      .range(from, to)
      .order('created_at', { ascending: false })

    setLoading(false)

    if (error) {
      setUsers([])
      setTotal(0)
      setUserCourseMap({})
      setErrorText(error.message || t.common.noData)
    } else if (data) {
      setUsers(data)
      setTotal(count || 0)
      setSelected([])
      setAllSelected(false)
      setShowActions(false)
      loadUserCourses(data.map(u => u.id))
    } else {
      setUsers([])
      setTotal(0)
      setUserCourseMap({})
      setErrorText(t.common.noData)
    }
  }

  async function loadUserCourses(userIds) {
    if (!userIds.length) {
      setUserCourseMap({})
      return
    }
    const { data } = await supabase
      .from('courses')
      .select('student_id, course_id, created_at')
      .in('student_id', userIds)
      .order('created_at', { ascending: false })

    const map = {}
    if (data && data.length) {
      data.forEach(row => {
        if (!map[row.student_id]) {
          map[row.student_id] = row.course_id?.toString()
        }
      })
    }
    setUserCourseMap(map)
  }

  function handleRoleRadio(e) {
    setRoleFilter(e.target.value)
    setPage(1)
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
      next = selected.filter((uid) => uid !== id)
    } else {
      next = [...selected, id]
    }
    setSelected(next)
    setShowActions(next.length > 0)
    setAllSelected(next.length === users.length && users.length > 0)
  }

  function handleSelectAll() {
    if (allSelected) {
      setSelected([])
      setAllSelected(false)
      setShowActions(false)
    } else {
      const ids = users.map((u) => u.id)
      setSelected(ids)
      setAllSelected(true)
      setShowActions(ids.length > 0)
    }
  }

  async function handleAction(action) {
    let newRole = null
    if (action === 'toSupervisor') newRole = 'supervisor'
    if (action === 'toAdmin') newRole = 'admin'
    if (action === 'toPublic') newRole = 'public'

    if (action === 'delete') {
      await supabase.from('profiles').delete().in('id', selected)
    } else if (newRole) {
      await supabase.from('profiles').update({ role: newRole }).in('id', selected)
    }
    fetchAll(lastSearch)
  }

  const PAGE_SIZE = 12
  const totalPages = Math.ceil(total / PAGE_SIZE)

  function getOrgName(orgId) {
    const org = orgs[orgId]
    if (!org) return '-'
    if (lang === 'en') return org.name_en || org.name_ru || '-'
    return org.name_ru || org.name_en || '-'
  }

  function getUserCourseTitle(userId) {
    const courseId = userCourseMap[userId]
    if (!courseId) return t.common.noCourse
    const courseTitle = coursesMap[courseId.toString()]
    return courseTitle || courseId
  }

  // ---- ВСТАВКА: Открытие модального окна для редактирования ----
  function openEditModal() {
    if (selected.length === 1) {
      const user = users.find(u => u.id === selected[0])
      setEditUser(user)
      setEditModalOpen(true)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-4 items-center mb-6">
        <div className="filter flex gap-2">
          <input
            className={`btn filter-reset${roleFilter === 'all' ? ' btn-primary' : ''}`}
            type="radio"
            name="usersTypes"
            aria-label={t.common.all}
            value="all"
            checked={roleFilter === 'all'}
            onChange={handleRoleRadio}
          />
          <input
            className={`btn${roleFilter === 'public' ? ' btn-primary' : ''}`}
            type="radio"
            name="usersTypes"
            aria-label={t.roles?.public || 'Public'}
            value="public"
            checked={roleFilter === 'public'}
            onChange={handleRoleRadio}
          />
          <input
            className={`btn${roleFilter === 'supervisor' ? ' btn-primary' : ''}`}
            type="radio"
            name="usersTypes"
            aria-label={t.roles?.supervisor || 'Sups'}
            value="supervisor"
            checked={roleFilter === 'supervisor'}
            onChange={handleRoleRadio}
          />
          <input
            className={`btn${roleFilter === 'admin' ? ' btn-primary' : ''}`}
            type="radio"
            name="usersTypes"
            aria-label={t.roles?.admin || 'Admins'}
            value="admin"
            checked={roleFilter === 'admin'}
            onChange={handleRoleRadio}
          />
        </div>

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
                <button onClick={() => handleAction('toSupervisor')}>
                  {t.common.toSupervisors}
                </button>
              </li>
              <li>
                <button onClick={() => handleAction('toAdmin')}>
                  {t.common.toAdmins}
                </button>
              </li>
              <li>
                <button onClick={() => handleAction('toPublic')}>
                  {t.common.toPublic}
                </button>
              </li>
              <li>
                <button onClick={() => handleAction('delete')} className="text-error">
                  {t.common.deleteSelected}
                </button>
              </li>
            </ul>
          </details>
        )}

        {/* Кнопка для открытия модального окна редактирования */}
        <button
          className="btn btn-primary"
          style={{ display: selected.length === 1 ? undefined : 'none' }}
          onClick={openEditModal}
        >
          {t.common?.editUser}
        </button>
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
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={5}>{t.common.noData}</td>
              </tr>
            )}
            {!loading && users.map(user => {
              const roleData = ROLE_DATA[user.role] || ROLE_DATA.public
              const courseTitle = getUserCourseTitle(user.id)
              return (
                <tr
                  key={user.id}
                  className={selected.includes(user.id) ? "bg-base-200" : ""}
                  onClick={() => handleSelect(user.id)}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={selected.includes(user.id)}
                      onChange={() => handleSelect(user.id)}
                      onClick={e => e.stopPropagation()}
                    />
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="avatar avatar-placeholder">
                        <div className={`mask mask-squircle w-12 h-12 ${roleData.color}`}>
                          <span className="flex items-center justify-center h-full w-full font-light text-lg">
                            {roleData.short}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="font-bold">{user.full_name || '-'}</div>
                        <div className="text-sm opacity-50">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>{user.phone || '-'}</div>
                    <span className="badge badge-ghost badge-sm">
                      {getOrgName(user.current_org_id)}
                    </span>
                  </td>
                  <td>
                    {courseTitle}
                  </td>
                  <td>
                    <label className="toggle" title={user.active ? t.common.active : t.common.inactive}>
                      <input
                        type="checkbox"
                        checked={user.active}
                        onChange={async (e) => {
                          e.stopPropagation()
                          await supabase
                            .from('profiles')
                            .update({ active: !user.active })
                            .eq('id', user.id)
                          fetchAll(lastSearch)
                        }}
                      />
                    </label>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {total > PAGE_SIZE && (
        <div className="join justify-center flex mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(i =>
              i === 1 ||
              i === totalPages ||
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

      {/* Само модальное окно редактирования */}
      {editModalOpen && (
        <UserEdit
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          user={editUser}
          orgs={orgs}
          lang={lang}
          onSaved={() => fetchAll(lastSearch)}
        />
      )}
    </div>
  )
}