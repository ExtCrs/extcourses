'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import CurrentCourse from '@/components/displays/current_course/CurrentCourse'
import coursesList from '@/data/courses.json'

export default function CheckCourse({ studentId, lang, onClose }) {
  const [loading, setLoading] = useState(true)
  const [currentCourse, setCurrentCourse] = useState(null)
  const [courseInfo, setCourseInfo] = useState(null)
  const [student, setStudent] = useState(null)

  const [activeLesson, setActiveLesson] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('activeLesson');
      const num = Number(saved);
      return Number.isFinite(num) && num > 0 ? num : 1;
    }
    return 1;
  })

  useEffect(() => {
    async function load() {
      setLoading(true)

      // 🔍 Загружаем последний активный курс для проверки
      const { data: courses, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('student_id', studentId)
        .in('state', ['Started', 'Bugged', 'AccountedFor']) // ← только курсы в процессе выполнения
        .order('updated_at', { ascending: false })
        .limit(1)

      if (!courses || courses.length === 0) {
        setLoading(false)
        return
      }

      const course = courses[0]
      setCurrentCourse(course)

      // 👤 Получаем инфу о студенте
      const { data: studentData } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('id', studentId)
        .single()

      setStudent(studentData)

      // 📚 Данные курса из файла
      const courseInfoData = coursesList.find(c => c.id?.toString() === course.course_id?.toString())
      setCourseInfo(courseInfoData || null)

      setLoading(false)
    }

    load()
  }, [studentId])

  if (loading) {
    return (
      <div className="p-4">
        <span className="loading loading-infinity loading-lg" />
      </div>
    )
  }

  if (!currentCourse || !courseInfo) {
    return (
      <div className="alert alert-warning my-6">
        У студента нет курсов, доступных для проверки.
      </div>
    )
  }

  return (
    <div>
      <CurrentCourse
        lang={lang}
        currentCourse={currentCourse}
        courseInfo={courseInfo}
        user={{
          role: 'supervisor',
          full_name: 'Проверяющий',
        }}
        isSup={true}
        activeLesson={activeLesson}
        setActiveLesson={setActiveLesson}
      />
    </div>
  )
}