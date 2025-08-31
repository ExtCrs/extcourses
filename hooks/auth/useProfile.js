// hooks/auth/useProfile.js
// Current user profile management with SWR

import { useSupabaseQuery, createSupabaseFetcher, useSupabaseMutation } from '@/hooks/common'
import { AUTH_KEYS, USER_KEYS, INVALIDATION_PATTERNS } from '@/hooks/common'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './useAuth.js'
import useSWR, { mutate } from 'swr'

/**
 * Profile hook for current user profile management
 * Provides profile data, role information, and update capabilities
 */
export function useProfile() {
  const { userId, isAuthenticated } = useAuth()

  // Profile fetcher
  const profileFetcher = createSupabaseFetcher.custom(async () => {
    if (!userId) {
      return { data: null, count: 0 }
    }

    const { data, error } = await supabase
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
      `)
      .eq('id', userId)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return { data, count: data ? 1 : 0 }
  })

  // Get profile data with SWR
  const {
    data: profile,
    error,
    isLoading,
    mutate: mutateProfile
  } = useSupabaseQuery(
    isAuthenticated && userId ? AUTH_KEYS.profile(userId) : null,
    profileFetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 30 * 60 * 1000, // Refresh every 30 minutes
      dedupingInterval: 5000
    }
  )

  // Organization data fetcher (if profile has current_org_id)
  const orgFetcher = createSupabaseFetcher.byId('orgs', profile?.current_org_id, 'id, name_ru, name_en')

  const {
    data: organization,
    error: orgError,
    isLoading: orgLoading,
    mutate: mutateOrg
  } = useSupabaseQuery(
    profile?.current_org_id ? `org-${profile.current_org_id}` : null,
    orgFetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 60 * 60 * 1000 // Refresh every hour
    }
  )

  // Profile mutation hook
  const { mutate: updateProfileMutation } = useSupabaseMutation('profiles', {
    invalidateKeys: [
      AUTH_KEYS.profile(userId),
      USER_KEYS.detail(userId)
    ],
    onSuccess: () => {
      mutateProfile()
    }
  })

  // Profile update actions
  const updateProfile = async (updates) => {
    if (!userId || !profile) {
      return { success: false, error: 'User not authenticated or profile not loaded' }
    }

    try {
      // Optimistic update
      const optimisticProfile = { ...profile, ...updates }
      mutateProfile({ data: optimisticProfile, count: 1 }, false)

      // Perform update
      await updateProfileMutation('update', {
        id: userId,
        values: updates
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const switchOrganization = async (orgId) => {
    if (!userId) {
      return { success: false, error: 'User not authenticated' }
    }

    try {
      await updateProfile({ current_org_id: orgId })
      
      // Invalidate organization-related caches
      mutate(
        (key) => typeof key === 'string' && key.includes(`org-${profile?.current_org_id}`),
        undefined,
        { revalidate: false }
      )

      // Fetch new organization data
      if (orgId) {
        await mutateOrg()
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const updatePersonalInfo = async (personalData) => {
    const allowedFields = ['full_name', 'phone']
    const filteredData = Object.keys(personalData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = personalData[key]
        return obj
      }, {})

    return updateProfile(filteredData)
  }

  // Role and permission helpers
  const hasRole = (role) => profile?.role === role
  const hasAnyRole = (roles) => roles.includes(profile?.role)
  const isAdmin = () => profile?.role === 'admin'
  const isSupervisor = () => profile?.role === 'supervisor'
  const isStudent = () => profile?.role === 'public'
  const isActive = () => profile?.active === true

  // Permission checks
  const canManageUsers = () => isAdmin()
  const canManageCourses = () => isAdmin() || isSupervisor()
  const canViewStats = () => isAdmin() || isSupervisor()
  const canAssignCourses = () => isAdmin() || isSupervisor()

  const refresh = async () => {
    await Promise.all([
      mutateProfile(),
      organization && mutateOrg()
    ].filter(Boolean))
  }

  return {
    // Profile data
    profile,
    organization,
    isLoading: isLoading || orgLoading,
    error: error || orgError,

    // User properties
    userId,
    email: profile?.email,
    fullName: profile?.full_name,
    phone: profile?.phone,
    role: profile?.role,
    isActive: profile?.active,
    currentOrgId: profile?.current_org_id,

    // Organization properties
    orgName: {
      ru: organization?.name_ru,
      en: organization?.name_en
    },

    // Role checks
    hasRole,
    hasAnyRole,
    isAdmin,
    isSupervisor,
    isStudent,
    isActive,

    // Permission checks
    canManageUsers,
    canManageCourses,
    canViewStats,
    canAssignCourses,

    // Actions
    updateProfile,
    updatePersonalInfo,
    switchOrganization,
    refresh,

    // Cache control
    mutateProfile,
    mutateOrg
  }
}

/**
 * Hook to get profile data for any user (admin/supervisor use)
 */
export function useUserProfile(targetUserId) {
  const { isAdmin, isSupervisor } = useProfile()
  const canView = isAdmin || isSupervisor

  const profileFetcher = createSupabaseFetcher.byId('profiles', targetUserId, `
    id,
    email,
    full_name,
    phone,
    current_org_id,
    role,
    active,
    created_at
  `)

  const {
    data: profile,
    error,
    isLoading,
    mutate
  } = useSupabaseQuery(
    canView && targetUserId ? USER_KEYS.detail(targetUserId) : null,
    profileFetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 0 // No auto-refresh for other users' profiles
    }
  )

  return {
    profile,
    error,
    isLoading,
    refresh: mutate,
    canView
  }
}