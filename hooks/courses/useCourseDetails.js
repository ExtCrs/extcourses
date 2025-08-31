// hooks/courses/useCourseDetails.js
// Individual course information and progress management

import React from 'react'
import useSWR, { mutate } from 'swr'
import { useSupabaseQuery, createSupabaseFetcher, useSupabaseMutation } from '@/hooks/common'
import { COURSE_KEYS, LESSON_KEYS, USER_KEYS } from '@/hooks/common'
import { supabase } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/auth'
import { useCoursesMetadata } from './useCourses.js'

/**
 * Hook for detailed course information with user progress
 */
export function useCourseDetails(courseId, userId, options = {}) {
  const { lang = 'ru', includeProgress = true } = options
  const { canManageCourses, userId: currentUserId } = useProfile()
  
  // Use current user ID if not provided and user is not admin/supervisor
  const targetUserId = userId || (!canManageCourses ? currentUserId : null)
  
  // Get static course metadata
  const { coursesMap } = useCoursesMetadata(lang)
  const courseMetadata = coursesMap[courseId] || null

  // Course enrollment fetcher
  const enrollmentFetcher = createSupabaseFetcher.custom(async () => {
    if (!courseId || !targetUserId) {
      return { data: null, count: 0 }
    }

    const { data, error } = await supabase
      .from('courses')
      .select(`
        id,
        student_id,
        course_id,
        status,
        created_at,
        updated_at
      `)
      .eq('student_id', targetUserId)
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') { // Not found is OK
      throw new Error(error.message)
    }

    return { data, count: data ? 1 : 0 }
  })

  const {
    data: enrollment,
    error: enrollmentError,
    isLoading: enrollmentLoading,
    mutate: mutateEnrollment
  } = useSupabaseQuery(
    courseId && targetUserId ? COURSE_KEYS.detail(courseId, targetUserId) : null,
    enrollmentFetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 0
    }
  )

  // Lesson progress fetcher
  const progressFetcher = createSupabaseFetcher.custom(async () => {
    if (!courseId || !targetUserId || !includeProgress) {
      return { data: [], count: 0 }
    }

    const { data, error } = await supabase
      .from('lessons')
      .select(`
        id,
        lesson_num,
        status,
        answer,
        created_at,
        updated_at
      `)
      .eq('profile_id', targetUserId)
      .eq('course_ref_id', courseId)
      .order('lesson_num', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return { data, count: data.length }
  })

  const {
    data: lessons,
    error: lessonsError,
    isLoading: lessonsLoading,
    mutate: mutateLessons
  } = useSupabaseQuery(
    courseId && targetUserId && includeProgress ? LESSON_KEYS.list(courseId, targetUserId) : null,
    progressFetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 0
    }
  )

  // Calculate progress statistics
  const progress = React.useMemo(() => {
    if (!lessons || !courseMetadata) return null

    const totalLessons = courseMetadata.total_lessons || 0
    const completedLessons = lessons.filter(l => 
      l.status === 'done' || l.status === 'accepted'
    ).length
    const inProgressLessons = lessons.filter(l => l.status === 'in_progress').length
    const pendingLessons = totalLessons - lessons.length

    return {
      totalLessons,
      completedLessons,
      inProgressLessons,
      pendingLessons,
      completionRate: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      lessonsData: lessons,
      isEnrolled: !!enrollment,
      enrollmentStatus: enrollment?.status || null
    }
  }, [lessons, courseMetadata, enrollment])

  // Course enrollment actions
  const { mutate: courseMutation } = useSupabaseMutation('courses', {
    invalidateKeys: [
      courseId && targetUserId && COURSE_KEYS.detail(courseId, targetUserId),
      targetUserId && USER_KEYS.courses(targetUserId)
    ],
    onSuccess: () => {
      mutateEnrollment()
    }
  })

  const enrollInCourse = async (status = 'active') => {
    if (!canManageCourses || !courseId || !targetUserId) {
      return { success: false, error: 'Unauthorized or missing parameters' }
    }

    try {
      await courseMutation('insert', {
        student_id: targetUserId,
        course_id: courseId,
        status
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const updateEnrollmentStatus = async (status) => {
    if (!canManageCourses || !enrollment) {
      return { success: false, error: 'Unauthorized or not enrolled' }
    }

    try {
      await courseMutation('update', {
        id: enrollment.id,
        values: { status }
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const unenrollFromCourse = async () => {
    if (!canManageCourses || !enrollment) {
      return { success: false, error: 'Unauthorized or not enrolled' }
    }

    try {
      await courseMutation('delete', { id: enrollment.id })

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const refresh = async () => {
    await Promise.all([
      mutateEnrollment(),
      includeProgress && mutateLessons()
    ].filter(Boolean))
  }

  return {
    // Course data
    courseMetadata,
    enrollment,
    progress,
    isEnrolled: !!enrollment,

    // State
    isLoading: enrollmentLoading || (includeProgress && lessonsLoading),
    error: enrollmentError || lessonsError,

    // Computed values
    canEnroll: canManageCourses && !enrollment,
    canUnenroll: canManageCourses && !!enrollment,
    canChangeStatus: canManageCourses && !!enrollment,

    // Actions
    enrollInCourse,
    updateEnrollmentStatus,
    unenrollFromCourse,
    refresh,

    // Cache control
    mutateEnrollment,
    mutateLessons
  }
}

/**
 * Hook for current user's course details
 */
export function useCurrentCourseDetails(courseId, options = {}) {
  const { userId } = useProfile()
  
  return useCourseDetails(courseId, userId, options)
}

/**
 * Hook for student's current active course
 */
export function useCurrentActiveCourse(userId, options = {}) {
  const { canManageCourses, userId: currentUserId } = useProfile()
  const targetUserId = userId || currentUserId

  const activeCoursesFetcher = createSupabaseFetcher.custom(async () => {
    if (!targetUserId) {
      return { data: null, count: 0 }
    }

    const { data, error } = await supabase
      .from('courses')
      .select('course_id, status, created_at')
      .eq('student_id', targetUserId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(error.message)
    }

    return { data, count: data ? 1 : 0 }
  })

  const {
    data: activeCourse,
    error,
    isLoading,
    mutate
  } = useSupabaseQuery(
    targetUserId ? `current-course-${targetUserId}` : null,
    activeCoursesFetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 5 * 60 * 1000 // Refresh every 5 minutes
    }
  )

  // Get detailed course information if active course exists
  const courseDetails = useCourseDetails(
    activeCourse?.course_id,
    targetUserId,
    {
      ...options,
      includeProgress: true
    }
  )

  return {
    // Active course data
    activeCourse,
    courseId: activeCourse?.course_id || null,

    // Detailed course information
    ...courseDetails,

    // Override loading state to include active course loading
    isLoading: isLoading || courseDetails.isLoading,
    error: error || courseDetails.error,

    // Actions
    refresh: async () => {
      await mutate()
      if (courseDetails.refresh) {
        await courseDetails.refresh()
      }
    }
  }
}

/**
 * Hook for course assignment/management (admin/supervisor use)
 */
export function useCourseAssignment() {
  const { canManageCourses } = useProfile()

  const { mutate: courseMutation } = useSupabaseMutation('courses', {
    onSuccess: () => {
      // Invalidate related caches
      mutate(
        (key) => typeof key === 'string' && (
          key.includes('course-') || 
          key.includes('user-courses-') ||
          key.includes('current-course-')
        ),
        undefined,
        { revalidate: true }
      )
    }
  })

  const assignCourse = async (studentId, courseId, status = 'active') => {
    if (!canManageCourses) {
      return { success: false, error: 'Unauthorized' }
    }

    try {
      await courseMutation('insert', {
        student_id: studentId,
        course_id: courseId,
        status
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const bulkAssignCourse = async (studentIds, courseId, status = 'active') => {
    if (!canManageCourses) {
      return { success: false, error: 'Unauthorized' }
    }

    try {
      const enrollments = studentIds.map(studentId => ({
        student_id: studentId,
        course_id: courseId,
        status
      }))

      // Note: This would need to be done individually or with a bulk insert endpoint
      const results = await Promise.all(
        enrollments.map(enrollment => 
          courseMutation('insert', enrollment)
        )
      )

      return { success: true, results }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const reassignCourse = async (studentId, oldCourseId, newCourseId) => {
    if (!canManageCourses) {
      return { success: false, error: 'Unauthorized' }
    }

    try {
      // Set old course to inactive
      if (oldCourseId) {
        const { data: oldEnrollment } = await supabase
          .from('courses')
          .select('id')
          .eq('student_id', studentId)
          .eq('course_id', oldCourseId)
          .eq('status', 'active')
          .single()

        if (oldEnrollment) {
          await courseMutation('update', {
            id: oldEnrollment.id,
            values: { status: 'inactive' }
          })
        }
      }

      // Assign new course
      await assignCourse(studentId, newCourseId)

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  return {
    assignCourse,
    bulkAssignCourse,
    reassignCourse,
    canManageCourses
  }
}