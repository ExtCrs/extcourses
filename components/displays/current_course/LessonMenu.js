
export default function LessonMenu({ totalLessons, activeLesson, setActiveLesson, getBadge }) {
  return (
    <ul className={`menu menu-sm menu-horizontal mt-2 border-t border-secondary/10 mb-6 gap-1 justify-evenly w-full`}>
      {Array.from({ length: totalLessons }, (_, i) => i + 1).map((num) => (
        <li key={num} className="max-w-fit font-mono rounded">
          <button
            className={num === activeLesson ? "flex flex-col menu-active rounded font-bold" : "flex flex-col rounded bg-base-100 border-transparent"}
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