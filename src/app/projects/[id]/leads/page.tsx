'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Upload, RefreshCw, Trash2, Search,
  CheckCircle2, Clock, XCircle, Loader2, Sheet, Eye, MessageSquare
} from 'lucide-react'
import Papa from 'papaparse'
import { Lead, Project } from '@/types'
import { formatDate, formatDateTime, cn } from '@/lib/utils'

type Tab = 'all' | 'pending' | 'sent' | 'failed' | 'followup' | 'replied' | 'opened'

export default function ProjectLeadsPage() {
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchProject()
    fetchLeads()
  }, [tab])

  const fetchProject = async () => {
    const res = await fetch(`/api/projects/${projectId}`)
    if (res.ok) setProject(await res.json())
  }

  const fetchLeads = async () => {
    setLoading(true)
    const p = new URLSearchParams({ project_id: projectId, limit: '100' })
    if (tab === 'pending' || tab === 'sent' || tab === 'failed') p.set('status', tab)
    const res = await fetch(`/api/leads?${p}`)
    if (res.ok) {
      const data = await res.json()
      let filtered = data.data as (Lead & { replied?: boolean; email_opened?: boolean; email_open_count?: number; tracking_token?: string })[]
      if (tab === 'followup') filtered = filtered.filter(l => l.followup_stage > 0)
      if (tab === 'replied') filtered = filtered.filter(l => l.replied)
      if (tab === 'opened') filtered = filtered.filter(l => l.email_opened)
      if (search) filtered = filtered.filter(l =>
        l.email.includes(search) || (l.name ?? '').toLowerCase().includes(search.toLowerCase())
      )
      setLeads(filtered)
      setTotal(data.count)
    }
    setLoading(false)
  }

  const toggleReplied = async (lead: Lead & { replied?: boolean }) => {
    const newVal = !lead.replied
    await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ replied: newVal, replied_at: newVal ? new Date().toISOString() : null }),
    })
    fetchLeads()
  }

  const handleDeleteSelected = async () => {
    if (!selected.size || !confirm(`Delete ${selected.size} lead(s)?`)) return
    await fetch('/api/leads', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selected] }),
    })
    setSelected(new Set())
    fetchLeads()
  }

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Record<string, string>[]
        const leads = rows.map(row => {
          // Find email column
          const emailKey = Object.keys(row).find(k =>
            ['email', 'Email', 'EMAIL', 'email address', 'Email Address'].includes(k)
          )
          const email = emailKey ? row[emailKey]?.trim() : ''

          // Find name column - first name or full name
          const nameKey = Object.keys(row).find(k =>
            ['name', 'Name', 'first name', 'First Name', 'firstname', 'FirstName', 'full name', 'Full Name'].includes(k)
          )
          const name = nameKey ? row[nameKey]?.trim() : null

          // If no email, mark as no_email
          if (!email) {
            return { project_id: projectId, email: '', name, data: {}, source: 'csv', email_status: 'no_email' }
          }

          return { project_id: projectId, email, name, data: {}, source: 'csv' }
        })

        await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leads),
        })
        setImporting(false)
        setShowImportModal(false)
        fetchLeads()
      },
    })
  }

  const statusIcon = (lead: Lead) => {
    if (lead.email_status === 'sent') return <CheckCircle2 className="w-3.5 h-3.5 text-brand-500" />
    if (lead.email_status === 'failed') return <XCircle className="w-3.5 h-3.5 text-red-400" />
    if (lead.email_status === 'no_email') return <XCircle className="w-3.5 h-3.5 text-gray-400" />
    return <Clock className="w-3.5 h-3.5 text-amber-400" />
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'sent', label: 'Sent' },
    { key: 'opened', label: 'Opened' },
    { key: 'replied', label: 'Replied' },
    { key: 'followup', label: 'Follow-up' },
    { key: 'failed', label: 'Failed' },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/projects" className="btn btn-sm"><ArrowLeft className="w-3.5 h-3.5" /></Link>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{project?.name ?? 'Project'}</h1>
            <p className="text-xs text-gray-400 mt-0.5">{total} leads total &bull; {project?.from_email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/projects/${projectId}/settings`} className="btn btn-sm">Settings</Link>
          <button onClick={() => setShowImportModal(true)} className="btn btn-sm">
            <Upload className="w-3.5 h-3.5" /> Import
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm">
            <Plus className="w-3.5 h-3.5" /> Add Lead
          </button>
        </div>
      </div>

      {project && (
        <div className="card p-4 mb-5 flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${project.status === 'active' ? 'bg-brand-500' : project.status === 'paused' ? 'bg-amber-400' : 'bg-red-400'}`} />
            <span className="text-sm font-medium capitalize text-gray-700">{project.status}</span>
          </div>
          <div className="h-4 w-px bg-gray-100" />
          <span className="text-xs text-gray-400">Schedule: <b className="text-gray-600">{project.schedule_type} at {project.schedule_time}</b></span>
          <span className="text-xs text-gray-400">Batch: <b className="text-gray-600">{project.batch_size === 0 ? 'All' : project.batch_size}</b></span>
          <span className="text-xs text-gray-400">Interval: <b className="text-gray-600">{project.batch_interval_minutes}min</b></span>
          <span className="text-xs text-gray-400">Daily limit: <b className="text-gray-600">{project.daily_limit}</b></span>
          <span className="text-xs text-gray-400">Follow-ups: <b className="text-gray-600">{project.followup_count}</b></span>
          <div className="ml-auto flex gap-2">
            {project.status !== 'active' && (
              <button onClick={async () => { await fetch(`/api/projects/${projectId}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ status: 'active' }) }); fetchProject() }} className="btn btn-sm btn-primary">Resume</button>
            )}
            {project.status === 'active' && (
              <button onClick={async () => { await fetch(`/api/projects/${projectId}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ status: 'paused' }) }); fetchProject() }} className="btn btn-sm">Pause</button>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 flex-wrap">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button onClick={handleDeleteSelected} className="btn btn-sm btn-danger">
              <Trash2 className="w-3.5 h-3.5" /> Delete {selected.size}
            </button>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input className="input pl-8 pr-3 py-1.5 text-xs w-52" placeholder="Search leads..."
              value={search} onChange={e => { setSearch(e.target.value); fetchLeads() }} />
          </div>
          <button onClick={fetchLeads} className="btn btn-sm"><RefreshCw className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="th w-8">
                  <input type="checkbox" className="rounded"
                    onChange={e => setSelected(e.target.checked ? new Set(leads.map(l => l.id)) : new Set())}
                    checked={selected.size === leads.length && leads.length > 0} />
                </th>
                <th className="th">Name</th>
                <th className="th">Email</th>
                <th className="th">Added</th>
                <th className="th">Source</th>
                <th className="th" style={{ background: '#f0fdf8', color: '#15803d' }}>📌 Email Status</th>
                <th className="th" style={{ background: '#f0fdf8', color: '#15803d' }}>Sent At</th>
                <th className="th" style={{ background: '#f0fdf8', color: '#15803d' }}>👁 Opened</th>
                <th className="th" style={{ background: '#f0fdf8', color: '#15803d' }}>💬 Replied</th>
                <th className="th" style={{ background: '#f0fdf8', color: '#15803d' }}>Follow-ups</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={10} className="td text-center py-12">
                  <Loader2 className="w-5 h-5 spin mx-auto text-gray-300" />
                </td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={10} className="td text-center py-12 text-gray-400 text-sm">
                  No leads found. Add leads manually or import a CSV.
                </td></tr>
              ) : (leads as (Lead & { replied?: boolean; email_opened?: boolean; email_open_count?: number })[]).map(lead => (
                <tr key={lead.id} className="table-row">
                  <td className="td w-8">
                    <input type="checkbox" className="rounded"
                      checked={selected.has(lead.id)}
                      onChange={e => {
                        const s = new Set(selected)
                        e.target.checked ? s.add(lead.id) : s.delete(lead.id)
                        setSelected(s)
                      }} />
                  </td>
                  <td className="td font-medium text-gray-800">{lead.name || '—'}</td>
                  <td className="td text-gray-500 text-xs">{lead.email || <span className="text-gray-300 italic">no email</span>}</td>
                  <td className="td text-gray-400 text-xs">{formatDate(lead.created_at)}</td>
                  <td className="td">
                    <span className="badge badge-gray capitalize">{lead.source}</span>
                  </td>
                  {/* Pinned Email Status */}
                  <td className="td" style={{ background: '#f0fdf8' }}>
                    <div className="flex items-center gap-1.5">
                      {statusIcon(lead)}
                      <span className={cn('badge text-xs',
                        lead.email_status === 'sent' ? 'badge-green' :
                        lead.email_status === 'failed' ? 'badge-red' :
                        lead.email_status === 'no_email' ? 'badge-gray' : 'badge-amber'
                      )}>
                        {lead.email_status === 'no_email' ? 'No Email' : lead.email_status}
                      </span>
                    </div>
                  </td>
                  {/* Sent At */}
                  <td className="td text-xs" style={{ background: '#f0fdf8' }}>
                    {formatDateTime(lead.email_sent_at)}
                  </td>
                  {/* Pinned Opened */}
                  <td className="td text-xs" style={{ background: '#f0fdf8' }}>
                    {lead.email_opened ? (
                      <div className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-brand-500" />
                        <span className="badge badge-green">{lead.email_open_count}x</span>
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  {/* Pinned Replied - clickable toggle */}
                  <td className="td" style={{ background: '#f0fdf8' }}>
                    <button
                      onClick={() => toggleReplied(lead)}
                      title={lead.replied ? 'Mark as not replied' : 'Mark as replied'}
                      className={cn(
                        'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all',
                        lead.replied
                          ? 'bg-brand-50 text-brand-700 hover:bg-red-50 hover:text-red-600'
                          : 'bg-gray-50 text-gray-400 hover:bg-brand-50 hover:text-brand-600'
                      )}>
                      <MessageSquare className="w-3 h-3" />
                      {lead.replied ? 'Replied' : 'Mark'}
                    </button>
                  </td>
                  {/* Follow-ups */}
                  <td className="td text-xs" style={{ background: '#f0fdf8' }}>
                    {lead.followup_stage > 0
                      ? <span className="badge badge-blue">FU {lead.followup_stage}</span>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <AddLeadModal projectId={projectId} onClose={() => setShowAddModal(false)} onSaved={() => { setShowAddModal(false); fetchLeads() }} />
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <h2 className="text-base font-semibold mb-2">Import Leads</h2>
            <p className="text-xs text-gray-400 mb-4">Only <strong>name/first name</strong> and <strong>email</strong> columns are imported. Leads without email are marked as "No Email".</p>
            <div className="space-y-3">
              <button onClick={() => fileRef.current?.click()}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 text-left">
                <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-brand-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Upload CSV file</p>
                  <p className="text-xs text-gray-400">Imports name + email columns only</p>
                </div>
                {importing && <Loader2 className="w-4 h-4 spin ml-auto text-gray-400" />}
              </button>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />

              <button className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 text-left">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Sheet className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Import from Google Sheets</p>
                  <p className="text-xs text-gray-400">Imports name + email columns only</p>
                </div>
              </button>

              <button className="w-full flex items-center gap-3 p-4 border border-dashed border-gray-200 rounded-xl hover:bg-gray-50 text-left">
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Connect Google Sheets (live sync)</p>
                  <p className="text-xs text-gray-400">New rows auto-add leads here</p>
                </div>
              </button>
            </div>
            <div className="flex justify-end mt-5">
              <button onClick={() => setShowImportModal(false)} className="btn btn-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AddLeadModal({ projectId, onClose, onSaved }: {
  projectId: string; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState({ email: '', name: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setLoading(true)
    const status = form.email ? 'pending' : 'no_email'
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, email: form.email, name: form.name, data: {}, email_status: status }),
    })
    if (!res.ok) { const d = await res.json(); setError(d.error); setLoading(false); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="card p-6 w-full max-w-md">
        <h2 className="text-base font-semibold mb-4">Add Lead</h2>
        <div className="space-y-3">
          <div>
            <label className="label">Name</label>
            <input className="input" placeholder="John Doe"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Email (leave blank if no email)</label>
            <input className="input" type="email" placeholder="john@company.com"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="btn btn-sm">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="btn btn-primary btn-sm">
            {loading && <Loader2 className="w-3.5 h-3.5 spin" />}
            Add Lead
          </button>
        </div>
      </div>
    </div>
  )
}
