// components/auth/SupButton.js
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getTranslations } from '@/lib/i18n'

const SupButton = ({ lang = 'ru' }) => {
    const { t } = getTranslations(lang, 'common')
    const [isSup, setIsSup] = useState(false)

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

    return (
        <li><Link href={`/${lang}/sup`}>{t.common.supervisor_panel}</Link></li>
    )
}

export default SupButton