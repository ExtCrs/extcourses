// components/auth/AdminButton.js
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getTranslations } from '@/lib/i18n'

const AdminButton = ({ lang = 'ru' }) => {
    const { t } = getTranslations(lang, 'common')
    const [isAdmin, setIsAdmin] = useState(false)
    const pathname = usePathname()

    useEffect(() => {
        // Получаем информацию о текущем пользователе
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setIsAdmin(false)
                return
            }
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()
            setIsAdmin(profile?.role === 'admin')
        }
        fetchProfile()
    }, [])

    if (!isAdmin) return null

    // Check if current page is admin related
    const isActive = pathname.includes('/admin')
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
                href={`/${lang}/admin`}
                onClick={handleClick}
                {...(isActive && { 'aria-disabled': 'true' })}
            >
                {t.common.admin_panel}
            </Link>
        </li>
    )
}

export default AdminButton