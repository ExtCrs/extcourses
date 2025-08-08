'use client'

import React, { useRef, useEffect, useState } from 'react'
import { getTranslations } from '@/lib/i18n'
import { supabase } from '@/lib/supabase/client'
// import coursesData from '@/data/courses.json' // подключи если надо

const allowedToSignUpStates = ['Completed', 'ResignNeeded', 'AllCoursesDone']

const SignUpModal = ({ open, onClose, courseId, courseTitle, lang }) => {
  const modalRef = useRef(null)
  const { t } = getTranslations(lang, 'courses')
  const statusTexts = t.status_recommendations || {}

  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [activeCourse, setActiveCourse] = useState(null)
  const [currentOrgId, setCurrentOrgId] = useState(null)

  useEffect(() => {
    if (open) {
      setSuccess(false)
      setErrorMsg('')
      setLoading(false)
      setActiveCourse(null)
      setCurrentOrgId(null)
      modalRef.current?.showModal()
      checkStudentCourse()
    } else {
      modalRef.current?.close()
    }
    // eslint-disable-next-line
  }, [open, courseId, courseTitle])

  const checkStudentCourse = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        setErrorMsg(t.courses.signup_modal_auth_error)
        return
      }
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('current_org_id')
        .eq('id', user.id)
        .single()
      if (profileError || !profile?.current_org_id) {
        setErrorMsg(t.courses.signup_modal_profile_error)
        return
      }
      setCurrentOrgId(profile.current_org_id)
      const { data: studentCourses, error: coursesError } = await supabase
        .from('courses')
        .select('id, course_id, state')
        .eq('student_id', user.id)
        .eq('org_id', profile.current_org_id)

      if (coursesError) {
        setErrorMsg(t.courses.signup_modal_unexpected_error)
        return
      }
      const foundActive = studentCourses?.find(c => !allowedToSignUpStates.includes(c.state))
      if (foundActive) {
        setActiveCourse(foundActive)
      }
    } catch (e) {
      setErrorMsg(t.courses.signup_modal_unexpected_error)
    }
  }

  const handleClose = () => {
    modalRef.current?.close()
    if (onClose) onClose()
  }

  const handleConfirm = async () => {
    setLoading(true)
    setErrorMsg('')

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        setErrorMsg(t.courses.signup_modal_auth_error)
        setLoading(false)
        return
      }
      if (!currentOrgId) {
        setErrorMsg(t.courses.signup_modal_profile_error)
        setLoading(false)
        return
      }
      const { data: studentCourses, error: coursesError } = await supabase
        .from('courses')
        .select('id, course_id, state')
        .eq('student_id', user.id)
        .eq('org_id', currentOrgId)

      if (coursesError) {
        setErrorMsg(t.courses.signup_modal_unexpected_error)
        setLoading(false)
        return
      }
      const foundActive = studentCourses?.find(c => !allowedToSignUpStates.includes(c.state))
      if (foundActive) {
        setActiveCourse(foundActive)
        setErrorMsg(t.courses.signup_modal_already_active_course)
        setLoading(false)
        return
      }

      const { error: insertError } = await supabase
        .from('courses')
        .insert([{
          course_id: courseId,
          org_id: currentOrgId,
          student_id: user.id,
          state: 'SignUp'
        }])
      if (insertError) {
        setErrorMsg(insertError.message || t.courses.signup_modal_insert_error)
        setLoading(false)
        return
      }
      setSuccess(true)
      setLoading(false)
    } catch (e) {
      setErrorMsg(t.courses.signup_modal_unexpected_error)
      setLoading(false)
    }
  }

  // Если подключён coursesData, можешь вернуть название курса по id
  const getCourseTitleById = id => {
    // const course = coursesData.find(c => c.id == id || c.course_id == id)
    // return course ? (lang === 'en' ? course.title_en : course.title_ru) : ''
    return '' // Пока всегда пусто
  }

  const showConfirmButton = !success && !activeCourse

  return (
    <dialog ref={modalRef} id="signup_modal" className="modal">
      <div className="modal-box ring ring-secondary/30">
        <h3 className="font-black text-lg mb-2 uppercase">
          {t.courses.signup_modal_title}
          <span className="font-black pl-2 text-sm text-base-conent/60 block border-l-2 py-1 border-secondary">{courseTitle ? ' ' + courseTitle.toUpperCase() : ''}</span>
        </h3>
        <div className="mb-4">
          {activeCourse ? (
            <>
              <span className="text-error font-semibold">
                {t.courses.signup_modal_already_active_course}
              </span>
              {/* Если когда-то подключишь coursesData, выведи здесь название */}
              {getCourseTitleById(activeCourse.course_id) && (
                <div className="font-semibold mt-2">
                  {t.courses.current_course}: {getCourseTitleById(activeCourse.course_id)}
                </div>
              )}
              <div className="mt-2 text-secondary text-sm italic">
                {statusTexts[activeCourse.state]}
              </div>
            </>
          ) : (
            <>
              <span>
                {success
                  ? t.courses.signup_modal_success
                  : t.courses.signup_modal_text}
              </span>
              <div className="font-semibold mt-2">
                {courseTitle
                  ? courseTitle
                  : <span className="text-error">[нет данных о курсе]</span>}
              </div>
              {success && (
                <div className="mt-2 text-success font-medium">
                  {t.courses.signup_modal_pay_recommend}
                </div>
              )}
            </>
          )}
        </div>
        {errorMsg && (
          <div className="mb-2 text-error font-medium">
            {errorMsg}
          </div>
        )}
        <div className="modal-action flex gap-2">
          <button
            className="btn btn-outline"
            onClick={handleClose}
            type="button"
            autoFocus={showConfirmButton}
          >
            {t.courses.signup_modal_close}
          </button>
          {showConfirmButton && (
            <button
              className="btn btn-primary"
              onClick={handleConfirm}
              type="button"
              disabled={loading}
            >
              {loading ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                t.courses.signup_modal_confirm
              )}
            </button>
          )}
        </div>
      </div>
      <form method="dialog" className="modal-backdrop" onClick={handleClose}>
        <button tabIndex={-1} />
      </form>
    </dialog>
  )
}

export default SignUpModal