// app/layout.js
import './globals.css'

export const metadata = {
  title: 'ExtCourses',
  description: 'Courses platform',
}

// Только здесь рендерим <html>/<body>. Вешаем те классы,
// которые раньше были в [lang]/layout.js, чтобы не было рассинхрона при гидрации.
export default function RootLayout({ children }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="max-w-7xl mx-auto min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  )
}