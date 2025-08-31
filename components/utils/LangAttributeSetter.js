'use client'

import { useEffect } from 'react'

/**
 * Sets the HTML lang attribute dynamically on the client side
 * This is necessary because Next.js App Router doesn't allow 
 * dynamic lang attributes in server components
 */
export default function LangAttributeSetter({ lang }) {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang
    }
  }, [lang])

  return null // This component doesn't render anything
}