'use client'

import { useState, useEffect } from 'react'
import { getTranslations } from '@/lib/i18n'
import { supabase } from '@/lib/supabase/client'

// Пытаемся получить значение переменной окружения
const ORG_ENV = process.env.NEXT_PUBLIC_ORG
const DEFAULT_ORG = ORG_ENV && !isNaN(Number(ORG_ENV)) ? Number(ORG_ENV) : null
const IS_FIXED_ORG = DEFAULT_ORG !== null

const Auth = ({ lang = 'ru' }) => {
  const { t } = getTranslations(lang, 'auth')

  const [selectedOrg, setSelectedOrg] = useState(IS_FIXED_ORG ? DEFAULT_ORG : null)
  const [authType, setAuthType] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(!IS_FIXED_ORG)
  const [orgs, setOrgs] = useState([])
  const [isAuth, setIsAuth] = useState(false)

  // Проверка авторизации
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAuth(!!data.session)
    })
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuth(!!session)
    })
    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  // Получение списка организаций
  useEffect(() => {
    if (IS_FIXED_ORG) return
    const fetchOrgs = async () => {
      const { data, error } = await supabase
        .from('orgs')
        .select('*')
        .eq('inactive', false)

      if (error) {
        setError('Ошибка загрузки организаций')
        setLoading(false)
        return
      }

      setOrgs(data || [])
      setLoading(false)
    }
    fetchOrgs()
  }, [])

  const getOrgName = (org) => (lang === 'ru' ? org.name_ru : org.name_en)

  const handleRegister = async () => {
    setError('')
    if (password !== confirmPassword) {
      setError(t.auth.password_mismatch)
      return
    }
    if (!fullName || !phone || !selectedOrg || !email || !password) {
      setError(t.auth.fill_all_fields)
      return
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password
    })

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    const user = data.user
    if (user) {
      let attempts = 0
      let updated = false

      while (attempts < 10 && !updated) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: fullName,
            phone: phone,
            current_org_id: selectedOrg,
            role: 'public',
            active: true,
            email: email
          })
          .eq('id', user.id)

        if (!profileError) {
          updated = true
          window.location.href = `/${lang}/courses`
        } else if (
          profileError.details &&
          profileError.details.includes('foreign key')
        ) {
          await new Promise((res) => setTimeout(res, 300))
        } else {
          setError(profileError.message)
          break
        }
        attempts++
      }
      if (!updated) setError('Ошибка при создании профиля. Попробуйте позже.')
    }
  }

  const handleLogin = async () => {
    setError('')
    if (!email || !password) {
      setError(t.auth.fill_all_fields)
      return
    }
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (loginError) {
      setError(loginError.message)
    } else {
      window.location.href = `/${lang}/courses`
    }
  }

  // Если уже авторизован — ничего не показываем
  if (isAuth) return null

  return (
    <div className="mx-auto text-center flex flex-col items-center">

      {/* --- Выбор организации --- */}
      {!IS_FIXED_ORG && !selectedOrg && !loading && (
        <div className="mb-2 font-medium text-secondary uppercase">
          {t.common.select_org}
        </div>
      )}

      {!IS_FIXED_ORG && (
        <div className="filter mx-auto flex-wrap justify-center">
          <input
            className="btn btn-sm filter-reset"
            type="radio"
            name="org"
            aria-label="All"
            checked={selectedOrg === null}
            onChange={() => {
              setSelectedOrg(null)
              setAuthType(null)
            }}
          />
          {loading ? (
            <span className="loading loading-infinity loading-xl" />
          ) : (
            orgs.map((org) => (
              <input
                key={org.id}
                className="btn btn-sm"
                type="radio"
                name="org"
                aria-label={getOrgName(org)}
                checked={selectedOrg === org.id}
                onChange={() => {
                  setSelectedOrg(org.id)
                  setAuthType(null)
                }}
              />
            ))
          )}
        </div>
      )}

      {/* --- Выбор типа входа/регистрации --- */}
      {selectedOrg && !authType && (
        <>
          <div className="mt-6 uppercase font-medium text-secondary">
            {t.auth.choose_auth_type}
          </div>
          <div className="filter mx-auto flex-wrap justify-center mt-4">
            <input
              className="btn filter-reset"
              type="radio"
              name="auth"
              aria-label="All"
              checked={authType === null}
              onChange={() => setAuthType(null)}
            />
            <input
              className="btn"
              type="radio"
              name="auth"
              aria-label={t.auth.login_button}
              checked={authType === 'login'}
              onChange={() => setAuthType('login')}
            />
            <input
              className="btn"
              type="radio"
              name="auth"
              aria-label={t.auth.register_button}
              checked={authType === 'register'}
              onChange={() => setAuthType('register')}
            />
          </div>
        </>
      )}

      {/* --- Форма авторизации / регистрации --- */}
      {selectedOrg && authType && (
        <fieldset className="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4 mt-4">
          <legend className="fieldset-legend">
            {authType === 'login'
              ? t.auth.login_button
              : t.auth.register_button}
          </legend>

          {authType === 'register' && (
            <>
              <label className="label">{t.auth.full_name}</label>
              <input
                className="input mb-2"
                placeholder={t.auth.full_name}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <label className="label">{t.auth.phone}</label>
              <input
                className="input mb-2"
                placeholder={t.auth.phone}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </>
          )}

          <label className="label">{t.auth.email}</label>
          <input
            type="email"
            className="input mb-2"
            placeholder={t.auth.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label className="label">{t.auth.password}</label>
          <input
            type="password"
            className="input mb-2"
            placeholder={t.auth.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {authType === 'register' && (
            <>
              <label className="label">{t.auth.confirm_password}</label>
              <input
                type="password"
                className="input mb-2"
                placeholder={t.auth.confirm_password}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </>
          )}

          {error && <p className="text-error text-sm mt-2">{error}</p>}

          <button
            className="btn btn-neutral mt-4 w-full"
            onClick={authType === 'login' ? handleLogin : handleRegister}
          >
            {authType === 'login'
              ? t.auth.login_button
              : t.auth.register_button}
          </button>
        </fieldset>
      )}
    </div>
  )
}

export default Auth