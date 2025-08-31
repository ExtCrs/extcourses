// hooks/common/SWRProvider.js
// SWR Provider with global configuration for the application

'use client'

import { SWRConfig } from 'swr'
import { handleSupabaseError } from './useSupabaseQuery.js'

/**
 * Global SWR configuration for the application
 */
const SWR_CONFIG = {
  // Default options for all SWR hooks
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  revalidateIfStale: true,
  refreshInterval: 0, // No automatic refresh by default
  dedupingInterval: 2000, // 2 seconds deduplication
  
  // Error handling
  shouldRetryOnError: (error) => {
    // Don't retry on authentication errors
    if (error?.message?.includes('JWT') || error?.message?.includes('auth')) {
      return false
    }
    // Don't retry on 4xx errors (client errors)
    if (error?.status >= 400 && error?.status < 500) {
      return false
    }
    // Retry on network errors and 5xx errors
    return true
  },
  
  // Retry configuration
  errorRetryCount: 3,
  errorRetryInterval: 1000, // 1 second
  
  // Loading timeout
  loadingTimeout: 10000, // 10 seconds
  
  // Global error handler
  onError: (error, key) => {
    console.error('SWR Error:', { error, key })
    
    // Handle specific error types
    const errorMessage = handleSupabaseError(error)
    
    // You could integrate with a toast notification system here
    if (typeof window !== 'undefined' && window.showErrorToast) {
      window.showErrorToast(errorMessage)
    }
  },
  
  // Global success handler
  onSuccess: (data, key) => {
    // Success handler can be extended for analytics or notifications
    // Currently no logging needed
  },
  
  // Loading state handler
  onLoadingSlow: (key) => {
    // Slow loading handler can be extended for performance monitoring
    // Currently no logging needed
  },

  // Cache provider for custom storage
  provider: () => {
    // Use Map for in-memory cache (default)
    // Could be extended to use localStorage or sessionStorage
    return new Map()
  },

  // Compare function for data equality
  compare: (a, b) => {
    // Custom comparison for performance optimization
    if (a === b) return true
    if (!a || !b) return false
    
    // For arrays, compare length and reference
    if (Array.isArray(a) && Array.isArray(b)) {
      return a.length === b.length && a.every((item, index) => item === b[index])
    }
    
    // For objects, shallow comparison
    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a)
      const keysB = Object.keys(b)
      
      if (keysA.length !== keysB.length) return false
      
      return keysA.every(key => a[key] === b[key])
    }
    
    return false
  }
}

/**
 * SWR Provider component that wraps the application
 * Provides global configuration and context for all SWR hooks
 */
export function SWRProvider({ children, config = {} }) {
  const mergedConfig = {
    ...SWR_CONFIG,
    ...config
  }

  return (
    <SWRConfig value={mergedConfig}>
      {children}
    </SWRConfig>
  )
}

/**
 * Development tools for SWR debugging
 */
export function SWRDevTools() {
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  // This could be extended to include a visual cache inspector
  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 9999,
        fontFamily: 'monospace'
      }}
    >
      SWR Dev Mode
    </div>
  )
}

/**
 * Hook to access SWR cache programmatically
 * Useful for debugging and cache management
 */
export function useSWRCache() {
  if (process.env.NODE_ENV !== 'development') {
    return {}
  }

  const cache = new Map()
  
  return {
    getCache: () => cache,
    getCacheKeys: () => Array.from(cache.keys()),
    getCacheSize: () => cache.size,
    clearCache: () => cache.clear(),
    getCacheEntry: (key) => cache.get(key),
    removeCacheEntry: (key) => cache.delete(key)
  }
}