
export default function LessonMenu({ totalLessons, activeLesson, setActiveLesson, getBadge }) {
  return (
    <ul className={`menu menu-sm menu-horizontal mt-2 border-t border-secondary/10 mb-6 gap-px grid lg:grid-cols-3 grid-cols-12 w-full`}>
      {Array.from({ length: totalLessons }, (_, i) => i + 1).map((num) => (
        <li key={num} className="">
          <button
            className={num === activeLesson ? "menu-active !bg-accent rounded-full border border-accent font-bold shadow-lg" : "rounded-full border border-transparent"}
            onClick={() => setActiveLesson(num)}
          >
            {num}
            {getBadge(num)}
          </button>
        </li>
      ))}
    </ul>
  );
}