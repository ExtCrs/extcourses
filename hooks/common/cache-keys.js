// hooks/common/cache-keys.js
// Centralized cache key management for SWR hooks

/**
 * Cache key generators for different data types
 * Following the pattern: type-identifier-filters-context
 */

// Authentication cache keys
export const AUTH_KEYS = {
  session: () => 'auth-session',
  profile: (userId) => `profile-${userId}`,
  authState: () => 'auth-state'
}

// User management cache keys
export const USER_KEYS = {
  list: (page, search, roleFilter, orgId) => {
    const filters = [
      page && `page-${page}`,
      search && `search-${search}`,
      roleFilter && roleFilter !== 'all' && `role-${roleFilter}`,
      orgId && `org-${orgId}`
    ].filter(Boolean).join('-')
    return `users-${filters || 'all'}`
  },
  detail: (userId) => `user-${userId}`,
  courses: (userId) => `user-courses-${userId}`,
  students: (page, search, orgId) => {
    const filters = [
      page && `page-${page}`,
      search && `search-${search}`,
      orgId && `org-${orgId}`
    ].filter(Boolean).join('-')
    return `students-${filters || 'all'}`
  }
}

// Course management cache keys
export const COURSE_KEYS = {
  list: (page, filters, orgId) => {
    const filterStr = [
      page && `page-${page}`,
      filters && Object.entries(filters).map(([k, v]) => `${k}-${v}`).join('-'),
      orgId && `org-${orgId}`
    ].filter(Boolean).join('-')
    return `courses-${filterStr || 'all'}`
  },
  detail: (courseId, userId) => `course-${courseId}-${userId || 'guest'}`,
  stats: (courseId, userId, date) => `course-stats-${courseId}-${userId}-${date || 'current'}`,
  table: (page, filters, orgId) => {
    const filterStr = [
      page && `page-${page}`,
      filters && Object.entries(filters).map(([k, v]) => `${k}-${v}`).join('-'),
      orgId && `org-${orgId}`
    ].filter(Boolean).join('-')
    return `courses-table-${filterStr || 'all'}`
  }
}

// Lesson management cache keys
export const LESSON_KEYS = {
  list: (courseRefId, profileId) => `lessons-${courseRefId}-${profileId}`,
  detail: (courseRefId, profileId, lessonId) => `lesson-${courseRefId}-${profileId}-${lessonId}`,
  map: (courseRefId, profileId) => `lessons-map-${courseRefId}-${profileId}`,
  progress: (courseId, userId) => `lesson-progress-${courseId}-${userId}`
}

// Organization cache keys
export const ORG_KEYS = {
  active: () => 'orgs-active',
  list: () => 'orgs-list',
  detail: (orgId) => `org-${orgId}`,
  map: () => 'orgs-map'
}

// Statistics cache keys
export const STATS_KEYS = {
  course: (courseId, type, date) => `stats-course-${courseId}-${type}-${date || 'current'}`,
  user: (userId, type, date) => `stats-user-${userId}-${type}-${date || 'current'}`,
  org: (orgId, type, date) => `stats-org-${orgId}-${type}-${date || 'current'}`
}

/**
 * Cache invalidation patterns
 * Used for mutate operations to invalidate related cache entries
 */
export const INVALIDATION_PATTERNS = {
  // Invalidate all user-related caches
  users: () => (key) => typeof key === 'string' && key.startsWith('users-'),
  
  // Invalidate specific user caches
  user: (userId) => (key) => typeof key === 'string' && 
    (key.startsWith(`user-${userId}`) || key.startsWith(`profile-${userId}`)),
  
  // Invalidate all course-related caches
  courses: () => (key) => typeof key === 'string' && key.startsWith('courses-'),
  
  // Invalidate specific course caches
  course: (courseId) => (key) => typeof key === 'string' && key.includes(`course-${courseId}`),
  
  // Invalidate all lesson-related caches
  lessons: () => (key) => typeof key === 'string' && key.startsWith('lessons-'),
  
  // Invalidate specific lesson caches
  lesson: (courseRefId, profileId) => (key) => typeof key === 'string' && 
    key.includes(`${courseRefId}-${profileId}`),
  
  // Invalidate organization caches
  orgs: () => (key) => typeof key === 'string' && key.startsWith('orgs-'),
  
  // Invalidate auth caches
  auth: () => (key) => typeof key === 'string' && 
    (key.startsWith('auth-') || key.startsWith('profile-'))
}

/**
 * Utility function to generate cache keys with consistent format
 */
export function createCacheKey(type, ...parts) {
  const cleanParts = parts.filter(part => part !== null && part !== undefined && part !== '')
  return `${type}-${cleanParts.join('-')}`
}

/**
 * Extract components from cache key for debugging
 */
export function parseCacheKey(key) {
  if (typeof key !== 'string') return null
  
  const parts = key.split('-')
  if (parts.length < 2) return null
  
  return {
    type: parts[0],
    identifier: parts[1],
    filters: parts.slice(2)
  }
}