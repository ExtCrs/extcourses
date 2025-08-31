'use client'

import { useState, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getTranslations } from '@/lib/i18n'
import { supabase } from '@/lib/supabase/client'

export default function ResetPassword({ params }) {
  const { lang = 'ru' } = use(params)
  const { t } = getTranslations(lang, 'auth')
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [validSession, setValidSession] = useState(false)

  useEffect(() => {
    // Check if user has a valid session for password reset
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session && session.user) {
        setValidSession(true)
      } else {
        // Try to get session from URL parameters if present
        const accessToken = searchParams.get('access_token')
        const refreshToken = searchParams.get('refresh_token')
        
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          
          if (!error) {
            setValidSession(true)
          } else {
            setError(t.auth.invalid_reset_link)
          }
        } else {
          setError(t.auth.invalid_reset_link)
        }
      }
    }
    
    checkSession()
  }, [searchParams, t.auth])

  const handlePasswordReset = async () => {
    setError('')
    setLoading(true)
    
    if (!password || !confirmPassword) {
      setError(t.auth.fill_all_fields)
      setLoading(false)
      return
    }
    
    if (password !== confirmPassword) {
      setError(t.auth.password_mismatch)
      setLoading(false)
      return
    }
    
    if (password.length < 6) {
      setError(t.auth.password_too_short)
      setLoading(false)
      return
    }
    
    const { error } = await supabase.auth.updateUser({
      password: password
    })
    
    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      // Redirect to courses after successful password reset
      setTimeout(() => {
        router.push(`/${lang}/courses`)
      }, 3000)
    }
    
    setLoading(false)
  }

  if (!validSession && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card w-96 bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <div className="text-success text-4xl mb-4">✅</div>
            <h2 className="card-title justify-center">{t.auth.password_reset_success}</h2>
            <p className="text-base-content/70">{t.auth.password_reset_success_description}</p>
            <div className="card-actions justify-center mt-4">
              <button 
                className="btn btn-primary"
                onClick={() => router.push(`/${lang}/courses`)}
              >
                {t.auth.go_to_courses}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title justify-center">{t.auth.reset_password_title}</h2>
          
          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}
          
          {validSession ? (
            <>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">{t.auth.new_password}</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered"
                  placeholder={t.auth.new_password}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">{t.auth.confirm_new_password}</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered"
                  placeholder={t.auth.confirm_new_password}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              
              <div className="card-actions justify-center mt-4">
                <button
                  className="btn btn-primary w-full"
                  onClick={handlePasswordReset}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    t.auth.update_password
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center">
              <p className="text-base-content/70 mb-4">{t.auth.invalid_reset_link_description}</p>
              <button
                className="btn btn-primary"
                onClick={() => router.push(`/${lang}`)}
              >
                {t.auth.back_to_login}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}