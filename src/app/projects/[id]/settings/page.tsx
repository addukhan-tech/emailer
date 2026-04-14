'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Trash2, Eye, EyeOff } from 'lucide-react'
import { Project } from '@/types'

const BATCH_OPTIONS = [
  { value: 1, label: '1 email at a time' },
  { value: 2, label: '2 emails at a time' },
  { value: 3, label: '3 emails at a time' },
  { value: 5, label: '5 emails at a time' },
  { value: 10, label: '10 emails at a time' },
  { value: 20, label: '20 emails at a time' },
  { value: 50, label: '50 emails at a time' },
  { value: 0, label: 'All unsent leads at once' },
]

export default function ProjectSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [form, setForm] = useState<Partial<Project>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [showPass, setShowPass] = useState(false)

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then(r => r.json())
      .then(d => { setProject(d); setForm(d); setLoading(false) })
  }, [projectId])

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }))

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved(false)
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) { const d = await res.json(); setError(d.error) }
    else { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this project and all its leads? This cannot be undone.')) return
    setDeleting(true)
    await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
    router.push('/projects')
  }

  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <Loader2 className="w-5 h-5 spin text-gray-300" />
    </div>
  )

  return (
    <div className="p-6 max-w-3xl mx-auto fade-in">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/projects/${projectId}/leads`} className="btn btn-sm">
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Project Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Basic */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Basic Info</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Project name</label>
              <input className="input" value={form.name ?? ''} onChange={e => set('name', e.target.value)} />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input" rows={2} value={form.description ?? ''} onChange={e => set('description', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">From name</label>
                <input className="input" value={form.from_name ?? ''} onChange={e => set('from_name', e.target.value)} />
              </div>
              <div>
                <label className="label">From email</label>
                <input type="email" className="input" value={form.from_email ?? ''} onChange={e => set('from_email', e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* SMTP */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">SMTP Settings</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="label">SMTP host</label>
                <input className="input" value={form.smtp_host ?? ''} onChange={e => set('smtp_host', e.target.value)} />
              </div>
              <div>
                <label className="label">Port</label>
                <input type="number" className="input" value={form.smtp_port ?? 587} onChange={e => set('smtp_port', parseInt(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">SMTP user</label>
                <input className="input" value={form.smtp_user ?? ''} onChange={e => set('smtp_user', e.target.value)} />
              </div>
              <div>
                <label className="label">SMTP password</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} className="input pr-10"
                    value={form.smtp_pass ?? ''} onChange={e => set('smtp_pass', e.target.value)} />
                  <button type="button" onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Email content */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Email Content</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Subject</label>
              <input className="input" value={form.email_subject ?? ''} onChange={e => set('email_subject', e.target.value)} />
            </div>
            <div>
              <label className="label">Body (HTML supported)</label>
              <textarea className="input font-mono text-xs" rows={8} value={form.email_body ?? ''} onChange={e => set('email_body', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Schedule & Sending</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Schedule type</label>
                <select className="input" value={form.schedule_type ?? 'daily'} onChange={e => set('schedule_type', e.target.value)}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="label">Send time</label>
                <input type="time" className="input" value={form.schedule_time ?? '09:00'} onChange={e => set('schedule_time', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Emails per batch</label>
                <select className="input" value={form.batch_size ?? 10} onChange={e => set('batch_size', parseInt(e.target.value))}>
                  {BATCH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Interval (minutes)</label>
                <input type="number" min={1} max={60} className="input" value={form.batch_interval_minutes ?? 5} onChange={e => set('batch_interval_minutes', parseInt(e.target.value))} />
              </div>
              <div>
                <label className="label">Daily limit</label>
                <input type="number" min={0} className="input" value={form.daily_limit ?? 50} onChange={e => set('daily_limit', parseInt(e.target.value))} />
              </div>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Project Status</h2>
          <div className="flex items-center gap-3">
            {(['active', 'paused', 'stopped'] as const).map(s => (
              <button key={s} onClick={() => set('status', s)}
                className={`btn btn-sm capitalize ${form.status === s ? 'btn-primary' : ''}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        {saved && <p className="text-sm text-brand-600 bg-brand-50 px-3 py-2 rounded-lg">Settings saved!</p>}

        <div className="flex items-center justify-between">
          <button onClick={handleDelete} disabled={deleting}
            className="btn btn-danger btn-sm">
            <Trash2 className="w-3.5 h-3.5" />
            {deleting ? 'Deleting...' : 'Delete Project'}
          </button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving && <Loader2 className="w-4 h-4 spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
