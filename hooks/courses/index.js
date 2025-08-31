// hooks/courses/index.js
// Course management hooks exports

export { 
  useCourses, 
  useCoursesMetadata, 
  useCourseEnrollments, 
  useCoursesStats,
  useAvailableCourses 
} from './useCourses.js'

export { 
  useCourseDetails, 
  useCurrentCourseDetails, 
  useCurrentActiveCourse, 
  useCourseAssignment 
} from './useCourseDetails.js'

export { 
  useCoursesTable, 
  useCourseEnrollmentSummary 
} from './useCoursesTable.js'

export { 
  useCourseStats, 
  useCoursePerformance 
} from './useCourseStats.js'