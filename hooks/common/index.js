// hooks/common/index.js
// Centralized exports for common hook utilities

// Cache management
export * from './cache-keys.js'

// Base Supabase operations
export {
  useSupabaseQuery,
  createSupabaseFetcher,
  useSupabaseMutation,
  useAuthSession,
  handleSupabaseError,
  safeSingleQuery
} from './useSupabaseQuery.js'

// Pagination and data management
export {
  usePagination,
  generatePaginationRange,
  useSearch,
  useFilters,
  useSelection,
  useSorting
} from './usePagination.js'