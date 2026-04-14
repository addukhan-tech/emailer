'use client'

import { useState, useEffect } from 'react'
import { Search, RefreshCw, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Lead } from '@/types'
import { formatDate, formatDateTime, cn } from '@/lib/utils'

export default function LeadsPage() {
  const [leads, setLeads] = useState<(Lead & { projects: { name: string; id: string } })[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')

  const fetchLeads = async () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '200' })
    if (status !== 'all') params.set('status', status)
    const res = await fetch(`/api/leads?${params}`)
    if (res.ok) {
      const data = await res.json()
      setLeads(data.data)
    }
    setLoading(false)
  }

  useEffect(() => { fetchLeads() }, [status])

  const filtered = leads.filter(l =>
    !search ||
    l.email.toLowerCase().includes(search.toLowerCase()) ||
    (l.name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 max-w-6xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">All Leads</h1>
          <p className="text-sm text-gray-400 mt-0.5">{filtered.length} leads</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {['all', 'pending', 'sent', 'failed'].map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize',
                status === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}>
              {s}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input className="input pl-8 text-xs w-56" placeholder="Search by name or email..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={fetchLeads} className="btn btn-sm">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">Name</th>
                <th className="th">Email</th>
                <th className="th">Project</th>
                <th className="th">Source</th>
                <th className="th">Added</th>
                <th className="th" style={{ background: '#f0fdf8', color: '#15803d' }}>📌 Email Status</th>
                <th className="th" style={{ background: '#f0fdf8', color: '#15803d' }}>Sent At</th>
                <th className="th" style={{ background: '#f0fdf8', color: '#15803d' }}>Follow-up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="td text-center py-12">
                  <Loader2 className="w-5 h-5 spin mx-auto text-gray-300" />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="td text-center py-12 text-gray-400 text-sm">
                  No leads found
                </td></tr>
              ) : filtered.map(lead => (
                <tr key={lead.id} className="table-row">
                  <td className="td font-medium text-gray-800">{lead.name || '—'}</td>
                  <td className="td text-gray-500 text-xs">{lead.email}</td>
                  <td className="td">
                    <Link href={`/projects/${lead.project_id}/leads`}
                      className="badge badge-gray hover:badge-blue transition-colors">
                      {(lead as Record<string, unknown> & { projects?: { name: string } }).projects?.name ?? '—'}
                    </Link>
                  </td>
                  <td className="td">
                    <span className="badge badge-gray capitalize">{lead.source}</span>
                  </td>
                  <td className="td text-xs text-gray-400">{formatDate(lead.created_at)}</td>
                  <td className="td" style={{ background: '#f0fdf8' }}>
                    <span className={cn('badge',
                      lead.email_status === 'sent' ? 'badge-green' :
                      lead.email_status === 'failed' ? 'badge-red' : 'badge-amber'
                    )}>
                      {lead.email_status}
                    </span>
                  </td>
                  <td className="td text-xs" style={{ background: '#f0fdf8' }}>
                    {formatDateTime(lead.email_sent_at)}
                  </td>
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
    </div>
  )
}
