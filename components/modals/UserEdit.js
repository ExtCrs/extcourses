'use client'

import React, { useRef, useEffect, useState } from 'react'
import { getTranslations } from '@/lib/i18n'
import { supabase } from '@/lib/supabase/client'

const UserEdit = ({
  open,
  onClose,
  user,
  orgs,
  lang = 'ru',
  onSaved
}) => {
  const { t } = getTranslations(lang)
  const modalRef = useRef(null)
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    current_org_id: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setForm({
        full_name: user?.full_name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        current_org_id: user?.current_org_id || ''
      })
      setError('')
      modalRef.current?.showModal()
    } else {
      modalRef.current?.close()
    }
  }, [open, user])

  const handleChange = (e) => {
    setForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const { full_name, email, phone, current_org_id } = form
    const { error } = await supabase
      .from('profiles')
      .update({ full_name, email, phone, current_org_id })
      .eq('id', user.id)
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    onSaved && onSaved()
    onClose()
  }

  const handleClose = () => {
    onClose && onClose()
    setError('')
    modalRef.current?.close()
  }

  return (
    <dialog ref={modalRef} className="modal">
      <div className="modal-box ring ring-secondary/30 max-w-md">
        <h3 className="font-black text-lg mb-4">{t.common?.editUser || 'Edit user'}</h3>

        <form
          className="space-y-4"
          onSubmit={e => { e.preventDefault(); handleSave() }}
        >
          {/* ФИО */}
          <label className="floating-label w-full">
            <span>{t.common?.fullName}</span>
            <input
              type="text"
              name="full_name"
              placeholder={t.common?.fullName}
              className="input input-md w-full"
              value={form.full_name}
              onChange={handleChange}
              required
            />
          </label>

          {/* Email */}
          <label className="floating-label w-full">
            <span>Email</span>
            <input
              type="email"
              name="email"
              placeholder="mail@site.com"
              className="input input-md w-full"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>

          {/* Телефон */}
          <label className="floating-label w-full">
            <span>{t.common?.phone || "Phone"}</span>
            <input
              type="tel"
              name="phone"
              placeholder="+7 999 999-99-99"
              className="input input-md w-full"
              value={form.phone}
              onChange={handleChange}
            />
          </label>

          {/* Организация */}
          <label className="select w-full">
            <span className="label">{t.common?.organization}</span>
            <select
              name="current_org_id"
              value={form.current_org_id || ''}
              onChange={handleChange}
              className="select select-bordered w-full"
              required
            >
              <option value="">{t.common?.select_org || 'Выберите организацию'}</option>
              {Object.entries(orgs || {}).map(([id, org]) => (
                <option key={id} value={id}>
                  {org?.name_ru || org?.name_en || id}
                </option>
              ))}
            </select>
          </label>

          {error && (
            <div className="text-error font-medium">{error}</div>
          )}

          <div className="modal-action flex gap-2 mt-2">
            <button className="btn btn-outline" type="button" onClick={handleClose}>
              {t.common?.cancel || 'Cancel'}
            </button>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? <span className="loading loading-spinner loading-xs"></span> : (t.common?.save || 'Save')}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop" onClick={handleClose}>
        <button tabIndex={-1} />
      </form>
    </dialog>
  )
}

export default UserEdit