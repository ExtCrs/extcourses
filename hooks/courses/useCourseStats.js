// hooks/courses/useCourseStats.js
// Course statistics and analytics hooks

import React from 'react'
import { useSupabaseQuery, createSupabaseFetcher } from '@/hooks/common'
import { STATS_KEYS } from '@/hooks/common'
import { supabase } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/auth'

/**
 * Hook for course statistics
 */
export function useCourseStats(courseId = null, options = {}) {
  const { dateRange = 'all' } = options
  const { canViewStats, currentOrgId, isSupervisor } = useProfile()

  const statsFetcher = createSupabaseFetcher.custom(async () => {
    if (!canViewStats) {
      throw new Error('Unauthorized: Cannot view course statistics')
    }

    // Get enrollment stats
    let enrollmentQuery = supabase
      .from('courses')
      .select('course_id, status, created_at')

    if (courseId) {
      enrollmentQuery = enrollmentQuery.eq('course_id', courseId)
    }

    if (isSupervisor && currentOrgId) {
      enrollmentQuery = enrollmentQuery.eq('profiles.current_org_id', currentOrgId)
    }

    const { data: enrollments, error: enrollError } = await enrollmentQuery

    if (enrollError) {
      throw new Error(enrollError.message)
    }

    // Get lesson completion stats
    let lessonQuery = supabase
      .from('lessons')
      .select('course_ref_id, status, created_at')

    if (courseId) {
      lessonQuery = lessonQuery.eq('course_ref_id', courseId)
    }

    const { data: lessons, error: lessonError } = await lessonQuery

    if (lessonError) {
      throw new Error(lessonError.message)
    }

    // Process statistics
    const stats = {
      enrollments: {
        total: enrollments.length,
        active: enrollments.filter(e => e.status === 'active').length,
        inactive: enrollments.filter(e => e.status === 'inactive').length,
        completed: enrollments.filter(e => e.status === 'completed').length
      },
      lessons: {
        total: lessons.length,
        completed: lessons.filter(l => l.status === 'done' || l.status === 'accepted').length,
        inProgress: lessons.filter(l => l.status === 'in_progress').length,
        pending: lessons.filter(l => !l.status || l.status === 'pending').length
      },
      uniqueCourses: new Set(enrollments.map(e => e.course_id)).size,
      completionRate: lessons.length > 0 ? 
        Math.round((lessons.filter(l => l.status === 'done' || l.status === 'accepted').length / lessons.length) * 100) : 0
    }

    return { data: stats, count: 1 }
  })

  const cacheKey = canViewStats ? STATS_KEYS.course(
    courseId || 'all',
    dateRange,
    new Date().toDateString()
  ) : null

  const {
    data: stats,
    error,
    isLoading,
    mutate
  } = useSupabaseQuery(cacheKey, statsFetcher, {
    revalidateOnFocus: false,
    refreshInterval: 10 * 60 * 1000 // Refresh every 10 minutes
  })

  return {
    stats,
    isLoading,
    error,
    refresh: mutate,
    canViewStats
  }
}

/**
 * Hook for course performance metrics
 */
export function useCoursePerformance(courseId) {
  const { canViewStats } = useProfile()

  const performanceFetcher = createSupabaseFetcher.custom(async () => {
    if (!canViewStats || !courseId) {
      throw new Error('Unauthorized or missing course ID')
    }

    const { data: lessons, error } = await supabase
      .from('lessons')
      .select('profile_id, status, created_at, updated_at')
      .eq('course_ref_id', courseId)

    if (error) {
      throw new Error(error.message)
    }

    // Calculate performance metrics
    const userProgress = {}
    lessons.forEach(lesson => {
      if (!userProgress[lesson.profile_id]) {
        userProgress[lesson.profile_id] = {
          total: 0,
          completed: 0,
          inProgress: 0,
          avgCompletionTime: 0
        }
      }
      
      userProgress[lesson.profile_id].total++
      
      if (lesson.status === 'done' || lesson.status === 'accepted') {
        userProgress[lesson.profile_id].completed++
      } else if (lesson.status === 'in_progress') {
        userProgress[lesson.profile_id].inProgress++
      }
    })

    const performance = {
      totalStudents: Object.keys(userProgress).length,
      averageCompletion: Object.values(userProgress).reduce((acc, curr) => 
        acc + (curr.total > 0 ? curr.completed / curr.total : 0), 0) / Object.keys(userProgress).length * 100,
      topPerformers: Object.entries(userProgress)
        .map(([userId, progress]) => ({
          userId,
          completionRate: progress.total > 0 ? (progress.completed / progress.total) * 100 : 0,
          totalLessons: progress.total,
          completedLessons: progress.completed
        }))
        .sort((a, b) => b.completionRate - a.completionRate)
        .slice(0, 10)
    }

    return { data: performance, count: 1 }
  })

  const {
    data: performance,
    error,
    isLoading,
    mutate
  } = useSupabaseQuery(
    canViewStats && courseId ? `course-performance-${courseId}` : null,
    performanceFetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 15 * 60 * 1000 // Refresh every 15 minutes
    }
  )

  return {
    performance,
    isLoading,
    error,
    refresh: mutate,
    canViewStats
  }
}