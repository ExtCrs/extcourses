'use client'

import { usePathname, useSearchParams } from "next/navigation";

export default function LanguageSwitcher({ currentLang }) {
  const otherLang = currentLang === 'ru' ? 'en' : 'ru';
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Удаляем из pathname текущий язык в начале и подставляем новый язык
  const restOfPath = pathname.replace(/^\/(ru|en)/, "");
  const newPath = `/${otherLang}${restOfPath || "/"}`;

  // Если были параметры (?q=search) — добавим их обратно
  const search = searchParams.toString();
  const href = search ? `${newPath}?${search}` : newPath;

  const handleSwitch = (e) => {
    e.preventDefault();
    window.location.href = href; // Полная перезагрузка страницы!
  };

  return (
    <button
      type="button"
      className="btn btn-xs btn-secondary btn-outline"
      onClick={handleSwitch}
    >
      {otherLang.toUpperCase()}
    </button>
  )
}
