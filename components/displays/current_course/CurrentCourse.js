'use client';

import React, { useState, useEffect } from 'react';
import { getTranslations } from '@/lib/i18n';
import LessonTaskCard from './LessonTaskCard';
import LessonMenu from './LessonMenu';
import {
  loadTasks,
  loadLesson,
  loadLessonsMap,
  loadOrgId,
  saveLesson,
  getBadge,
  getStatusText,
  canSendLesson,
  canSendCorrectedLesson,
  setLessonAnswersStatusToDone,
  translateWithParams
} from './utils';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';

export default function CurrentCourse({
  lang,
  currentCourse,
  courseInfo,
  user,
  isSup = false,
  activeLesson,
  setActiveLesson,
  onReviewComplete
}) {
  const { t } = getTranslations(lang, 'courses');
  const courseInfoId = courseInfo?.id;
  const course_ref_id = currentCourse?.id;
  const course_no = currentCourse?.course_id?.toString() || courseInfoId?.toString() || '';
  const profile_id = currentCourse?.student_id;
  const totalLessons = Number(courseInfo?.total_lessons) || 1;

  const [orgId, setOrgId] = useState(currentCourse?.org_id || courseInfo?.org_id || null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lesson, setLesson] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [dirty, setDirty] = useState({});
  const [saving, setSaving] = useState({});
  const [lessonsMap, setLessonsMap] = useState({});
  const [chatEditor, setChatEditor] = useState({});
  const [chatInput, setChatInput] = useState({});

  useEffect(() => {
    if (!orgId && profile_id) {
      loadOrgId(profile_id).then(setOrgId);
    }
  }, [orgId, profile_id]);

  useEffect(() => {
    setLoading(true);
    setTasks([]);
    loadTasks(lang, courseInfoId).then((data) => {
      setTasks(data || []);
      setLoading(false);
    });
  }, [lang, courseInfoId]);

  useEffect(() => {
    if (!course_ref_id || !profile_id) return;
    loadLessonsMap(course_ref_id, profile_id).then((map) => {
      setLessonsMap(map);

      if (isSup) {
        const lessonNumToCheck = Object.entries(map)
          .find(([_, status]) => status === 'done' || status === 'corrected')?.[0];

        if (lessonNumToCheck) {
          setActiveLesson(Number(lessonNumToCheck));
        } else if (!activeLesson) {
          setActiveLesson(1); // ← подстраховка на случай, если ничего не найдено
        }
      }

    });
  }, [course_ref_id, profile_id, isSup]);

  useEffect(() => {
    setLesson(null);
    setAnswers([]);
    if (!course_ref_id || !profile_id || !activeLesson) return;
    loadLesson(course_ref_id, profile_id, activeLesson).then(data => {
      setLesson(data);
      setAnswers(Array.isArray(data?.answers) ? data.answers : []);
    });
  }, [course_ref_id, profile_id, activeLesson]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('activeLesson', String(activeLesson));
    }
  }, [activeLesson]);

  const lessonTasks = tasks.filter((task) => Number(task.lesson_id) === activeLesson);

  const canLessonEdit = lesson
    ? (
        (lesson.status === 'in_progress' ||
         lesson.status === 'corrected' ||
         lesson.status === 'rejected') && lesson.locked_by !== 'reviewer'
      )
    : true;

  const isLocked = lesson?.locked_by === 'reviewer';

  const getAnswerObj = (taskId) => {
    return answers.find(a => a.id === taskId) || null;
  };

  const handleChange = (taskId, value) => {
    setAnswers((prev) => {
      const idx = prev.findIndex(a => a.id === taskId);
      if (idx === -1) {
        return [...prev, { id: taskId, answer: value, review_comments: [], student_questions: [] }];
      }
      const updated = [...prev];
      updated[idx] = { ...updated[idx], answer: value };
      return updated;
    });
    setDirty((prev) => ({ ...prev, [taskId]: true }));
  };

  const handleSave = async (taskId, forcedStatus = null) => {
    setSaving((prev) => ({ ...prev, [taskId]: true }));

    if (!orgId) {
      alert('Ошибка: org_id не определён!');
      setSaving((prev) => ({ ...prev, [taskId]: false }));
      return;
    }

    const updatedAnswers = answers.map(a => {
      if (a.id !== taskId) return a;

      let nextStatus = a.status;

      if (forcedStatus) {
        nextStatus = forcedStatus;
      } else if (a.status === 'rejected') {
        nextStatus = 'corrected';
      } else if (a.status === 'corrected') {
        nextStatus = 'corrected';
      } else if (a.status === 'accepted') {
        nextStatus = 'accepted';
      } else {
        nextStatus = 'done';
      }

      return { ...a, status: nextStatus };
    });

    try {
      const saved = await saveLesson({
        course_ref_id,
        profile_id,
        org_id: orgId,
        course_no,
        lesson_id: activeLesson,
        answers: updatedAnswers,
      });

      setLesson(saved);
      setAnswers(Array.isArray(saved?.answers) ? saved.answers : []);
      setDirty((prev) => ({ ...prev, [taskId]: false }));
      loadLessonsMap(course_ref_id, profile_id).then(setLessonsMap);
    } catch (e) {
      alert('Ошибка при сохранении: ' + e.message);
    }

    setSaving((prev) => ({ ...prev, [taskId]: false }));
  };

  const handleReadMark = async (taskId) => {
    setSaving((prev) => ({ ...prev, [taskId]: true }));
    const idx = answers.findIndex(a => a.id === taskId);
    let newAnswers;
    if (idx === -1) {
      newAnswers = [
        ...answers,
        {
          id: taskId,
          answer: '',
          status: 'done',
          review_comments: [],
          student_questions: [],
        },
      ];
    } else {
      newAnswers = answers.map((a, i) =>
        i === idx ? { ...a, status: 'done' } : a
      );
    }
    try {
      const saved = await saveLesson({
        course_ref_id,
        profile_id,
        org_id: orgId,
        course_no,
        lesson_id: activeLesson,
        answers: newAnswers,
      });
      setLesson(saved);
      setAnswers(Array.isArray(saved?.answers) ? saved.answers : []);
    } catch (e) {
      alert('Ошибка при отметке прочитанного: ' + e.message);
    }
    setSaving((prev) => ({ ...prev, [taskId]: false }));
  };

  const handleSendChat = async (taskId, text) => {
    setSaving((prev) => ({ ...prev, [taskId]: true }));

    const prevAnswers = answers || [];
    const idx = prevAnswers.findIndex(a => a.id === taskId);
    let newAnswers;
    const msgObj = {
      text,
      created_at: new Date().toISOString(),
      full_name: user.full_name,
      role: user.role,
    };
    if (idx === -1) {
      const chatObj = {
        id: taskId,
        answer: '',
        review_comments: user.role === 'supervisor' ? [msgObj] : [],
        student_questions: user.role === 'supervisor' ? [] : [msgObj],
      };
      newAnswers = [...prevAnswers, chatObj];
    } else {
      newAnswers = prevAnswers.map((a, i) => {
        if (i !== idx) return a;
        const obj = { ...a };
        if (user.role === 'supervisor') {
          obj.review_comments = [...(obj.review_comments || []), msgObj];
        } else {
          obj.student_questions = [...(obj.student_questions || []), msgObj];
        }
        return obj;
      });
    }

    try {
      const saved = await saveLesson({
        course_ref_id,
        profile_id,
        org_id: orgId,
        course_no,
        lesson_id: activeLesson,
        answers: newAnswers,
      });
      setLesson(saved);
      setAnswers(Array.isArray(saved?.answers) ? saved.answers : []);
      setDirty({});
      setChatEditor((prev) => ({ ...prev, [taskId]: false }));
      setChatInput((prev) => ({ ...prev, [taskId]: '' }));
    } catch (e) {
      alert('Ошибка при отправке в чат: ' + e.message);
    }
    setSaving((prev) => ({ ...prev, [taskId]: false }));
  };

  const handleSendLesson = async () => {
    const statusToSet = lesson?.status === 'rejected' ? 'corrected' : 'done';
    const updatedAnswers = setLessonAnswersStatusToDone(lessonTasks, answers);
    setSaving((prev) => ({ ...prev, sendLesson: true }));
    try {
      const saved = await saveLesson({
        course_ref_id,
        profile_id,
        org_id: orgId,
        course_no,
        lesson_id: activeLesson,
        answers: updatedAnswers,
        status: statusToSet,
      });
      setLesson(saved);
      setAnswers(Array.isArray(saved?.answers) ? saved.answers : []);
      setDirty({});
      loadLessonsMap(course_ref_id, profile_id).then(setLessonsMap);
    } catch (e) {
      alert('Ошибка при отправке урока: ' + e.message);
    }
    setSaving((prev) => ({ ...prev, sendLesson: false }));
  };

  const isReadyToSend =
    lessonTasks.length > 0 &&
    (lesson?.status === 'rejected'
      ? canSendCorrectedLesson(lessonTasks, answers)
      : canSendLesson(lessonTasks, answers));

  const lessonStatus = lesson?.status;

const handleReviewLesson = async (finalStatus) => {
    setSaving((prev) => ({ ...prev, sendLesson: true }));

    const newAnswers = finalStatus === 'accepted'
      ? lessonTasks.map(task => {
          const ans = answers.find(a => a.id === task.id) || { id: task.id, answer: '' };
          if (task.type === 'write' || task.type === 'pic') {
            return {
              ...ans,
              status: 'accepted',
              review_comments: ans.review_comments || [],
              student_questions: ans.student_questions || [],
            };
          }
          return ans;
        })
      : answers;

    try {
      const saved = await saveLesson({
        course_ref_id,
        profile_id,
        org_id: orgId,
        course_no,
        lesson_id: activeLesson,
        answers: newAnswers,
        status: finalStatus,
      });

      setLesson(saved);
      setAnswers(Array.isArray(saved?.answers) ? saved.answers : []);
      setDirty({});
      loadLessonsMap(course_ref_id, profile_id).then(setLessonsMap);

      // ✅ Вызов после успешной проверки
      if (typeof onReviewComplete === 'function') {
        onReviewComplete();
      }

    } catch (e) {
      alert('Ошибка при финальном сохранении: ' + e.message);
    }

    setSaving((prev) => ({ ...prev, sendLesson: false }));
  }

  return (
    <div className="mt-8">
      <div className="lg:hidden block">
        <LessonMenu
          totalLessons={totalLessons}
          activeLesson={activeLesson}
          setActiveLesson={setActiveLesson}
          getBadge={(lessonNum) => getBadge(lessonNum, lessonsMap)}
        />
      </div>

      <h2 className="text-4xl lg:text-5xl text-center max-w-3xl font-thin font-display uppercase my-8">
        {translateWithParams(t.courses.lesson_heading, { number: activeLesson })}
      </h2>

      {!isSup && lesson?.status && (
        <div className={`alert justify-center mx-4 lg:mx-0 mb-4 max-w-3xl ${
          isLocked
            ? 'alert-warning'
            : lesson.status === 'corrected'
            ? 'bg-accent text-accent-content'
            : lesson.status === 'rejected'
            ? 'alert-error'
            : lesson.status === 'in_progress'
            ? 'alert-neutral alert-outline'
            : lesson.status === 'done'
            ? 'alert-success'
            : !canLessonEdit
            ? 'alert-warning'
            : ''
        }`}>
          {(() => {
            const alertText = t?.courses?.alerts;
            const status = lesson?.status;

            if (isLocked) return alertText?.locked || '';
            if (status === 'corrected') return alertText?.corrected || '';
            if (status === 'rejected') return alertText?.rejected || '';
            if (status === 'in_progress') return alertText?.in_progress || '';
            if (!canLessonEdit) {
              const html = alertText?.not_editable || '';
              const statusText = t.courses.lessonStatuses?.[status] || status;
              return <span dangerouslySetInnerHTML={{ __html: html.replace('{status}', statusText) }} />;
            }

            return null;
          })()}
        </div>
      )}

      {loading ? (
        <div className="p-4">
          <span className="loading loading-infinity loading-xl" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {lessonTasks.length === 0 && (
            <div className="alert alert-warning">{t.courses.not_tasks_in_course}</div>
          )}
          {lessonTasks.map((task) => {
            const ansObj = getAnswerObj(task.id);
            const taskDisabled = ansObj && ansObj.status === 'accepted';
            return (
              <LessonTaskCard
                key={task.id}
                task={task}
                ansObj={ansObj}
                lang={lang}
                canEdit={canLessonEdit && !taskDisabled && lessonStatus !== 'corrected'}
                isLocked={isLocked}
                dirty={dirty}
                saving={saving}
                orgId={orgId}
                t={t}
                handleChange={handleChange}
                handleSave={handleSave}
                chatEditor={chatEditor}
                setChatEditor={setChatEditor}
                chatInput={chatInput}
                setChatInput={setChatInput}
                handleSendChat={handleSendChat}
                user={user}
                handleReadMark={handleReadMark}
                setDirty={setDirty}
                isSup={isSup}
              />
            );
          })}
        </div>
      )}

      {!isSup && !loading && !!lessonStatus && (
        <div className="my-8 max-w-3xl">
          <div role="alert" className={`alert flex ${isReadyToSend ? "justify-between" : "justify-center"} ${
            {
              rejected: 'alert-error',
              corrected: 'bg-accent text-accent-content',
              done: 'alert-success',
              accepted: 'alert-warning',
              in_progress: 'alert-neutral alert-outline',
            }[lessonStatus]
          }`}>
            <div className="text-center">
              {lessonStatus && t?.courses.lessonStatusTexts?.[lessonStatus] && (
                <>{t.courses.lessonStatusTexts[lessonStatus]}</>
              )}
            </div>
            {!isSup && lessonStatus === 'rejected' && isReadyToSend && (
              <button
                className={`btn btn-primary flex ${saving.sendLesson ? 'loading' : ''}`}
                onClick={handleSendLesson}
                disabled={saving.sendLesson}
              >
                <PaperAirplaneIcon className="w-5" />
                {t.courses.send_lesson_check || '---'}
              </button>
            )}
            {!isSup && (!lessonStatus || lessonStatus === 'in_progress') && isReadyToSend && (
              <button
                className={`btn btn-primary ${saving.sendLesson ? 'loading' : ''}`}
                onClick={handleSendLesson}
                disabled={saving.sendLesson}
              >
                <PaperAirplaneIcon className="w-5" />
                {t.courses.send_lesson || '---'}
              </button>
            )}
          </div>
        </div>
      )}

      {isSup && !loading && !!lessonStatus && (
        <div className="my-8 max-w-3xl flex justify-center gap-4">
          <button
            className={`btn btn-success ${saving.sendLesson ? 'loading' : ''}`}
            onClick={() => handleReviewLesson('accepted')}
            disabled={saving.sendLesson}
          >
            {t.courses.accept_lesson || 'Принять урок'}
          </button>
          <button
            className={`btn btn-error ${saving.sendLesson ? 'loading' : ''}`}
            onClick={() => handleReviewLesson('rejected')}
            disabled={saving.sendLesson}
          >
            {t.courses.reject_lesson || 'Отправить на доработку'}
          </button>
        </div>
      )}
    </div>
  );
}