// app/api/reset-user-password/route.js
// API route для сброса пароля пользователя супервайзером

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

// Создаем клиент с service role ключом для административных операций
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request) {
  try {
    const { userId, newPassword } = await request.json()

    // Валидация входных данных
    if (!userId || !newPassword) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID and new password are required' 
      }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ 
        success: false, 
        error: 'Password must be at least 6 characters long' 
      }, { status: 400 })
    }

    // Проверяем, что пользователь существует
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)
    
    if (userError || !userData.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 })
    }

    // Обновляем пароль пользователя
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    )

    if (updateError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update password' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Password updated successfully' 
    })

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}