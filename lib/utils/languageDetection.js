// lib/utils/languageDetection.js
// Client-side browser language detection utility

// Supported languages in the application
const SUPPORTED_LANGUAGES = ['en', 'ru']
const DEFAULT_LANGUAGE = 'ru'

/**
 * Detect browser language and determine the best matching app language
 * @returns {string} 'en' | 'ru' - the detected language
 */
export function detectBrowserLanguage() {
  // Check if we're in browser environment
  if (typeof window === 'undefined') {
    return DEFAULT_LANGUAGE // Default fallback for SSR
  }

  try {
    // Get browser languages in order of preference
    const browserLanguages = navigator.languages || [navigator.language || navigator.userLanguage || DEFAULT_LANGUAGE]
    
    // Check for exact matches first
    for (const lang of browserLanguages) {
      const langCode = lang.toLowerCase().split('-')[0] // Extract primary language code
      
      if (SUPPORTED_LANGUAGES.includes(langCode)) {
        return langCode
      }
    }
    
    // Check for partial matches (e.g., 'en-US' -> 'en')
    for (const lang of browserLanguages) {
      const langCode = lang.toLowerCase()
      
      if (langCode.startsWith('en')) {
        return 'en'
      }
      if (langCode.startsWith('ru')) {
        return 'ru'
      }
    }
  } catch (error) {
    console.warn('Error detecting browser language:', error)
  }
  
  // Default to Russian if no match found
  return DEFAULT_LANGUAGE
}

/**
 * Get user's preferred language from localStorage or detect from browser
 * @returns {string} 'en' | 'ru'
 */
export function getUserPreferredLanguage() {
  if (typeof window === 'undefined') {
    return DEFAULT_LANGUAGE
  }

  try {
    // Check if user has a saved preference
    const savedLang = localStorage.getItem('preferredLanguage')
    if (SUPPORTED_LANGUAGES.includes(savedLang)) {
      return savedLang
    }

    // If no saved preference, detect from browser
    const detectedLang = detectBrowserLanguage()
    
    // Save the detected language for future visits
    localStorage.setItem('preferredLanguage', detectedLang)
    
    return detectedLang
  } catch (error) {
    console.warn('Error getting user preferred language:', error)
    return DEFAULT_LANGUAGE
  }
}

/**
 * Save user's language preference
 * @param {string} language - 'en' | 'ru'
 */
export function saveLanguagePreference(language) {
  if (typeof window === 'undefined') return
  
  try {
    if (SUPPORTED_LANGUAGES.includes(language)) {
      localStorage.setItem('preferredLanguage', language)
    }
  } catch (error) {
    console.warn('Error saving language preference:', error)
  }
}

/**
 * Check if a language is supported
 * @param {string} language - Language code to check
 * @returns {boolean}
 */
export function isSupportedLanguage(language) {
  return SUPPORTED_LANGUAGES.includes(language)
}

/**
 * Get the list of supported languages
 * @returns {string[]} Array of supported language codes
 */
export function getSupportedLanguages() {
  return [...SUPPORTED_LANGUAGES]
}