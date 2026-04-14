'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Plus, Minus, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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

const INTERVAL_OPTIONS = [1, 2, 3, 5, 10, 15, 30, 60]
const FOLLOWUP_DAYS = [1, 2, 3, 4, 5]

const defaultForm = {
  name: '', description: '',
  from_email: '', from_name: '',
  smtp_host: 'smtp.gmail.com', smtp_port: 587, smtp_user: '', smtp_pass: '', smtp_secure: false,
  email_subject: '', email_body: '',
  schedule_type: 'daily', schedule_time: '09:00',
  schedule_day_of_week: 1, schedule_day_of_month: 1,
  batch_size: 10, batch_interval_minutes: 5, daily_limit: 50,
  followup_count: 0,
  followup_day_1: 2, followup_day_2: 4, followup_day_3: 5, followup_day_4: 5,
  followup_subject_1: '', followup_body_1: '',
  followup_subject_2: '', followup_body_2: '',
  followup_subject_3: '', followup_body_3: '',
  followup_subject_4: '', followup_body_4: '',
}

export default function NewProjectPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState(defaultForm)

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, user_id: user!.id }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      const project = await res.json()
      router.push(`/projects/${project.id}/leads`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(false)
    }
  }

  const steps = ['Basic Info', 'SMTP & Email', 'Schedule', 'Follow-ups']

  return (
    <div className="p-6 max-w-3xl mx-auto fade-in">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/projects" className="btn btn-sm">
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">New Project</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <button
              onClick={() => i + 1 < step && setStep(i + 1)}
              className={`flex items-center gap-2 text-xs font-medium ${
                step === i + 1 ? 'text-brand-600' :
                step > i + 1 ? 'text-gray-500 cursor-pointer hover:text-brand-600' : 'text-gray-300'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                step === i + 1 ? 'bg-brand-600 text-white' :
                step > i + 1 ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-400'
              }`}>
                {i + 1}
              </span>
              <span className="hidden sm:block">{s}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px mx-3 ${step > i + 1 ? 'bg-brand-200' : 'bg-gray-100'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="card p-6">
        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-800 mb-5">Basic Information</h2>
            <div>
              <label className="label">Project name *</label>
              <input className="input" placeholder="e.g. Q2 SaaS Outreach" value={form.name}
                onChange={e => set('name', e.target.value)} />
            </div>
            <div>
              <label className="label">Description (optional)</label>
              <textarea className="input" rows={2} placeholder="What is this project for?"
                value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">From name</label>
                <input className="input" placeholder="Ahmed Raza" value={form.from_name}
                  onChange={e => set('from_name', e.target.value)} />
              </div>
              <div>
                <label className="label">From email *</label>
                <input type="email" className="input" placeholder="you@company.com" value={form.from_email}
                  onChange={e => set('from_email', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-800 mb-5">SMTP & Email Content</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="label">SMTP host *</label>
                <input className="input" placeholder="smtp.gmail.com" value={form.smtp_host}
                  onChange={e => set('smtp_host', e.target.value)} />
              </div>
              <div>
                <label className="label">Port *</label>
                <input type="number" className="input" value={form.smtp_port}
                  onChange={e => set('smtp_port', parseInt(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">SMTP username *</label>
                <input className="input" placeholder="your@email.com" value={form.smtp_user}
                  onChange={e => set('smtp_user', e.target.value)} />
              </div>
              <div>
                <label className="label">SMTP password *</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} className="input pr-10"
                    placeholder="App password" value={form.smtp_pass}
                    onChange={e => set('smtp_pass', e.target.value)} />
                  <button type="button" onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="smtp_secure" checked={form.smtp_secure}
                onChange={e => set('smtp_secure', e.target.checked)} className="rounded" />
              <label htmlFor="smtp_secure" className="text-sm text-gray-600">Use SSL/TLS (port 465)</label>
            </div>
            <hr className="border-gray-100" />
            <div>
              <label className="label">Email subject *</label>
              <input className="input" placeholder="Use {{name}} for personalization" value={form.email_subject}
                onChange={e => set('email_subject', e.target.value)} />
            </div>
            <div>
              <label className="label">Email body * (HTML supported, use {'{{name}}'}, {'{{email}}'} etc.)</label>
              <textarea className="input font-mono text-xs" rows={8}
                placeholder={'<p>Hi {{name}},</p>\n<p>I wanted to reach out...</p>'}
                value={form.email_body} onChange={e => set('email_body', e.target.value)} />
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-800 mb-5">Schedule & Sending Rules</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Schedule type</label>
                <select className="input" value={form.schedule_type}
                  onChange={e => set('schedule_type', e.target.value)}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="label">Send time (24h)</label>
                <input type="time" className="input" value={form.schedule_time}
                  onChange={e => set('schedule_time', e.target.value)} />
              </div>
            </div>
            {form.schedule_type === 'weekly' && (
              <div>
                <label className="label">Day of week</label>
                <select className="input" value={form.schedule_day_of_week}
                  onChange={e => set('schedule_day_of_week', parseInt(e.target.value))}>
                  {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d, i) => (
                    <option key={d} value={i}>{d}</option>
                  ))}
                </select>
              </div>
            )}
            {form.schedule_type === 'monthly' && (
              <div>
                <label className="label">Day of month</label>
                <input type="number" min={1} max={28} className="input" value={form.schedule_day_of_month}
                  onChange={e => set('schedule_day_of_month', parseInt(e.target.value))} />
              </div>
            )}
            <hr className="border-gray-100" />
            <div>
              <label className="label">Emails per batch</label>
              <select className="input" value={form.batch_size}
                onChange={e => set('batch_size', parseInt(e.target.value))}>
                {BATCH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Minutes between batches</label>
                <select className="input" value={form.batch_interval_minutes}
                  onChange={e => set('batch_interval_minutes', parseInt(e.target.value))}>
                  {INTERVAL_OPTIONS.map(m => <option key={m} value={m}>{m} {m === 1 ? 'minute' : 'minutes'}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Daily email limit (0 = unlimited)</label>
                <input type="number" min={0} className="input" value={form.daily_limit}
                  onChange={e => set('daily_limit', parseInt(e.target.value))} />
              </div>
            </div>
          </div>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-800 mb-2">Follow-up Settings</h2>
            <p className="text-xs text-gray-400 mb-5">Automatically send follow-up emails to leads who haven&apos;t replied.</p>

            <div>
              <label className="label">Number of follow-ups per lead (max 4)</label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => set('followup_count', Math.max(0, form.followup_count - 1))}
                  className="btn btn-sm w-8 h-8 p-0 justify-center">
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-lg font-semibold text-gray-800 w-6 text-center">{form.followup_count}</span>
                <button type="button" onClick={() => set('followup_count', Math.min(4, form.followup_count + 1))}
                  className="btn btn-sm w-8 h-8 p-0 justify-center">
                  <Plus className="w-3 h-3" />
                </button>
                <span className="text-sm text-gray-400">{form.followup_count === 0 ? 'No follow-ups' : `${form.followup_count} follow-up${form.followup_count > 1 ? 's' : ''}`}</span>
              </div>
            </div>

            {Array.from({ length: form.followup_count }, (_, i) => i + 1).map(n => (
              <div key={n} className="border border-gray-100 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700">Follow-up {n}</h3>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-400">Send after</label>
                    <select className="input w-auto py-1 text-xs"
                      value={(form as Record<string, unknown>)[`followup_day_${n}`] as number}
                      onChange={e => set(`followup_day_${n}`, parseInt(e.target.value))}>
                      {FOLLOWUP_DAYS.map(d => <option key={d} value={d}>{d} day{d > 1 ? 's' : ''}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Subject (leave blank to use original)</label>
                  <input className="input" placeholder={`Re: ${form.email_subject || 'original subject'}`}
                    value={(form as Record<string, unknown>)[`followup_subject_${n}`] as string}
                    onChange={e => set(`followup_subject_${n}`, e.target.value)} />
                </div>
                <div>
                  <label className="label">Body (leave blank to use original)</label>
                  <textarea className="input text-xs" rows={3}
                    placeholder="Just following up on my previous email..."
                    value={(form as Record<string, unknown>)[`followup_body_${n}`] as string}
                    onChange={e => set(`followup_body_${n}`, e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-4 px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">{error}</div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
            className="btn disabled:opacity-30"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {step < 4 ? (
            <button
              onClick={() => {
                if (step === 1 && (!form.name || !form.from_email)) {
                  setError('Please fill project name and from email'); return
                }
                if (step === 2 && (!form.smtp_host || !form.smtp_user || !form.smtp_pass || !form.email_subject || !form.email_body)) {
                  setError('Please fill all SMTP and email fields'); return
                }
                setError('')
                setStep(s => s + 1)
              }}
              className="btn btn-primary"
            >
              Next →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading} className="btn btn-primary">
              {loading ? <Loader2 className="w-4 h-4 spin" /> : null}
              Create Project
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
