// hooks/users/useUserCourses.js
// User course mapping and enrollment management

import React from 'react'
import { useSupabaseQuery, createSupabaseFetcher, useSupabaseMutation } from '@/hooks/common'
import { USER_KEYS, COURSE_KEYS } from '@/hooks/common'
import { supabase } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/auth'
import useSWR, { mutate } from 'swr'

/**
 * Hook for managing user course enrollments
 */
export function useUserCourses(userId, options = {}) {
  const { canManageCourses } = useProfile()
  const { includeCourseDetails = false } = options

  // User courses fetcher
  const coursesFetcher = createSupabaseFetcher.custom(async () => {
    if (!userId) {
      return { data: [], count: 0 }
    }

    let query = supabase
      .from('courses')
      .select(`
        id,
        student_id,
        course_id,
        status,
        created_at,
        updated_at
      `)
      .eq('student_id', userId)
      .order('created_at', { ascending: false })

    const result = await query

    if (result.error) {
      throw new Error(result.error.message)
    }

    return result
  })

  const {
    data: enrollments,
    count: totalEnrollments,
    error,
    isLoading,
    mutate: mutateEnrollments
  } = useSupabaseQuery(
    userId ? USER_KEYS.courses(userId) : null,
    coursesFetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 0
    }
  )

  // Current course (most recent enrollment)
  const currentCourse = React.useMemo(() => {
    if (!enrollments?.length) return null
    return enrollments[0]
  }, [enrollments])

  // Course enrollment actions
  const { mutate: courseMutation } = useSupabaseMutation('courses', {
    invalidateKeys: [
      userId && USER_KEYS.courses(userId),
      userId && USER_KEYS.detail(userId)
    ],
    onSuccess: () => {
      mutateEnrollments()
    }
  })

  const enrollInCourse = async (courseId, status = 'active') => {
    if (!canManageCourses) {
      return { success: false, error: 'Unauthorized' }
    }

    if (!userId || !courseId) {
      return { success: false, error: 'User ID and Course ID are required' }
    }

    try {
      await courseMutation('insert', {
        student_id: userId,
        course_id: courseId,
        status
      })

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

  const removeEnrollment = async (enrollmentId) => {
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

  const setCurrentCourse = async (courseId) => {
    // Set all other courses to inactive and make this one active
    if (!canManageCourses) {
      return { success: false, error: 'Unauthorized' }
    }

    try {
      // First, set all user courses to inactive
      if (enrollments?.length) {
        await Promise.all(
          enrollments.map(enrollment => 
            courseMutation('update', {
              id: enrollment.id,
              values: { status: 'inactive' }
            })
          )
        )
      }

      // Then enroll in the new course or reactivate existing
      const existingEnrollment = enrollments?.find(e => e.course_id === courseId)
      
      if (existingEnrollment) {
        await courseMutation('update', {
          id: existingEnrollment.id,
          values: { status: 'active' }
        })
      } else {
        await enrollInCourse(courseId, 'active')
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  return {
    // Data
    enrollments: enrollments || [],
    currentCourse,
    totalEnrollments,
    isLoading,
    error,

    // Computed values
    hasEnrollments: (enrollments?.length || 0) > 0,
    courseIds: enrollments?.map(e => e.course_id) || [],
    activeCourseId: currentCourse?.course_id || null,

    // Actions
    enrollInCourse,
    updateEnrollmentStatus,
    removeEnrollment,
    setCurrentCourse,
    refresh: mutateEnrollments,

    // Permissions
    canManageCourses
  }
}

/**
 * Hook for getting current user's course enrollment
 */
export function useCurrentUserCourse() {
  const { userId } = useProfile()
  
  return useUserCourses(userId, { includeCourseDetails: true })
}

/**
 * Hook for bulk user course operations (admin/supervisor use)
 */
export function useBulkUserCourses() {
  const { canManageCourses } = useProfile()

  const { mutate: courseMutation } = useSupabaseMutation('courses', {
    onSuccess: () => {
      // Invalidate all user course caches
      mutate(
        (key) => typeof key === 'string' && key.includes('user-courses-'),
        undefined,
        { revalidate: true }
      )
    }
  })

  const bulkEnrollUsers = async (userIds, courseId, status = 'active') => {
    if (!canManageCourses) {
      return { success: false, error: 'Unauthorized' }
    }

    if (!userIds?.length || !courseId) {
      return { success: false, error: 'User IDs and Course ID are required' }
    }

    try {
      const enrollments = userIds.map(userId => ({
        student_id: userId,
        course_id: courseId,
        status
      }))

      await courseMutation('insert', enrollments)

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

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

  const bulkRemoveEnrollments = async (enrollmentIds) => {
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

  return {
    bulkEnrollUsers,
    bulkUpdateStatus,
    bulkRemoveEnrollments,
    canManageCourses
  }
}

/**
 * Hook for getting enrollment statistics
 */
export function useEnrollmentStats(filters = {}) {
  const { canViewStats } = useProfile()

  const statsFetcher = createSupabaseFetcher.custom(async () => {
    if (!canViewStats) {
      throw new Error('Unauthorized: Cannot view enrollment stats')
    }

    // Get enrollment counts by status
    const { data: enrollmentStats, error: enrollmentError } = await supabase
      .from('courses')
      .select('status, course_id')

    if (enrollmentError) {
      throw new Error(enrollmentError.message)
    }

    // Get unique course count
    const { data: courseCount, error: courseError } = await supabase
      .from('courses')
      .select('course_id', { count: 'exact' })

    if (courseError) {
      throw new Error(courseError.message)
    }

    // Process stats
    const stats = {
      totalEnrollments: enrollmentStats.length,
      uniqueCourses: new Set(enrollmentStats.map(e => e.course_id)).size,
      byStatus: {
        active: enrollmentStats.filter(e => e.status === 'active').length,
        inactive: enrollmentStats.filter(e => e.status === 'inactive').length,
        completed: enrollmentStats.filter(e => e.status === 'completed').length
      }
    }

    return { data: stats, count: 1 }
  })

  const {
    data: stats,
    error,
    isLoading,
    mutate
  } = useSupabaseQuery(
    canViewStats ? 'enrollment-stats' : null,
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