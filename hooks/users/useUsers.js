// hooks/users/useUsers.js
// User management hooks for admin functionality

import React from 'react'
import { useSupabaseQuery, createSupabaseFetcher, useSupabaseMutation } from '@/hooks/common'
import { USER_KEYS, ORG_KEYS, INVALIDATION_PATTERNS } from '@/hooks/common'
import { usePagination, useSearch, useFilters, useSelection } from '@/hooks/common'
import { supabase } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/auth'
import useSWR from 'swr'

/**
 * Users management hook with pagination, search, and filtering
 * For admin user management functionality
 */
export function useUsers(options = {}) {
  const {
    initialPage = 1,
    pageSize = 12,
    initialFilters = { role: 'all' },
    initialSearch = ''
  } = options

  const { canManageUsers } = useProfile()

  // Pagination state
  const pagination = usePagination({ initialPage, pageSize })

  // Search state
  const search = useSearch({ 
    initialSearch,
    minLength: 3,
    debounceMs: 300
  })

  // Filter state
  const filters = useFilters(initialFilters)

  // Selection state for bulk operations
  const selection = useSelection()

  // Users fetcher
  const usersFetcher = createSupabaseFetcher.custom(async () => {
    if (!canManageUsers) {
      throw new Error('Unauthorized: Cannot manage users')
    }

    let query = supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        phone,
        current_org_id,
        role,
        active,
        created_at
      `, { count: 'exact' })

    // Apply role filter
    if (filters.filters.role && filters.filters.role !== 'all') {
      query = query.eq('role', filters.filters.role)
    }

    // Apply search
    if (search.activeSearch) {
      query = query.or(
        `full_name.ilike.%${search.activeSearch}%,email.ilike.%${search.activeSearch}%,phone.ilike.%${search.activeSearch}%`
      )
    }

    // Apply pagination
    query = query
      .range(pagination.from, pagination.to)
      .order('created_at', { ascending: false })

    const result = await query

    if (result.error) {
      throw new Error(result.error.message)
    }

    return result
  })

  // Cache key for users query
  const cacheKey = canManageUsers ? USER_KEYS.list(
    pagination.page,
    search.activeSearch,
    filters.filters.role,
    null // orgId - could be added later for multi-tenant support
  ) : null

  // Get users data with SWR
  const {
    data: users,
    count: totalUsers,
    error,
    isLoading,
    mutate: mutateUsers
  } = useSupabaseQuery(cacheKey, usersFetcher, {
    revalidateOnFocus: false,
    refreshInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    dedupingInterval: 2000
  })

  // Update pagination total when data changes
  const updatedPagination = {
    ...pagination,
    total: totalUsers
  }

  // Clear selection when data changes
  React.useEffect(() => {
    selection.clearSelection()
  }, [pagination.page, search.activeSearch, filters.filters.role])

  // User mutation hook
  const { mutate: userMutation } = useSupabaseMutation('profiles', {
    invalidateKeys: [cacheKey],
    onSuccess: () => {
      mutateUsers()
      selection.clearSelection()
    }
  })

  // User management actions
  const updateUser = async (userId, updates) => {
    if (!canManageUsers) {
      return { success: false, error: 'Unauthorized' }
    }

    try {
      await userMutation('update', {
        id: userId,
        values: updates
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const updateUserRole = async (userId, newRole) => {
    return updateUser(userId, { role: newRole })
  }

  const toggleUserStatus = async (userId, active) => {
    return updateUser(userId, { active })
  }

  const deleteUser = async (userId) => {
    if (!canManageUsers) {
      return { success: false, error: 'Unauthorized' }
    }

    try {
      await userMutation('delete', { id: userId })
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Bulk operations
  const bulkUpdateRole = async (userIds, newRole) => {
    if (!canManageUsers) {
      return { success: false, error: 'Unauthorized' }
    }

    try {
      const updates = userIds.map(id => 
        userMutation('update', { id, values: { role: newRole } })
      )
      
      await Promise.all(updates)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const bulkToggleStatus = async (userIds, active) => {
    if (!canManageUsers) {
      return { success: false, error: 'Unauthorized' }
    }

    try {
      const updates = userIds.map(id => 
        userMutation('update', { id, values: { active } })
      )
      
      await Promise.all(updates)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const bulkDelete = async (userIds) => {
    if (!canManageUsers) {
      return { success: false, error: 'Unauthorized' }
    }

    try {
      const deletions = userIds.map(id => 
        userMutation('delete', { id })
      )
      
      await Promise.all(deletions)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Navigation helpers
  const goToPage = (page) => {
    updatedPagination.goToPage(page)
    selection.clearSelection()
  }

  const refresh = async () => {
    await mutateUsers()
    selection.clearSelection()
  }

  return {
    // Data
    users: users || [],
    totalUsers,
    isLoading,
    error,
    canManageUsers,

    // Pagination
    pagination: {
      ...updatedPagination,
      goToPage
    },

    // Search
    search: {
      ...search,
      setSearch: (value) => {
        search.setSearch(value)
        updatedPagination.firstPage()
        selection.clearSelection()
      }
    },

    // Filters
    filters: {
      ...filters,
      updateFilter: (key, value) => {
        filters.updateFilter(key, value)
        updatedPagination.firstPage()
        selection.clearSelection()
      }
    },

    // Selection
    selection,

    // Actions
    updateUser,
    updateUserRole,
    toggleUserStatus,
    deleteUser,
    bulkUpdateRole,
    bulkToggleStatus,
    bulkDelete,
    refresh,

    // Cache control
    mutateUsers
  }
}

/**
 * Hook for getting organization map for user display
 */
export function useOrganizationsMap() {
  const orgsFetcher = createSupabaseFetcher.select('orgs', 'id, name_ru, name_en')

  const {
    data: orgs,
    error,
    isLoading,
    mutate
  } = useSupabaseQuery(
    ORG_KEYS.map(),
    orgsFetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 60 * 60 * 1000 // Refresh every hour
    }
  )

  const orgMap = React.useMemo(() => {
    if (!orgs) return {}
    
    const map = {}
    orgs.forEach(org => {
      map[org.id] = org
    })
    return map
  }, [orgs])

  return {
    orgs: orgs || [],
    orgMap,
    isLoading,
    error,
    refresh: mutate
  }
}

/**
 * Hook for user course mappings (for displaying user's current course)
 */
export function useUserCoursesMap(userIds) {
  const coursesFetcher = createSupabaseFetcher.custom(async () => {
    if (!userIds?.length) {
      return { data: [], count: 0 }
    }

    const { data, error } = await supabase
      .from('courses')
      .select('student_id, course_id, created_at')
      .in('student_id', userIds)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return { data, count: data.length }
  })

  const {
    data: courses,
    error,
    isLoading,
    mutate
  } = useSupabaseQuery(
    userIds?.length ? `user-courses-map-${userIds.join(',')}` : null,
    coursesFetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 0
    }
  )

  const courseMap = React.useMemo(() => {
    if (!courses) return {}
    
    const map = {}
    courses.forEach(course => {
      if (!map[course.student_id]) {
        map[course.student_id] = course.course_id?.toString()
      }
    })
    return map
  }, [courses])

  return {
    courses: courses || [],
    courseMap,
    isLoading,
    error,
    refresh: mutate
  }
}