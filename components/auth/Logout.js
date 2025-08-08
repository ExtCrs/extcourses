'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { getTranslations } from '@/lib/i18n'

const Logout = ({ lang = 'ru' }) => {
  const router = useRouter()
  const [isAuth, setIsAuth] = useState(false)
  const { t } = getTranslations(lang, 'common')

  useEffect(() => {
    let isMounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) setIsAuth(!!data.session)
    })
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session && isMounted) setIsAuth(false)
        if (!!session && isMounted) setIsAuth(true)
      }
    )
    return () => {
      isMounted = false
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setTimeout(async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.replace(`/${lang}`)
      }
    }, 200)
  }

  if (!isAuth) return null

  return (
    <li><button onClick={handleLogout}>{t.common.logout}</button></li>
  )
}

export default Logout