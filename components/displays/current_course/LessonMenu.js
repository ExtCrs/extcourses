
export default function LessonMenu({ totalLessons, activeLesson, setActiveLesson, getBadge }) {
  return (
    <ul className="menu menu-sm menu-horizontal bg-base-200 rounded-box mb-6 gap-px">
      {Array.from({ length: totalLessons }, (_, i) => i + 1).map((num) => (
        <li key={num}>
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