'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function SettingsPage() {
  const supabase = createClient()
  const [form, setForm] = useState({ full_name: '', email: '' })
  const [password, setPassword] = useState({ current: '', new: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setForm({ full_name: user.user_metadata?.full_name ?? '', email: user.email ?? '' })
    })
  }, [])

  const handleSaveProfile = async () => {
    setLoading(true); setError(''); setSaved(false)
    const { error } = await supabase.auth.updateUser({
      data: { full_name: form.full_name }
    })
    await supabase.from('profiles').update({ full_name: form.full_name }).eq('email', form.email)
    if (error) setError(error.message)
    else { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    setLoading(false)
  }

  const handleChangePassword = async () => {
    if (password.new !== password.confirm) { setError('Passwords do not match'); return }
    if (password.new.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.updateUser({ password: password.new })
    if (error) setError(error.message)
    else { setPassword({ current: '', new: '', confirm: '' }); setSaved(true); setTimeout(() => setSaved(false), 3000) }
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto fade-in">
      <h1 className="text-xl font-semibold text-gray-900 mb-8">Account Settings</h1>

      <div className="space-y-6">
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Full name</label>
              <input className="input" value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Email address</label>
             <input className="input opacity-60 cursor-not-allowed" value={form.email} disabled />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
            </div>
            <button onClick={handleSaveProfile} disabled={loading} className="btn btn-primary btn-sm">
              {loading && <Loader2 className="w-3.5 h-3.5 spin" />}
              Save Profile
            </button>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Change Password</h2>
          <div className="space-y-4">
            <div>
              <label className="label">New password</label>
              <input type="password" className="input" value={password.new}
                onChange={e => setPassword(p => ({ ...p, new: e.target.value }))} />
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <input type="password" className="input" value={password.confirm}
                onChange={e => setPassword(p => ({ ...p, confirm: e.target.value }))} />
            </div>
            <button onClick={handleChangePassword} disabled={loading} className="btn btn-sm">
              Update Password
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        {saved && <p className="text-sm text-brand-600 bg-brand-50 px-3 py-2 rounded-lg">Saved successfully!</p>}

        <div className="card p-6 border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Google Sheets Integration</h2>
          <p className="text-xs text-gray-400 mb-4">
            To enable live sync from Google Sheets, use the Apps Script below in your sheet.
            It will POST to your webhook URL whenever a new row is added.
          </p>
          <pre className="bg-gray-900 text-green-400 text-xs rounded-lg p-4 overflow-x-auto">{`function onFormSubmit(e) {
  var row = e.values;
  var headers = e.range.getSheet()
    .getRange(1, 1, 1, row.length).getValues()[0];
  var data = {};
  headers.forEach(function(h, i) { data[h] = row[i]; });

  UrlFetchApp.fetch(
    '${typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}/api/sheets-webhook',
    {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify({
        project_id: 'YOUR_PROJECT_ID',
        secret: 'YOUR_SECRET',
        row: data
      })
    }
  );
}`}</pre>
        </div>
      </div>
    </div>
  )
}
