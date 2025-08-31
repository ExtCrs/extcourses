'use client'

import { useState, useEffect, useRef } from 'react'
import { getTranslations } from '@/lib/i18n'
import { useUsers, useOrganizationsMap, useUserCoursesMap } from '@/hooks/users'
import { useCoursesMetadata } from '@/hooks/courses'
import dynamic from 'next/dynamic'
import { MagnifyingGlassIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

const UserEdit = dynamic(() => import('@/components/modals/UserEdit'), { ssr: false })

const ROLE_DATA = {
  public:     { short: 'Pub', color: 'bg-base-300' },
  supervisor: { short: 'Sup', color: 'bg-primary text-primary-content' },
  admin:      { short: 'Adm', color: 'bg-accent text-accent-content' },
}

export default function UsersTable({ lang = "ru" }) {
  const { t } = getTranslations(lang, 'common')

  // Get course metadata
  const { coursesMap } = useCoursesMetadata(lang)

  // Get organizations map
  const { orgMap } = useOrganizationsMap()

  // Use the SWR users hook
  const {
    users,
    totalUsers,
    isLoading,
    error: errorText,
    canManageUsers,
    pagination,
    search,
    filters,
    selection,
    updateUserRole,
    toggleUserStatus,
    deleteUser,
    bulkUpdateRole,
    bulkToggleStatus,
    bulkDelete,
    refresh
  } = useUsers({
    initialFilters: { role: 'all' }
  })

  // Get user courses map for current users
  const userIds = users.map(u => u.id)
  const { courseMap } = useUserCoursesMap(userIds)

  // Modal state
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)

  // Show actions state
  const [showActions, setShowActions] = useState(false)

  // Update show actions when selection changes
  useEffect(() => {
    setShowActions(selection.hasSelection)
  }, [selection.hasSelection])

  // Action handlers using SWR hooks
  async function handleAction(action) {
    let newRole = null
    if (action === 'toSupervisor') newRole = 'supervisor'
    if (action === 'toAdmin') newRole = 'admin'
    if (action === 'toPublic') newRole = 'public'

    if (newRole) {
      const result = await bulkUpdateRole(selection.selected, newRole)
      if (!result.success) {
        alert(result.error || 'Failed to update roles')
      }
    } else if (action === 'delete') {
      if (confirm('Are you sure you want to delete selected users?')) {
        const result = await bulkDelete(selection.selected)
        if (!result.success) {
          alert(result.error || 'Failed to delete users')
        }
      }
    }
  }

  function handleRoleRadio(e) {
    filters.updateFilter('role', e.target.value)
  }

  function handleSearch(e) {
    search.setSearch(e.target.value)
  }

  function handleSelect(id) {
    selection.toggleSelection(id)
  }

  function handleSelectAll() {
    selection.toggleSelectAll(users)
  }

  // Helper functions
  function getOrgName(orgId) {
    const org = orgMap[orgId]
    if (!org) return '-'
    if (lang === 'en') return org.name_en || org.name_ru || '-'
    return org.name_ru || org.name_en || '-'
  }

  function getUserCourseTitle(userId) {
    const courseId = courseMap[userId]
    if (!courseId) return t.common.noCourse
    const courseTitle = coursesMap[courseId.toString()]?.title
    return courseTitle || courseId
  }

  // Modal handlers
  function openEditModal() {
    if (selection.selectedCount === 1) {
      const user = users.find(u => u.id === selection.selected[0])
      setEditUser(user)
      setEditModalOpen(true)
    }
  }

  // Single user action handler
  async function handleSingleUserToggle(userId, currentActive) {
    const result = await toggleUserStatus(userId, !currentActive)
    if (!result.success) {
      alert(result.error || 'Failed to update user status')
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-4 items-center mb-6">
        <div className="filter flex gap-2">
          <input
            className={`btn filter-reset${filters.filters.role === 'all' ? ' btn-primary' : ''}`}
            type="radio"
            name="usersTypes"
            aria-label={t.common.all}
            value="all"
            checked={filters.filters.role === 'all'}
            onChange={handleRoleRadio}
          />
          <input
            className={`btn${filters.filters.role === 'public' ? ' btn-primary' : ''}`}
            type="radio"
            name="usersTypes"
            aria-label={t.roles?.public || 'Public'}
            value="public"
            checked={filters.filters.role === 'public'}
            onChange={handleRoleRadio}
          />
          <input
            className={`btn${filters.filters.role === 'supervisor' ? ' btn-primary' : ''}`}
            type="radio"
            name="usersTypes"
            aria-label={t.roles?.supervisor || 'Sups'}
            value="supervisor"
            checked={filters.filters.role === 'supervisor'}
            onChange={handleRoleRadio}
          />
          <input
            className={`btn${filters.filters.role === 'admin' ? ' btn-primary' : ''}`}
            type="radio"
            name="usersTypes"
            aria-label={t.roles?.admin || 'Admins'}
            value="admin"
            checked={filters.filters.role === 'admin'}
            onChange={handleRoleRadio}
          />
        </div>

        <label className="input input-bordered flex items-center gap-2">
          <MagnifyingGlassIcon className="h-5 w-5 opacity-60" />
          <input
            type="search"
            className="grow"
            placeholder={t.common.search}
            value={search.search}
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
          style={{ display: selection.selectedCount === 1 ? undefined : 'none' }}
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
                  checked={selection.allSelected}
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
            {isLoading && (
              <tr>
                <td colSpan={5}>
                  <span className="loading loading-spinner loading-md">{t.common.loading}</span>
                </td>
              </tr>
            )}
            {!isLoading && users.length === 0 && (
              <tr>
                <td colSpan={5}>{t.common.noData}</td>
              </tr>
            )}
            {!isLoading && users.map(user => {
              const roleData = ROLE_DATA[user.role] || ROLE_DATA.public
              const courseTitle = getUserCourseTitle(user.id)
              return (
                <tr
                  key={user.id}
                  className={selection.isSelected(user.id) ? "bg-base-200" : ""}
                  onClick={() => handleSelect(user.id)}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={selection.isSelected(user.id)}
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
                          await handleSingleUserToggle(user.id, user.active)
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

      {totalUsers > pagination.pageSize && (
        <div className="join justify-center flex mt-6">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
            .filter(i =>
              i === 1 ||
              i === pagination.totalPages ||
              (i >= pagination.page - 1 && i <= pagination.page + 1)
            ).map((p, idx, arr) =>
              arr[idx - 1] && p - arr[idx - 1] > 1 ? (
                <button className="join-item btn btn-disabled" key={'dots' + p}>...</button>
              ) : (
                <button
                  key={p}
                  className={`join-item btn${pagination.page === p ? ' btn-primary' : ''}`}
                  onClick={() => pagination.goToPage(p)}
                >{p}</button>
              )
            )}
        </div>
      )}

      {/* Modal for user editing */}
      {editModalOpen && (
        <UserEdit
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          user={editUser}
          orgs={orgMap}
          lang={lang}
          onSaved={() => refresh()}
        />
      )}
    </div>
  )
}