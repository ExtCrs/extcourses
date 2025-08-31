// hooks/common/useSupabaseQuery.js
// Base hook for Supabase queries with SWR integration

import useSWR, { mutate } from 'swr'
import { supabase } from '@/lib/supabase/client'

/**
 * Base Supabase query hook with SWR integration
 * Provides consistent error handling, loading states, and caching
 */
export function useSupabaseQuery(key, fetcher, options = {}) {
  const {
    revalidateOnFocus = true,
    revalidateOnReconnect = true,
    refreshInterval = 0,
    dedupingInterval = 2000,
    ...swrOptions
  } = options

  const {
    data,
    error,
    mutate,
    isLoading,
    isValidating
  } = useSWR(
    key,
    fetcher,
    {
      revalidateOnFocus,
      revalidateOnReconnect,
      refreshInterval,
      dedupingInterval,
      ...swrOptions
    }
  )

  return {
    data: data?.data || null,
    count: data?.count || 0,
    error,
    isLoading,
    isValidating,
    mutate,
    refresh: () => mutate()
  }
}

/**
 * Helper function for safe single record queries
 * Handles PGRST116 (no rows returned) gracefully
 */
export const safeSingleQuery = async (query) => {
  const { data, error } = await query.single()
  
  if (error) {
    // Handle "no rows returned" error gracefully
    if (error.code === 'PGRST116') {
      return { data: null, error: null }
    }
    return { data: null, error }
  }
  
  return { data, error: null }
}

/**
 * Supabase query fetcher factory
 * Creates standardized fetchers for different query types
 */
export const createSupabaseFetcher = {
  // Simple select query
  select: (table, columns = '*', options = {}) => async () => {
    let query = supabase.from(table).select(columns, { count: options.count })
    
    // Apply filters
    if (options.filters) {
      Object.entries(options.filters).forEach(([column, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          query = query.eq(column, value)
        }
      })
    }
    
    // Apply search
    if (options.search && options.searchColumns) {
      const searchPattern = options.searchColumns
        .map(col => `${col}.ilike.%${options.search}%`)
        .join(',')
      query = query.or(searchPattern)
    }
    
    // Apply pagination
    if (options.range) {
      query = query.range(options.range.from, options.range.to)
    }
    
    // Apply ordering
    if (options.orderBy) {
      query = query.order(options.orderBy.column, { 
        ascending: options.orderBy.ascending !== false 
      })
    }

    const result = await query
    
    if (result.error) {
      throw new Error(result.error.message)
    }
    
    return result
  },

  // Single record by ID
  byId: (table, id, columns = '*') => async () => {
    if (!id) throw new Error('ID is required')
    
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .eq('id', id)
      .single()
    
    if (error) {
      // Handle "no rows returned" error gracefully
      if (error.code === 'PGRST116') {
        return { data: null, count: 0 }
      }
      throw new Error(error.message)
    }
    
    return { data, count: 1 }
  },

  // Custom query function
  custom: (queryFn) => async (...args) => {
    if (typeof queryFn !== 'function') {
      throw new Error('Query function is required')
    }
    
    const result = await queryFn(...args)
    
    if (result?.error) {
      throw new Error(result.error.message)
    }
    
    return result
  },

  // Lesson by identifiers (handles PGRST116 gracefully)
  lessonByIds: (courseRefId, profileId, lessonId, columns = '*') => async () => {
    if (!courseRefId || !profileId || !lessonId) {
      return { data: null, count: 0 }
    }
    
    const { data, error } = await safeSingleQuery(
      supabase
        .from('lessons')
        .select(columns)
        .eq('course_ref_id', courseRefId)
        .eq('profile_id', profileId)
        .eq('lesson_id', lessonId)
    )
    
    if (error) {
      throw new Error(error.message)
    }
    
    return { data, count: data ? 1 : 0 }
  }
}

/**
 * Supabase mutation helper
 * Provides optimistic updates and cache invalidation
 */
export function useSupabaseMutation(table, options = {}) {
  const { onSuccess, onError, invalidateKeys = [] } = options

  const mutateFn = async (operation, data, optimisticData) => {
    try {
      // Optimistic update if provided
      if (optimisticData && invalidateKeys.length > 0) {
        invalidateKeys.forEach(key => {
          mutate(key, optimisticData, false)
        })
      }

      let result
      switch (operation) {
        case 'insert':
          result = await supabase.from(table).insert(data).select()
          break
        case 'update':
          result = await supabase.from(table).update(data.values).eq('id', data.id).select()
          break
        case 'delete':
          result = await supabase.from(table).delete().eq('id', data.id)
          break
        case 'upsert':
          result = await supabase.from(table).upsert(data).select()
          break
        default:
          throw new Error(`Unknown operation: ${operation}`)
      }

      if (result.error) {
        throw new Error(result.error.message)
      }

      // Invalidate related cache keys
      invalidateKeys.forEach(key => {
        mutate(key)
      })

      if (onSuccess) {
        onSuccess(result.data)
      }

      return result.data
    } catch (error) {
      // Revert optimistic update on error
      if (optimisticData && invalidateKeys.length > 0) {
        invalidateKeys.forEach(key => {
          mutate(key)
        })
      }

      if (onError) {
        onError(error)
      }

      throw error
    }
  }

  return { mutate: mutateFn }
}

/**
 * Authentication state hook
 */
export function useAuthSession() {
  const fetcher = async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      throw new Error(error.message)
    }
    
    return { data: session, count: session ? 1 : 0 }
  }

  return useSupabaseQuery('auth-session', fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 5 * 60 * 1000 // 5 minutes
  })
}

/**
 * Error boundary for Supabase operations
 */
export function handleSupabaseError(error) {
  console.error('Supabase Error:', error)
  
  // Handle specific error types
  if (error.message?.includes('JWT')) {
    // Handle authentication errors
    window.location.href = '/auth/login'
    return
  }
  
  if (error.message?.includes('RLS')) {
    // Handle Row Level Security errors
    return 'You do not have permission to access this data'
  }
  
  if (error.message?.includes('duplicate key')) {
    return 'This record already exists'
  }
  
  if (error.message?.includes('foreign key')) {
    return 'Cannot delete: this record is referenced by other data'
  }
  
  // Return generic error message
  return error.message || 'An unexpected error occurred'
}