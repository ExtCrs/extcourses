'use client'

import React, { useEffect, useState } from "react";
import { use } from "react";
import { getTranslations } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";
import coursesData from "@/data/courses.json";
import dynamic from "next/dynamic";
import { Bars3Icon } from "@heroicons/react/24/outline";
import LessonMenu from '@/components/displays/current_course/LessonMenu';
import { getBadge, loadLessonsMap } from '@/components/displays/current_course/utils';
import CourseStats from "@/components/displays/CourseStats";

const CurrentCourse = dynamic(() => import('@/components/displays/current_course/CurrentCourse'), { ssr: false });

export default function CurrentCoursePage({ params }) {
  const { lang } = use(params);
  const { t } = getTranslations(lang, "courses");

  const [loading, setLoading] = useState(true);
  const [currentCourse, setCurrentCourse] = useState(null);
  const [courseInfo, setCourseInfo] = useState(null);
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [updating, setUpdating] = useState(false);

  const [activeLesson, setActiveLesson] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('activeLesson');
      const num = Number(saved);
      return Number.isFinite(num) && num > 0 ? num : 1;
    }
    return 1;
  })
  const [lessonsMap, setLessonsMap] = useState({});

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session || !session.user) {
        setLoading(false);
        setCurrentCourse(null);
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      setProfile(profileData);

      setUser({
        full_name: profileData?.full_name || session.user.email,
        role: profileData?.role || 'public',
      });

      const { data: courses } = await supabase
        .from("courses")
        .select("*")
        .eq("student_id", session.user.id)
        .in("state", [
          "SignUp", "PaidConfirm", "Started", "Bugged", "AccountedFor", "Completed", "ResignNeeded", "AllCoursesDone"
        ])
        .order("created_at", { ascending: false })
        .limit(1);

      if (!courses || courses.length === 0) {
        setLoading(false);
        setCurrentCourse(null);
        return;
      }

      const current = courses[0];
      setCurrentCourse(current);

      const courseObj = coursesData.find(c => c.id === current.course_id || c.url === current.course_id);
      setCourseInfo(courseObj || null);

      const lessonsMap = await loadLessonsMap(current.id, current.student_id);
      setLessonsMap(lessonsMap);

      setLoading(false);
    }

    fetchData();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('activeLesson', String(activeLesson));
    }
  }, [activeLesson]);

  if (loading) {
    return <div className="text-center py-8">
      <span className="loading loading-infinity loading-xl" />
    </div>;
  }

  if (!currentCourse || !courseInfo) {
    return (
      <div className="alert alert-warning my-8">
        {t.courses?.course_not_found}
      </div>
    );
  }

  const title =
    courseInfo[`title_${lang}`] ||
    courseInfo.title_ru ||
    courseInfo.title_en ||
    courseInfo.title ||
    currentCourse.course_id;

  const status = currentCourse.state;

  const recommendation =
    t.status_recommendations?.[status] ||
    `${t.common?.status || "Status"}: ${t.courseStates?.[status] || status}`;

  const showStartButton = status === "PaidConfirm";

  const handleStartCourse = async () => {
    if (!currentCourse) return;
    setUpdating(true);
    const { error } = await supabase
      .from("courses")
      .update({ state: "Started", updated_at: new Date().toISOString() })
      .eq("id", currentCourse.id);

    if (!error) {
      setCurrentCourse((prev) => prev ? { ...prev, state: "Started" } : prev);
    }
    setUpdating(false);
  };

  const showCurrentCourseBlock = ["Started", "Bugged", "AccountedFor"].includes(currentCourse.state);
  const totalLessons = Number(courseInfo?.total_lessons) || 1;

  return (
    <div className="drawer lg:drawer-open">
      <input id="courseDrawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content lg:p-4 p-px">
        <label htmlFor="courseDrawer" className="btn btn-link drawer-button lg:hidden">
          <Bars3Icon className="w-7" />
        </label>
        <div className="lg:hidden block">
          <h1 className="border-t uppercase text-center lg:text-left border-secondary/30 text-2xl font-bold py-4">{title}</h1>
        </div>
        <div className="mt-4 p-4 bg-base-200 lg:rounded-xl text-base flex flex-col gap-4 text-center max-w-3xl">
          <span>{recommendation}</span>
          {showStartButton && (
            <button
              className="btn btn-primary self-start mx-auto"
              onClick={handleStartCourse}
              disabled={updating}
            >
              {updating
                ? (t.common?.loading)
                : (t.courses?.start_course)}
            </button>
          )}
        </div>
        {showCurrentCourseBlock && user && (
          <CurrentCourse
            lang={lang}
            currentCourse={currentCourse}
            courseInfo={courseInfo}
            user={user}
            activeLesson={activeLesson}
            setActiveLesson={setActiveLesson}
          />
        )}
      </div>
      <div className="drawer-side">
        <label htmlFor="courseDrawer" aria-label="close sidebar" className="drawer-overlay" />
        <div className="menu lg:bg-transparent text-base-content min-h-full w-80 p-4">
          <div className="rounded-2xl bg-base-200 ring ring-secondary/30 p-4">
            <h1 className="text-center text-xl uppercase font-bold text-secondary mb-2">{title}</h1>
            <CourseStats IsInside={true} />
            <div className="text-sm text-center mt-2 uppercase text-secondary/60 font-medium">{t.courses.lessons_list}</div>
            <LessonMenu
              totalLessons={totalLessons}
              activeLesson={activeLesson}
              setActiveLesson={setActiveLesson}
              getBadge={(lessonNum) => getBadge(lessonNum, lessonsMap)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}