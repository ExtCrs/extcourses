// components/auth/SupButton.js
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getTranslations } from '@/lib/i18n'

const SupButton = ({ lang = 'ru' }) => {
    const { t } = getTranslations(lang, 'common')
    const [isSup, setIsSup] = useState(false)
    const pathname = usePathname()

    useEffect(() => {
        // Получаем информацию о текущем пользователе
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setIsSup(false)
                return
            }
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()
            setIsSup(profile?.role === 'admin' || profile?.role === 'supervisor')
        }
        fetchProfile()
    }, [])

    if (!isSup) return null

    // Check if current page is supervisor related
    const isActive = pathname.includes('/sup')
    const linkClass = isActive ? 'menu-active' : ''

    const handleClick = (e) => {
        if (isActive) {
            e.preventDefault()
        }
    }

    return (
        <li>
            <Link 
                className={linkClass}
                href={`/${lang}/sup`}
                onClick={handleClick}
                {...(isActive && { 'aria-disabled': 'true' })}
            >
                {t.common.supervisor_panel}
            </Link>
        </li>
    )
}

export default SupButton