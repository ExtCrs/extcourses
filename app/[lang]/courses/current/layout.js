// app/[lang]/courses/current/layout.js
import Breadcrumbs from "@/components/navs/Breadcrumbs";

/**
 * Layout для страницы текущего курса.
 * Здесь можно добавить общий вид или компоненты (например, Breadcrumbs),
 * которые должны быть на всех страницах внутри current.
 */
export default function CurrentCourseLayout({ children }) {
  return (
    <section className="mx-auto py-2">
      <div className="pl-9">
        <Breadcrumbs />
      </div>
      {children}
    </section>
  );
}
