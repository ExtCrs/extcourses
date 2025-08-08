// app/page.js
import { redirect } from 'next/navigation'

// Серверный редирект на дефолтный язык
export default function DefaultRedirect() {
  redirect('/ru')
}