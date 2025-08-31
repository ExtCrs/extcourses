// hooks/courses/useCourses.js
// Course listing and management hooks

import React from 'react'
import { useSupabaseQuery, createSupabaseFetcher } from '@/hooks/common'
import { COURSE_KEYS } from '@/hooks/common'
import { usePagination, useSearch, useFilters } from '@/hooks/common'
import { useProfile } from '@/hooks/auth'
import { supabase } from '@/lib/supabase/client'
import coursesList from '@/data/courses.json'
import categoriesList from '@/data/courses_categories.json'

/**
 * Hook for getting static course metadata
 */
export function useCoursesMetadata(lang = 'ru') {
  // Process static courses data
  const coursesMap = React.useMemo(() => {
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

      map[courseId] = {
        ...course,
        title: title || courseId,
        short_title: lang === 'en' ? course.short_title_en : course.short_title_ru,
        intro: lang === 'en' ? course.intro_en : course.intro_ru,
        description: lang === 'en' ? course.description_en : course.description_ru
      }
    })
    return map
  }, [lang])

  // Process categories data
  const categoriesMap = React.useMemo(() => {
    const map = {}
    categoriesList.forEach(category => {
      map[category.id] = {
        ...category,
        name: lang === 'en' ? category.name_en : category.name_ru
      }
    })
    return map
  }, [lang])

  return {
    coursesMap,
    categoriesMap,
    courses: coursesList,
    categories: categoriesList
  }
}

/**
 * Hook for course enrollment data (database-driven)
 */
export function useCourseEnrollments(options = {}) {
  const {
    initialPage = 1,
    pageSize = 12,
    initialFilters = {},
    initialSearch = ''
  } = options

  const { canManageCourses, currentOrgId, isSupervisor } = useProfile()

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

  // Course enrollments fetcher
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
          current_org_id
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

    // Apply search (search in student name/email)
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
    filters.filters,
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

  // Update pagination total
  const updatedPagination = {
    ...pagination,
    total: totalEnrollments
  }

  // Navigation helpers
  const goToPage = (page) => {
    updatedPagination.goToPage(page)
  }

  const refresh = async () => {
    await mutateEnrollments()
  }

  return {
    // Data
    enrollments: enrollments || [],
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
      }
    },

    // Filters
    filters: {
      ...filters,
      updateFilter: (key, value) => {
        filters.updateFilter(key, value)
        updatedPagination.firstPage()
      }
    },

    // Actions
    refresh,

    // Cache control
    mutateEnrollments
  }
}

/**
 * Combined hook for courses with metadata and enrollment data
 */
export function useCourses(options = {}) {
  const { lang = 'ru', includeEnrollments = false } = options

  // Get static metadata
  const metadata = useCoursesMetadata(lang)

  // Get enrollment data if requested
  const enrollments = useCourseEnrollments(
    includeEnrollments ? options : { enabled: false }
  )

  // Combine static and dynamic data
  const coursesWithEnrollments = React.useMemo(() => {
    if (!includeEnrollments || !enrollments.enrollments?.length) {
      return metadata.courses.map(course => ({
        ...metadata.coursesMap[course.id],
        enrollments: [],
        enrollmentCount: 0
      }))
    }

    // Group enrollments by course
    const enrollmentsByCourse = {}
    enrollments.enrollments.forEach(enrollment => {
      const courseId = enrollment.course_id
      if (!enrollmentsByCourse[courseId]) {
        enrollmentsByCourse[courseId] = []
      }
      enrollmentsByCourse[courseId].push(enrollment)
    })

    return metadata.courses.map(course => ({
      ...metadata.coursesMap[course.id],
      enrollments: enrollmentsByCourse[course.id] || [],
      enrollmentCount: (enrollmentsByCourse[course.id] || []).length
    }))
  }, [metadata, enrollments.enrollments, includeEnrollments])

  return {
    // Static data
    ...metadata,

    // Combined data
    courses: coursesWithEnrollments,

    // Enrollment data (if requested)
    ...(includeEnrollments && {
      enrollments: enrollments.enrollments,
      totalEnrollments: enrollments.totalEnrollments,
      pagination: enrollments.pagination,
      search: enrollments.search,
      filters: enrollments.filters
    }),

    // State
    isLoading: includeEnrollments ? enrollments.isLoading : false,
    error: includeEnrollments ? enrollments.error : null,

    // Actions
    refresh: includeEnrollments ? enrollments.refresh : () => {},

    // Permissions
    canManageCourses: includeEnrollments ? enrollments.canManageCourses : false
  }
}

/**
 * Hook for course statistics
 */
export function useCoursesStats() {
  const { canViewStats } = useProfile()

  const statsFetcher = createSupabaseFetcher.custom(async () => {
    if (!canViewStats) {
      throw new Error('Unauthorized: Cannot view course stats')
    }

    // Get enrollment statistics
    const { data: enrollments, error: enrollError } = await supabase
      .from('courses')
      .select('course_id, status')

    if (enrollError) {
      throw new Error(enrollError.message)
    }

    // Process statistics
    const stats = {
      totalEnrollments: enrollments.length,
      uniqueCourses: new Set(enrollments.map(e => e.course_id)).size,
      byStatus: {
        active: enrollments.filter(e => e.status === 'active').length,
        inactive: enrollments.filter(e => e.status === 'inactive').length,
        completed: enrollments.filter(e => e.status === 'completed').length
      },
      byCourse: {}
    }

    // Group by course
    enrollments.forEach(enrollment => {
      const courseId = enrollment.course_id
      if (!stats.byCourse[courseId]) {
        stats.byCourse[courseId] = {
          total: 0,
          active: 0,
          inactive: 0,
          completed: 0
        }
      }
      
      stats.byCourse[courseId].total++
      stats.byCourse[courseId][enrollment.status]++
    })

    return { data: stats, count: 1 }
  })

  const {
    data: stats,
    error,
    isLoading,
    mutate
  } = useSupabaseQuery(
    canViewStats ? 'courses-stats' : null,
    statsFetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 10 * 60 * 1000 // Refresh every 10 minutes
    }
  )

  return {
    stats,
    isLoading,
    error,
    refresh: mutate,
    canViewStats
  }
}

/**
 * Hook for getting available courses for assignment
 */
export function useAvailableCourses(lang = 'ru') {
  const { canManageCourses } = useProfile()
  const metadata = useCoursesMetadata(lang)

  // Filter courses that can be assigned
  const availableCourses = React.useMemo(() => {
    return metadata.courses
      .filter(course => course.id && course.total_lessons > 0)
      .map(course => ({
        id: course.id,
        title: metadata.coursesMap[course.id]?.title || course.id,
        shortTitle: metadata.coursesMap[course.id]?.short_title || course.id,
        category: metadata.categoriesMap[course.category_id]?.name || 'Unknown',
        totalLessons: course.total_lessons,
        totalTasks: course.total_tasks
      }))
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [metadata, lang])

  return {
    courses: availableCourses,
    canManageCourses,
    isLoading: false,
    error: null
  }
}