
export default function LessonMenu({ totalLessons, activeLesson, setActiveLesson, getBadge }) {
  return (
    <ul className={`menu menu-sm menu-horizontal mt-2 border-t border-secondary/10 mb-6 gap-px justify-evenly w-full`}>
      {Array.from({ length: totalLessons }, (_, i) => i + 1).map((num) => (
        <li key={num} className="max-w-16 w-full font-mono">
          <button
            className={num === activeLesson ? "menu-active !bg-accent rounded-full border border-accent font-bold shadow-lg" : "!w-full rounded-none border-transparent"}
            onClick={() => setActiveLesson(num)}
          >
            <span className="min-w-5">{num}</span>
            {getBadge(num)}
          </button>
        </li>
      ))}
    </ul>
  );
}