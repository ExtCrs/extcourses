// hooks/auth/useAuth.js
// Centralized authentication state management with SWR

import { useSupabaseQuery, createSupabaseFetcher } from '@/hooks/common'
import { AUTH_KEYS } from '@/hooks/common'
import { supabase } from '@/lib/supabase/client'
import { useMemo } from 'react'

/**
 * Authentication hook with SWR integration
 * Provides centralized auth state management, auto-refresh, and logout handling
 */
export function useAuth() {
  // Session fetcher
  const sessionFetcher = createSupabaseFetcher.custom(async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      throw new Error(error.message)
    }
    
    return { data: session, count: session ? 1 : 0 }
  })

  // Get session data with SWR
  const {
    data: session,
    error: sessionError,
    isLoading: sessionLoading,
    mutate: mutateSession
  } = useSupabaseQuery(
    AUTH_KEYS.session(),
    sessionFetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 5 * 60 * 1000, // Refresh every 5 minutes
      dedupingInterval: 1000 // Dedupe for 1 second
    }
  )

  // User data fetcher (only if session exists)
  const userFetcher = createSupabaseFetcher.custom(async () => {
    if (!session?.user?.id) {
      return { data: null, count: 0 }
    }

    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      throw new Error(error.message)
    }
    
    return { data: user, count: user ? 1 : 0 }
  })

  // Get user data with SWR (dependent on session)
  const {
    data: user,
    error: userError,
    isLoading: userLoading,
    mutate: mutateUser
  } = useSupabaseQuery(
    session ? `auth-user-${session.user.id}` : null,
    userFetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 10 * 60 * 1000 // Refresh every 10 minutes
    }
  )

  // Authentication state computations
  const authState = useMemo(() => {
    const isAuthenticated = !!(session && user)
    const isLoading = sessionLoading || (session && userLoading)
    const error = sessionError || userError

    return {
      isAuthenticated,
      isLoading,
      error,
      session,
      user,
      // User properties for convenience
      userId: user?.id || null,
      email: user?.email || null,
      metadata: user?.user_metadata || {},
      // Session properties
      accessToken: session?.access_token || null,
      refreshToken: session?.refresh_token || null,
      expiresAt: session?.expires_at || null,
      isExpired: session ? Date.now() / 1000 > session.expires_at : false
    }
  }, [session, user, sessionLoading, userLoading, sessionError, userError])

  // Authentication actions
  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      // Refresh auth state
      await mutateSession()
      if (data.session) {
        await mutateUser()
      }

      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const signUp = async (email, password, options = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options
      })

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()

      if (error) throw error

      // Clear auth state
      await mutateSession(null, false)
      await mutateUser(null, false)

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const resetPassword = async (email, options = {}) => {
    try {
      // First, check if the email exists in the profiles table
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .single()
      
      if (checkError && checkError.code === 'PGRST116') {
        // User not found
        throw new Error('The email address you entered is not found in the system')
      }
      
      if (checkError) {
        // Other database error
        throw checkError
      }
      
      // User exists, proceed with password recovery
      if (existingUser) {
        // Use NEXT_PUBLIC_SITE_URL if set in production, otherwise use current domain
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')
        
        // Default language if not specified
        const lang = options.lang || 'ru'
        
        const resetOptions = {
          redirectTo: `${siteUrl}/${lang}/auth/reset-password`,
          emailRedirectTo: `${siteUrl}/${lang}/auth/reset-password`,
          data: {
            lang: lang // Pass language to email template
          },
          ...options
        }
        
        const { error } = await supabase.auth.resetPasswordForEmail(email, resetOptions)

        if (error) throw error
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const updatePassword = async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const updateProfile = async (updates) => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: updates
      })

      if (error) throw error

      // Refresh user data
      await mutateUser()

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()

      if (error) throw error

      // Update cache with new session
      await mutateSession()
      
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Manual refresh functions
  const refresh = async () => {
    await Promise.all([
      mutateSession(),
      mutateUser()
    ])
  }

  return {
    // State
    ...authState,
    
    // Actions
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshSession,
    refresh,
    
    // Cache control
    mutateSession,
    mutateUser
  }
}

/**
 * Hook for authentication state only (without user data)
 * Lighter weight version for components that only need auth status
 */
export function useAuthState() {
  const sessionFetcher = createSupabaseFetcher.custom(async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      throw new Error(error.message)
    }
    
    return { data: session, count: session ? 1 : 0 }
  })

  const {
    data: session,
    error,
    isLoading,
    mutate
  } = useSupabaseQuery(
    AUTH_KEYS.session(),
    sessionFetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 5 * 60 * 1000
    }
  )

  return {
    isAuthenticated: !!session,
    isLoading,
    error,
    session,
    userId: session?.user?.id || null,
    refresh: mutate
  }
}