'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { loadCoursesData } from '@/lib/utils/courseDataLoader'
import { getTranslations } from '@/lib/i18n'

// Статусы активных курсов
const ACTIVE_STATES = ['SignUp', 'PaidConfirm', 'Started', 'Bugged', 'AccountedFor']

const CourseStats = ({ lang = 'ru', IsInside = false }) => {
  const { t } = getTranslations(lang, 'courses')

  const [loading, setLoading] = useState(true)
  const [course, setCourse] = useState(null)
  const [courseInfo, setCourseInfo] = useState(null)
  const [lessons, setLessons] = useState([])
  const [daysFromStart, setDaysFromStart] = useState(null)
  const [startedAt, setStartedAt] = useState(null)
  const [finishedAt, setFinishedAt] = useState(null)
  const [coursesData, setCoursesData] = useState([])

  const formatDate = (date, lang) => {
    if (!(date instanceof Date) || isNaN(date)) return null

    const day = String(date.getDate()).padStart(2, '0')
    const monthFormatter = new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-US', {
      month: 'short'
    })
    const month = monthFormatter.format(date).replace('.', '')
    const year = String(date.getFullYear()).slice(2)

    return `${day} ${month}'${year}`
  }

  useEffect(() => {
    const fetchCourseStats = async () => {
      setLoading(true)
      
      // Load course data based on language first
      const courses = await loadCoursesData(lang)
      setCoursesData(courses)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return setLoading(false)

      const { data: userCourses } = await supabase
        .from('courses')
        .select('*')
        .eq('student_id', session.user.id)
        .order('created_at', { ascending: false })

      if (!userCourses || userCourses.length === 0) return setLoading(false)

      const currentCourse = userCourses.find(c => ACTIVE_STATES.includes(c.state))
      if (!currentCourse) return setLoading(false)

      setCourse(currentCourse)

      const courseMeta = courses.find(c => String(c.id) === String(currentCourse.course_id))
      setCourseInfo(courseMeta)

      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_ref_id', currentCourse.id)
        .order('lesson_id', { ascending: true })

      setLessons(lessonsData || [])

      if (currentCourse.created_at) {
        const created = new Date(currentCourse.created_at)
        const today = new Date()
        const diffDays = Math.floor((today - created) / (1000 * 60 * 60 * 24))
        setDaysFromStart(diffDays)
        // setStartedAt(created.toLocaleDateString(lang))
        if (currentCourse.created_at) {
          const created = new Date(currentCourse.created_at)
          setStartedAt(created)
        }
      }

      const completedLesson = lessonsData.find(lesson => lesson.status === 'done' || lesson.status === 'accepted')
      if (currentCourse.created_at) {
        setStartedAt(new Date(currentCourse.created_at))
      }

      if (currentCourse.state === 'Completed' && currentCourse.updated_at) {
        setFinishedAt(new Date(currentCourse.updated_at))
      } else {
        setFinishedAt(null)
      }

      setLoading(false)
    }

    fetchCourseStats()
  }, [lang])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <span className="loading loading-infinity loading-md" />
      </div>
    )
  }

  if (!course || !courseInfo) {
    return (
      <div className="stats bg-base-300 ring-1 ring-primary/30 stats-vertical">
        <div className="stat flex items-center">
          <div className="avatar avatar-placeholder animate-pulse">
            <div className="w-16 rounded-full">
              <span className="text-6xl">🌞</span>
            </div>
          </div>
          <div className="stat-desc text-lg text-base-content/60">
            {t.courses.lets_signup}
          </div>
        </div>
      </div>
    )
  }

  // Определяем текущий урок
  const currentLesson = lessons.find(lesson => lesson.status === 'in_progress')
  const currentLessonNo = currentLesson?.lesson_id || '👇'

  // Уроки
  const totalLessons = courseInfo.total_lessons || lessons.length
  const completedLessons = lessons.filter(
    l => l.status === 'accepted' || l.status === 'done'
  ).length
  const percentLessonsDone = totalLessons > 0
    ? ((completedLessons / totalLessons) * 100).toFixed(2)
    : '0.00'

  // Задания
  const totalTasks = courseInfo.total_tasks || 0
  let completedTasks = 0
  lessons.forEach(lesson => {
    try {
      const answers = Array.isArray(lesson.answers) ? lesson.answers : []
      completedTasks += answers.filter(a => a.status === 'accepted' || a.status === 'done').length
    } catch(e) {
      console.error('Error processing lesson answers:', e);
    }
  })

  const remainingTasks = totalTasks - completedTasks

  const imgSrc = `/images/courses/ec-${courseInfo.id}.png`
  const courseTitle = courseInfo.title

  return (
    <>
    {
      IsInside
      ? <div className="flex flex-col gap-2 items-center">
          <div className="avatar relative h-36 w-36">
            <div className="radial-progress absolute -left-[3px] -top-[3px] text-info"
              style={{ "--value": percentLessonsDone, "--size": "9.4rem", "--thickness": "3px" } /* as React.CSSProperties */ } 
              aria-valuenow={70} role="progressbar">
            </div>
            <div className="mask mask-circle w-36 h-36 absolute">
              <img src={imgSrc} alt={courseTitle} />
            </div>
          </div>
          <div className="stats stats-vertical text-center">
            <div className="stat">
              <div className="stat-title">{t.courses.progress}</div>
              <div className="stat-value">{percentLessonsDone}%</div>
              <div className="stat-desc font-bold">
                {remainingTasks} <span className="font-normal">{t.courses.tasks_remaining}</span>
              </div>
            </div>
            <div className="stat">
              <div className="stat-title">{t.courses.days_from_start}</div>
              <div className="stat-value">{daysFromStart}</div>
              <div className="stat-desc">
                {startedAt ? formatDate(startedAt, lang) : '...'} – {finishedAt ? formatDate(finishedAt, lang) : t.courses.lessonStatuses.in_progress}
              </div>
            </div>
          </div>
        </div>
      :
        <div className="stats ring-1 ring-primary/30 stats-vertical md:stats-horizontal grow lg:grow-0 lg:w-full flex flex-col sm:flex-row">
          <div className="stat">
            <div className="stat-figure text-secondary">
              <div className="avatar avatar-online">
                <div className="mask mask-circle w-24 h-24">
                  <img src={imgSrc} alt={courseTitle} />
                </div>
              </div>
            </div>
            <div className="stat-title text-center">{t.courses.lesson}</div>
            <div className="stat-actions flex flex-col">
              <div className="stat-value justify-center flex animate-bounce pt-2">{currentLessonNo}</div>
              <Link 
                className="btn btn-xs btn-primary"
                href={`/${lang}/courses/current`}
              >
                {t.courses.view}
              </Link>
            </div>
          </div>
          <div className="stat text-center md:text-left">
            <div className="stat-title">{t.courses.progress}</div>
            <div className="stat-value">{percentLessonsDone}%</div>
            <div className="stat-desc font-bold">
              {remainingTasks} <span className="font-normal">{t.courses.tasks_remaining}</span>
            </div>
          </div>
          <div className="stat text-center md:text-left">
            <div className="stat-title">{t.courses.days_from_start}</div>
            <div className="stat-value">{daysFromStart}</div>
            <div className="stat-desc">
              {startedAt ? formatDate(startedAt, lang) : '...'} – {finishedAt ? formatDate(finishedAt, lang) : t.courses.lessonStatuses.in_progress}
            </div>
          </div>
        </div>
    }
    </>
  )
}

export default CourseStats