import { supabase } from '@/lib/supabase/client';
import { safeSingleQuery } from '@/hooks/common';

// Все методы, которые нужны компонентам

export const STATUS_BADGES = {
  in_progress: 'bg-teal-500 border-teal-400 animate-pulse',
  done: 'badge-success',
  accepted: 'badge-warning',
  rejected: 'badge-error',
  corrected: 'bg-purple-500 border-purple-400',
};

// Загрузка массива заданий
export async function loadTasks(lang, courseInfoId) {
  // const pathMain = `/public/data/tasks/${lang}/${courseInfoId}.json`;
  const pathMain = `/data/tasks/${lang}/${courseInfoId}.json`

  const pathFallback = `/data/tasks/ru/${courseInfoId}.json`;
  try {
    const res = await fetch(pathMain);
    if (res.ok) return await res.json();
    const resFallback = await fetch(pathFallback);
    if (resFallback.ok) return await resFallback.json();
  } catch {}
  return null;
}

export async function loadLesson(course_ref_id, profile_id, lesson_id) {
  const { data, error } = await safeSingleQuery(
    supabase
      .from('lessons')
      .select('*')
      .eq('course_ref_id', course_ref_id)
      .eq('profile_id', profile_id)
      .eq('lesson_id', lesson_id)
  );
  if (error) return null;
  return data || null;
}

export async function loadLessonsMap(course_ref_id, profile_id) {
  const { data, error } = await supabase
    .from('lessons')
    .select('lesson_id,status')
    .eq('course_ref_id', course_ref_id)
    .eq('profile_id', profile_id);
  if (error) return {};
  const map = {};
  (data || []).forEach(l => {
    map[l.lesson_id] = l.status || 'in_progress';
  });
  return map;
}

export async function loadOrgId(profile_id) {
  const { data, error } = await safeSingleQuery(
    supabase
      .from('profiles')
      .select('current_org_id')
      .eq('id', profile_id)
  );
  if (error) return null;
  return data?.current_org_id || null;
}

export async function saveLesson({ course_ref_id, profile_id, org_id, course_no, lesson_id, answers, status }) {
  const upsertObj = {
    course_ref_id,
    profile_id,
    org_id,
    course_no,
    lesson_id,
    answers,
    updated_at: new Date().toISOString(),
  };
  if (status) upsertObj.status = status;
  const { data, error } = await safeSingleQuery(
    supabase
      .from('lessons')
      .upsert([upsertObj], { onConflict: ['course_ref_id', 'profile_id', 'lesson_id'] })
      .select()
  );
  if (error) throw error;
  return data;
}

export function getBadge(lessonNum, lessonsMap) {
  const status = lessonsMap[lessonNum] || null;
  if (!status) return <span className={`badge badge-xs badge-ghost`} />;
  const badgeClass = STATUS_BADGES[status] || 'badge-ghost';
  return <span className={`badge badge-xs ${badgeClass}`} />;
}

export function getAvatarClass(role) {
  if (role === 'admin') return 'bg-warning text-warning-content ring-error';
  if (role === 'public') return 'bg-neutral text-neutral-content ring-secondary';
  if (role === 'supervisor') return 'bg-info text-info-content ring-info';
  return 'bg-base-200 text-base-content ring-base-300';
}

// lessonUtils

// Проверяет, можно ли отправить урок: все задания готовы
export function canSendLesson(tasks, answers) {
  return tasks.every(task => {
    const ans = answers.find(a => a.id === task.id);
    if (!ans) return false;
    const status = ans.status || '';
    // Для write/pic: done, corrected, accepted
    // Для read: только done
    if (task.type === 'write' || task.type === 'pic') {
      return ['done', 'corrected', 'accepted'].includes(status);
    }
    if (task.type === 'read') {
      return status === 'done';
    }
    return true;
  });
}

export function canSendCorrectedLesson(lessonTasks, answers) {
  return lessonTasks.length > 0 && lessonTasks.every((task) => {
    const ans = answers.find(a => a.id === task.id);
    const st = ans?.status || '';
    return st === 'done' || st === 'corrected' || st === 'accepted';
  });
}

// Проставляет статус "done" всем заданиям write/pic без статуса
export function setLessonAnswersStatusToDone(tasks, answers) {
  return tasks.map(task => {
    const ans = answers.find(a => a.id === task.id);
    if (task.type === 'write' || task.type === 'pic') {
      if (!ans) {
        // Если вообще нет объекта, создаём
        return {
          id: task.id,
          answer: '',
          status: 'done',
          review_comments: [],
          student_questions: [],
        };
      }
      if (!ans.status || ans.status === '') {
        return { ...ans, status: 'done' };
      }
      return ans;
    }
    // Для read — возвращаем как есть (или создаём "пустой" если нет)
    return ans ? ans : {
      id: task.id,
      answer: '',
      status: '',
      review_comments: [],
      student_questions: [],
    };
  });
}

export function translateWithParams(template, params = {}) {
  if (typeof template !== 'string') return ''; // ← безопасно возвращаем пустую строку
  return Object.entries(params).reduce(
    (res, [key, val]) => res.replaceAll(`{${key}}`, val),
    template
  );
}

// Автоматическое определение текущего урока
export function detectCurrentLesson(lessonsMap, totalLessons) {
  // Проходим все уроки начиная с первого
  for (let lessonNum = 1; lessonNum <= totalLessons; lessonNum++) {
    const status = lessonsMap[lessonNum];
    
    // Если урок не начат (нет статуса) или статус "rejected"
    if (!status || status === 'rejected') {
      return lessonNum;
    }
  }
  
  // Если все уроки имеют статус (и ни один не rejected), возвращаем последний
  return totalLessons;
}