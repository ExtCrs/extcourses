// hooks/lessons/useLessons.js
// Lesson data and progress management hooks

import React from 'react'
import { useSupabaseQuery, createSupabaseFetcher, useSupabaseMutation, safeSingleQuery } from '@/hooks/common'
import { LESSON_KEYS } from '@/hooks/common'
import { supabase } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/auth'

/**
 * Hook for lesson data and progress management
 */
export function useLessons(courseRefId, profileId, options = {}) {
  const { includeAnswer = false } = options
  const { canManageCourses, userId } = useProfile()
  
  // Use current user if no profileId provided and user can't manage courses
  const targetProfileId = profileId || (!canManageCourses ? userId : null)

  const lessonsFetcher = createSupabaseFetcher.custom(async () => {
    if (!courseRefId || !targetProfileId) {
      return { data: [], count: 0 }
    }

    let selectFields = 'id, lesson_num, status, created_at, updated_at'
    if (includeAnswer && canManageCourses) {
      selectFields += ', answer'
    }

    const { data, error } = await supabase
      .from('lessons')
      .select(selectFields)
      .eq('profile_id', targetProfileId)
      .eq('course_ref_id', courseRefId)
      .order('lesson_num', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return { data, count: data.length }
  })

  const {
    data: lessons,
    count: totalLessons,
    error,
    isLoading,
    mutate: mutateLessons
  } = useSupabaseQuery(
    courseRefId && targetProfileId ? LESSON_KEYS.list(courseRefId, targetProfileId) : null,
    lessonsFetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 0
    }
  )

  // Lesson mutation hook
  const { mutate: lessonMutation } = useSupabaseMutation('lessons', {
    invalidateKeys: [
      courseRefId && targetProfileId && LESSON_KEYS.list(courseRefId, targetProfileId),
      courseRefId && targetProfileId && LESSON_KEYS.map(courseRefId, targetProfileId)
    ],
    onSuccess: () => {
      mutateLessons()
    }
  })

  const updateLessonStatus = async (lessonId, status) => {
    try {
      await lessonMutation('update', {
        id: lessonId,
        values: { status }
      })
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const saveAnswer = async (lessonNum, answer) => {
    if (!courseRefId || !targetProfileId) {
      return { success: false, error: 'Missing parameters' }
    }

    try {
      // Check if lesson exists
      const existingLesson = lessons?.find(l => l.lesson_num === lessonNum)
      
      if (existingLesson) {
        await lessonMutation('update', {
          id: existingLesson.id,
          values: { answer, status: 'in_progress' }
        })
      } else {
        await lessonMutation('insert', {
          profile_id: targetProfileId,
          course_ref_id: courseRefId,
          lesson_num: lessonNum,
          answer,
          status: 'in_progress'
        })
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  return {
    lessons: lessons || [],
    totalLessons,
    isLoading,
    error,
    updateLessonStatus,
    saveAnswer,
    refresh: mutateLessons
  }
}

/**
 * Hook for lessons map (status overview)
 */
export function useLessonsMap(courseRefId, profileId) {
  const { userId } = useProfile()
  const targetProfileId = profileId || userId

  const mapFetcher = createSupabaseFetcher.custom(async () => {
    if (!courseRefId || !targetProfileId) {
      return { data: {}, count: 0 }
    }

    const { data, error } = await supabase
      .from('lessons')
      .select('lesson_num, status')
      .eq('profile_id', targetProfileId)
      .eq('course_ref_id', courseRefId)

    if (error) {
      throw new Error(error.message)
    }

    const map = {}
    data.forEach(lesson => {
      map[lesson.lesson_num] = lesson.status || 'pending'
    })

    return { data: map, count: data.length }
  })

  const {
    data: lessonsMap,
    error,
    isLoading,
    mutate
  } = useSupabaseQuery(
    courseRefId && targetProfileId ? LESSON_KEYS.map(courseRefId, targetProfileId) : null,
    mapFetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 30 * 1000 // Refresh every 30 seconds for real-time updates
    }
  )

  return {
    lessonsMap: lessonsMap || {},
    isLoading,
    error,
    refresh: mutate
  }
}

/**
 * Hook for single lesson data
 * Handles PGRST116 errors gracefully when lesson doesn't exist
 */
export function useLesson(courseRefId, profileId, lessonId) {
  const { userId } = useProfile()
  const targetProfileId = profileId || userId

  const lessonFetcher = createSupabaseFetcher.lessonByIds(
    courseRefId,
    targetProfileId,
    lessonId
  )

  const {
    data: lesson,
    error,
    isLoading,
    mutate
  } = useSupabaseQuery(
    courseRefId && targetProfileId && lessonId 
      ? LESSON_KEYS.detail(courseRefId, targetProfileId, lessonId) 
      : null,
    lessonFetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 0
    }
  )

  return {
    lesson,
    isLoading,
    error,
    refresh: mutate
  }
}