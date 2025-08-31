// hooks/users/useStudents.js
// Student data management for supervisors

import React from 'react'
import { useSupabaseQuery, createSupabaseFetcher } from '@/hooks/common'
import { USER_KEYS } from '@/hooks/common'
import { usePagination, useSearch, useFilters } from '@/hooks/common'
import { supabase } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/auth'

/**
 * Students management hook for supervisors
 * Provides student data with course progress and filtering
 */
export function useStudents(options = {}) {
  const {
    initialPage = 1,
    pageSize = 12,
    initialFilters = {},
    initialSearch = ''
  } = options

  const { isSupervisor, isAdmin, currentOrgId } = useProfile()
  const canViewStudents = isSupervisor || isAdmin

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

  // Students fetcher
  const studentsFetcher = createSupabaseFetcher.custom(async () => {
    if (!canViewStudents) {
      throw new Error('Unauthorized: Cannot view students')
    }

    // Base query for student profiles
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
      .eq('role', 'public') // Students have role 'public'

    // Filter by organization if supervisor (admins can see all)
    if (isSupervisor && currentOrgId) {
      query = query.eq('current_org_id', currentOrgId)
    }

    // Apply additional filters
    if (filters.filters.orgId && isAdmin) {
      query = query.eq('current_org_id', filters.filters.orgId)
    }

    if (filters.filters.active !== undefined) {
      query = query.eq('active', filters.filters.active)
    }

    // Apply search
    if (search.activeSearch) {
      query = query.or(
        `full_name.ilike.%${search.activeSearch}%,email.ilike.%${search.activeSearch}%`
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

  // Cache key for students query
  const cacheKey = canViewStudents ? USER_KEYS.students(
    pagination.page,
    search.activeSearch,
    currentOrgId
  ) : null

  // Get students data with SWR
  const {
    data: students,
    count: totalStudents,
    error,
    isLoading,
    mutate: mutateStudents
  } = useSupabaseQuery(cacheKey, studentsFetcher, {
    revalidateOnFocus: false,
    refreshInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    dedupingInterval: 2000
  })

  // Update pagination total
  const updatedPagination = {
    ...pagination,
    total: totalStudents
  }

  // Student course progress fetcher
  const progressFetcher = createSupabaseFetcher.custom(async () => {
    if (!students?.length) {
      return { data: [], count: 0 }
    }

    const studentIds = students.map(s => s.id)

    // Get current course enrollments
    const { data: enrollments, error: enrollError } = await supabase
      .from('courses')
      .select('student_id, course_id, status, created_at')
      .in('student_id', studentIds)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (enrollError) {
      throw new Error(enrollError.message)
    }

    // Get lesson progress for enrolled students
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('profile_id, course_ref_id, status')
      .in('profile_id', studentIds)

    if (lessonsError) {
      throw new Error(lessonsError.message)
    }

    return { 
      data: { enrollments, lessons },
      count: enrollments.length + lessons.length
    }
  })

  const {
    data: progressData,
    error: progressError,
    isLoading: progressLoading,
    mutate: mutateProgress
  } = useSupabaseQuery(
    students?.length ? `student-progress-${students.map(s => s.id).join(',')}` : null,
    progressFetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 10 * 60 * 1000 // Refresh every 10 minutes
    }
  )

  // Process student data with progress
  const studentsWithProgress = React.useMemo(() => {
    if (!students || !progressData) return students || []

    const { enrollments = [], lessons = [] } = progressData

    // Create enrollment map
    const enrollmentMap = {}
    enrollments.forEach(enrollment => {
      enrollmentMap[enrollment.student_id] = enrollment
    })

    // Create lesson progress map
    const progressMap = {}
    lessons.forEach(lesson => {
      if (!progressMap[lesson.profile_id]) {
        progressMap[lesson.profile_id] = {}
      }
      if (!progressMap[lesson.profile_id][lesson.course_ref_id]) {
        progressMap[lesson.profile_id][lesson.course_ref_id] = {
          total: 0,
          completed: 0,
          inProgress: 0
        }
      }
      
      const courseProgress = progressMap[lesson.profile_id][lesson.course_ref_id]
      courseProgress.total++
      
      if (lesson.status === 'done' || lesson.status === 'accepted') {
        courseProgress.completed++
      } else if (lesson.status === 'in_progress') {
        courseProgress.inProgress++
      }
    })

    // Merge student data with progress
    return students.map(student => {
      const enrollment = enrollmentMap[student.id]
      const courseProgress = enrollment 
        ? progressMap[student.id]?.[enrollment.course_id] 
        : null

      return {
        ...student,
        enrollment,
        progress: courseProgress || { total: 0, completed: 0, inProgress: 0 },
        completionRate: courseProgress 
          ? Math.round((courseProgress.completed / courseProgress.total) * 100) || 0
          : 0
      }
    })
  }, [students, progressData])

  // Navigation helpers
  const goToPage = (page) => {
    updatedPagination.goToPage(page)
  }

  const refresh = async () => {
    await Promise.all([
      mutateStudents(),
      mutateProgress()
    ])
  }

  return {
    // Data
    students: studentsWithProgress,
    totalStudents,
    isLoading: isLoading || progressLoading,
    error: error || progressError,
    canViewStudents,

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
    mutateStudents,
    mutateProgress
  }
}

/**
 * Hook for getting detailed student progress
 */
export function useStudentProgress(studentId) {
  const { isSupervisor, isAdmin } = useProfile()
  const canView = isSupervisor || isAdmin

  const progressFetcher = createSupabaseFetcher.custom(async () => {
    if (!canView || !studentId) {
      return { data: null, count: 0 }
    }

    // Get student's current enrollment
    const { data: enrollment, error: enrollError } = await supabase
      .from('courses')
      .select('course_id, status, created_at')
      .eq('student_id', studentId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (enrollError && enrollError.code !== 'PGRST116') {
      throw new Error(enrollError.message)
    }

    if (!enrollment) {
      return { data: { enrollment: null, lessons: [] }, count: 0 }
    }

    // Get lesson progress for current course
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select(`
        id,
        lesson_num,
        status,
        answer,
        created_at,
        updated_at
      `)
      .eq('profile_id', studentId)
      .eq('course_ref_id', enrollment.course_id)
      .order('lesson_num', { ascending: true })

    if (lessonsError) {
      throw new Error(lessonsError.message)
    }

    return {
      data: { enrollment, lessons },
      count: lessons.length
    }
  })

  const {
    data: progressData,
    error,
    isLoading,
    mutate
  } = useSupabaseQuery(
    canView && studentId ? `student-${studentId}-progress` : null,
    progressFetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 0
    }
  )

  const progress = React.useMemo(() => {
    if (!progressData) return null

    const { enrollment, lessons } = progressData

    if (!enrollment) return null

    const total = lessons.length
    const completed = lessons.filter(l => l.status === 'done' || l.status === 'accepted').length
    const inProgress = lessons.filter(l => l.status === 'in_progress').length
    const pending = lessons.filter(l => l.status === 'pending' || !l.status).length

    return {
      enrollment,
      lessons,
      stats: {
        total,
        completed,
        inProgress,
        pending,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
      }
    }
  }, [progressData])

  return {
    progress,
    isLoading,
    error,
    refresh: mutate,
    canView
  }
}

/**
 * Hook for student statistics (supervisor/admin dashboard)
 */
export function useStudentStats() {
  const { isSupervisor, isAdmin, currentOrgId } = useProfile()
  const canView = isSupervisor || isAdmin

  const statsFetcher = createSupabaseFetcher.custom(async () => {
    if (!canView) {
      throw new Error('Unauthorized: Cannot view student stats')
    }

    let query = supabase
      .from('profiles')
      .select('id, active, current_org_id, created_at')
      .eq('role', 'public')

    // Filter by organization for supervisors
    if (isSupervisor && currentOrgId) {
      query = query.eq('current_org_id', currentOrgId)
    }

    const { data: students, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    const stats = {
      total: students.length,
      active: students.filter(s => s.active).length,
      inactive: students.filter(s => !s.active).length,
      byOrg: {}
    }

    // Group by organization
    students.forEach(student => {
      const orgId = student.current_org_id || 'unassigned'
      if (!stats.byOrg[orgId]) {
        stats.byOrg[orgId] = 0
      }
      stats.byOrg[orgId]++
    })

    return { data: stats, count: 1 }
  })

  const {
    data: stats,
    error,
    isLoading,
    mutate
  } = useSupabaseQuery(
    canView ? 'student-stats' : null,
    statsFetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 15 * 60 * 1000 // Refresh every 15 minutes
    }
  )

  return {
    stats,
    isLoading,
    error,
    refresh: mutate,
    canView
  }
}