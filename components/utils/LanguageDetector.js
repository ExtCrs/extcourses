'use client'

import { useEffect, useState } from 'react'
import { getUserPreferredLanguage } from '@/lib/utils/languageDetection'

/**
 * Client-side language detection and redirect component
 * Detects browser language and redirects to appropriate language route
 */
export default function LanguageDetector() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return

    // Small delay to ensure proper hydration
    const timer = setTimeout(() => {
      try {
        // Detect preferred language
        const preferredLang = getUserPreferredLanguage()
        
        // Redirect to the detected language
        // Use replace to avoid adding to browser history
        window.location.replace(`/${preferredLang}`)
      } catch (error) {
        // Fallback to Russian if detection fails
        console.warn('Language detection failed, falling back to Russian:', error)
        window.location.replace('/ru')
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  // Show a simple loading state while detecting language
  // Also provide manual links as fallback for users with JS disabled
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="loading loading-spinner loading-lg mb-4"></div>
        <p className="text-base-content/70 mb-6">Detecting language...</p>
        
        {/* Fallback links for users with JavaScript disabled */}
        <div className="flex gap-4 justify-center">
          <a 
            href="/ru" 
            className="btn btn-outline"
            onClick={(e) => {
              e.preventDefault()
              window.location.replace('/ru')
            }}
          >
            Русский
          </a>
          <a 
            href="/en" 
            className="btn btn-outline"
            onClick={(e) => {
              e.preventDefault()
              window.location.replace('/en')
            }}
          >
            English
          </a>
        </div>
        
        <noscript>
          <div className="mt-4 p-4 bg-warning/20 rounded-lg">
            <p className="text-sm text-warning-content">
              JavaScript is disabled. Please choose your language:
            </p>
            <div className="flex gap-4 justify-center mt-2">
              <a href="/ru" className="btn btn-sm btn-outline">Русский</a>
              <a href="/en" className="btn btn-sm btn-outline">English</a>
            </div>
          </div>
        </noscript>
      </div>
    </div>
  )
}