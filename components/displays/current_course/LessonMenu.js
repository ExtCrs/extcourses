
export default function LessonMenu({ totalLessons, activeLesson, setActiveLesson, getBadge }) {
  return (
    <ul className={`menu menu-sm menu-horizontal mt-2 border-t border-secondary/10 mb-6 mx-3 gap-1 justify-start`}>
      {Array.from({ length: totalLessons }, (_, i) => i + 1).map((num) => (
        <li key={num}>
          <button
            className={`flex flex-col rounded border font-bold font-mono ${num === activeLesson ? "menu-active !bg-secondary border-secondary/80" : "!hover:bg-base-100 !border-secondary/20"}`}
            onClick={() => setActiveLesson(num)}
          >
            <span className="mx-auto">{getBadge(num)}</span>
            <span className="min-w-3 text-center">{num}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}