// hooks/courses/useCoursesTable.js
// Specialized hook for courses table component

import React from 'react'
import { useSupabaseQuery, createSupabaseFetcher, useSupabaseMutation } from '@/hooks/common'
import { COURSE_KEYS, USER_KEYS } from '@/hooks/common'
import { usePagination, useSearch, useFilters, useSelection } from '@/hooks/common'
import { supabase } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/auth'
import { useCoursesMetadata } from './useCourses.js'

/**
 * Specialized hook for courses table component
 * Combines enrollment data with static course metadata
 */
export function useCoursesTable(options = {}) {
  const {
    initialPage = 1,
    pageSize = 12,
    initialFilters = {},
    initialSearch = '',
    lang = 'ru'
  } = options

  const { canManageCourses, currentOrgId, isSupervisor, isAdmin } = useProfile()

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

  // Get static course metadata
  const { coursesMap, categoriesMap } = useCoursesMetadata(lang)

  // Course enrollments with student details fetcher
  const enrollmentsFetcher = createSupabaseFetcher.custom(async () => {
    if (!canManageCourses) {
      throw new Error('Unauthorized: Cannot view course enrollments')
    }

    let query = supabase
      .from('courses')
      .select(`
        id,
        student_id,
        course_id,
        status,
        created_at,
        updated_at,
        profiles:student_id (
          id,
          full_name,
          email,
          current_org_id,
          role,
          active
        )
      `, { count: 'exact' })

    // Filter by organization for supervisors
    if (isSupervisor && currentOrgId) {
      query = query.eq('profiles.current_org_id', currentOrgId)
    }

    // Apply filters
    if (filters.filters.status && filters.filters.status !== 'all') {
      query = query.eq('status', filters.filters.status)
    }

    if (filters.filters.courseId) {
      query = query.eq('course_id', filters.filters.courseId)
    }

    if (filters.filters.orgId && isAdmin) {
      query = query.eq('profiles.current_org_id', filters.filters.orgId)
    }

    if (filters.filters.studentActive !== undefined) {
      query = query.eq('profiles.active', filters.filters.studentActive)
    }

    // Apply search (search in student name/email or course title)
    if (search.activeSearch) {
      query = query.or(
        `profiles.full_name.ilike.%${search.activeSearch}%,profiles.email.ilike.%${search.activeSearch}%`
      )
    }

    // Apply pagination and ordering
    query = query
      .range(pagination.from, pagination.to)
      .order('created_at', { ascending: false })

    const result = await query

    if (result.error) {
      throw new Error(result.error.message)
    }

    return result
  })

  // Cache key for enrollments query
  const cacheKey = canManageCourses ? COURSE_KEYS.table(
    pagination.page,
    {
      ...filters.filters,
      search: search.activeSearch
    },
    currentOrgId
  ) : null

  // Get enrollments data with SWR
  const {
    data: enrollments,
    count: totalEnrollments,
    error,
    isLoading,
    mutate: mutateEnrollments
  } = useSupabaseQuery(cacheKey, enrollmentsFetcher, {
    revalidateOnFocus: false,
    refreshInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    dedupingInterval: 2000
  })

  // Process enrollments with course metadata
  const processedEnrollments = React.useMemo(() => {
    if (!enrollments) return []

    return enrollments.map(enrollment => {
      const courseMetadata = coursesMap[enrollment.course_id] || {}
      const category = categoriesMap[courseMetadata.category_id] || {}

      return {
        ...enrollment,
        courseTitle: courseMetadata.title || `Course ${enrollment.course_id}`,
        courseShortTitle: courseMetadata.short_title || enrollment.course_id,
        categoryName: category.name || 'Unknown',
        totalLessons: courseMetadata.total_lessons || 0,
        totalTasks: courseMetadata.total_tasks || 0,
        studentName: enrollment.profiles?.full_name || 'Unknown',
        studentEmail: enrollment.profiles?.email || '',
        studentOrgId: enrollment.profiles?.current_org_id,
        studentActive: enrollment.profiles?.active || false
      }
    })
  }, [enrollments, coursesMap, categoriesMap])

  // Update pagination total
  const updatedPagination = {
    ...pagination,
    total: totalEnrollments
  }

  // Clear selection when data changes
  React.useEffect(() => {
    selection.clearSelection()
  }, [pagination.page, search.activeSearch, filters.filters])

  // Course enrollment mutation hook
  const { mutate: courseMutation } = useSupabaseMutation('courses', {
    invalidateKeys: [cacheKey],
    onSuccess: () => {
      mutateEnrollments()
      selection.clearSelection()
    }
  })

  // Bulk operations
  const bulkUpdateStatus = async (enrollmentIds, status) => {
    if (!canManageCourses) {
      return { success: false, error: 'Unauthorized' }
    }

    try {
      const updates = enrollmentIds.map(id => 
        courseMutation('update', {
          id,
          values: { status }
        })
      )

      await Promise.all(updates)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const bulkDelete = async (enrollmentIds) => {
    if (!canManageCourses) {
      return { success: false, error: 'Unauthorized' }
    }

    try {
      const deletions = enrollmentIds.map(id => 
        courseMutation('delete', { id })
      )

      await Promise.all(deletions)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const updateEnrollmentStatus = async (enrollmentId, status) => {
    if (!canManageCourses) {
      return { success: false, error: 'Unauthorized' }
    }

    try {
      await courseMutation('update', {
        id: enrollmentId,
        values: { status }
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const deleteEnrollment = async (enrollmentId) => {
    if (!canManageCourses) {
      return { success: false, error: 'Unauthorized' }
    }

    try {
      await courseMutation('delete', { id: enrollmentId })
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
    await mutateEnrollments()
    selection.clearSelection()
  }

  // Filter helpers
  const getUniqueValues = (field) => {
    if (!processedEnrollments.length) return []
    
    const values = [...new Set(processedEnrollments.map(item => item[field]))]
    return values.filter(Boolean).sort()
  }

  const getUniqueCourses = () => {
    return getUniqueValues('courseTitle').map(title => {
      const enrollment = processedEnrollments.find(e => e.courseTitle === title)
      return {
        id: enrollment?.course_id,
        title,
        shortTitle: enrollment?.courseShortTitle
      }
    })
  }

  const getUniqueCategories = () => {
    return getUniqueValues('categoryName')
  }

  const getStatusCounts = () => {
    const counts = {
      all: processedEnrollments.length,
      active: 0,
      inactive: 0,
      completed: 0
    }

    processedEnrollments.forEach(enrollment => {
      if (counts[enrollment.status] !== undefined) {
        counts[enrollment.status]++
      }
    })

    return counts
  }

  return {
    // Data
    enrollments: processedEnrollments,
    totalEnrollments,
    isLoading,
    error,
    canManageCourses,

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

    // Statistics
    statusCounts: getStatusCounts(),
    uniqueCourses: getUniqueCourses(),
    uniqueCategories: getUniqueCategories(),

    // Actions
    updateEnrollmentStatus,
    deleteEnrollment,
    bulkUpdateStatus,
    bulkDelete,
    refresh,

    // Cache control
    mutateEnrollments
  }
}

/**
 * Hook for course enrollment summary (lighter version for dashboards)
 */
export function useCourseEnrollmentSummary() {
  const { canViewStats, currentOrgId, isSupervisor } = useProfile()

  const summaryFetcher = createSupabaseFetcher.custom(async () => {
    if (!canViewStats) {
      throw new Error('Unauthorized: Cannot view enrollment summary')
    }

    let query = supabase
      .from('courses')
      .select(`
        course_id,
        status,
        profiles:student_id (current_org_id)
      `)

    // Filter by organization for supervisors
    if (isSupervisor && currentOrgId) {
      query = query.eq('profiles.current_org_id', currentOrgId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    // Process summary statistics
    const summary = {
      totalEnrollments: data.length,
      byStatus: {
        active: data.filter(e => e.status === 'active').length,
        inactive: data.filter(e => e.status === 'inactive').length,
        completed: data.filter(e => e.status === 'completed').length
      },
      byCourse: {},
      uniqueCourses: new Set(data.map(e => e.course_id)).size
    }

    // Group by course
    data.forEach(enrollment => {
      const courseId = enrollment.course_id
      if (!summary.byCourse[courseId]) {
        summary.byCourse[courseId] = {
          total: 0,
          active: 0,
          inactive: 0,
          completed: 0
        }
      }
      
      summary.byCourse[courseId].total++
      if (summary.byCourse[courseId][enrollment.status] !== undefined) {
        summary.byCourse[courseId][enrollment.status]++
      }
    })

    return { data: summary, count: 1 }
  })

  const {
    data: summary,
    error,
    isLoading,
    mutate
  } = useSupabaseQuery(
    canViewStats ? `course-enrollment-summary-${currentOrgId || 'all'}` : null,
    summaryFetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 5 * 60 * 1000 // Refresh every 5 minutes
    }
  )

  return {
    summary,
    isLoading,
    error,
    refresh: mutate,
    canViewStats
  }
}