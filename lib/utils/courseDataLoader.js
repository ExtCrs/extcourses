// lib/utils/courseDataLoader.js
// Utility for loading course data with multilingual fallback support

/**
 * Loads course data based on language with fallback to Russian
 * @param {string} lang - Language code ('ru' or 'en')
 * @returns {Promise<Array>} Course data array
 */
export async function loadCoursesData(lang = 'ru') {
  try {
    if (lang === 'en') {
      try {
        // Try to load English data first
        const coursesEn = await import('@/data/courses_en.json')
        if (coursesEn.default && Array.isArray(coursesEn.default) && coursesEn.default.length > 0) {
          return coursesEn.default
        }
      } catch (error) {
        // English data not available, fallback to Russian
        console.warn('English course data not available, falling back to Russian data')
      }
    }
    
    // Load Russian data (fallback for both 'ru' and when 'en' is not available)
    const coursesRu = await import('@/data/courses_ru.json')
    return coursesRu.default || []
    
  } catch (error) {
    console.error('Error loading course data:', error)
    return []
  }
}

/**
 * Synchronously loads course data (for components that need immediate access)
 * Note: This will always load Russian data as fallback since dynamic imports are async
 * @param {string} lang - Language code ('ru' or 'en')
 * @returns {Array} Course data array
 */
export function loadCoursesDataSync(lang = 'ru') {
  try {
    // For now, always load Russian data synchronously
    // TODO: Implement proper async loading pattern in components
    const coursesRu = require('@/data/courses_ru.json')
    return coursesRu || []
  } catch (error) {
    console.error('Error loading course data synchronously:', error)
    return []
  }
}

/**
 * Gets course title with language fallback
 * @param {Object} course - Course object
 * @param {string} lang - Language code
 * @returns {string} Course title
 */
export function getCourseTitle(course, lang = 'ru') {
  if (!course) return ''
  
  // For now, just return the title field since we've unified the structure
  return course.title || course.id?.toString() || ''
}

/**
 * Gets course intro with language fallback
 * @param {Object} course - Course object
 * @param {string} lang - Language code
 * @returns {string} Course intro
 */
export function getCourseIntro(course, lang = 'ru') {
  if (!course) return ''
  
  return course.intro || ''
}

/**
 * Gets course description with language fallback
 * @param {Object} course - Course object
 * @param {string} lang - Language code
 * @returns {string} Course description
 */
export function getCourseDescription(course, lang = 'ru') {
  if (!course) return ''
  
  return course.description || ''
}