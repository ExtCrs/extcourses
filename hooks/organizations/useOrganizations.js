// hooks/organizations/useOrganizations.js
// Organization management hooks

import { useSupabaseQuery, createSupabaseFetcher } from '@/hooks/common'
import { ORG_KEYS } from '@/hooks/common'
import { supabase } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/auth'

/**
 * Hook for organization management
 */
export function useOrganizations() {
  const { canManageUsers } = useProfile()

  const orgsFetcher = createSupabaseFetcher.select('orgs', 'id, name_ru, name_en, active')

  const {
    data: organizations,
    error,
    isLoading,
    mutate
  } = useSupabaseQuery(
    canManageUsers ? ORG_KEYS.list() : null,
    orgsFetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 60 * 60 * 1000 // Refresh every hour
    }
  )

  return {
    organizations: organizations || [],
    isLoading,
    error,
    refresh: mutate,
    canManageUsers
  }
}