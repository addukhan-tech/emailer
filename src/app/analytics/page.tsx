import { createClient } from '@/lib/supabase/server'
import { formatNumber } from '@/lib/utils'
import { Project } from '@/types'

export default async function AnalyticsPage() {
 const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: projects }, { data: logs }] = await Promise.all([
    supabase.from('projects').select('*').eq('user_id', user!.id),
    supabase.from('email_logs').select('status, type, sent_at, project_id, projects(name)')
      .eq('user_id', user!.id).order('sent_at', { ascending: false }).limit(500),
  ])

  const totalSent = (projects ?? []).reduce((s: number, p: Project) => s + p.total_sent, 0)
  const totalLeads = (projects ?? []).reduce((s: number, p: Project) => s + p.total_leads, 0)
  const sentLogs = (logs ?? []).filter((l: Record<string, unknown>) => l.status === 'sent')
  const failedLogs = (logs ?? []).filter((l: Record<string, unknown>) => l.status === 'failed')
  const followupLogs = sentLogs.filter((l: Record<string, unknown>) => (l.type as string).startsWith('followup'))

  // Monthly breakdown
  const monthly: Record<string, number> = {}
  sentLogs.forEach((l: Record<string, unknown>) => {
    const month = (l.sent_at as string).slice(0, 7)
    monthly[month] = (monthly[month] ?? 0) + 1
  })

  return (
    <div className="p-6 max-w-5xl mx-auto fade-in">
      <h1 className="text-xl font-semibold text-gray-900 mb-8">Analytics</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Leads', value: formatNumber(totalLeads) },
          { label: 'Total Sent', value: formatNumber(totalSent) },
          { label: 'Follow-ups Sent', value: formatNumber(followupLogs.length) },
          { label: 'Failed', value: formatNumber(failedLogs.length) },
        ].map(({ label, value }) => (
          <div key={label} className="stat-card">
            <p className="text-xs text-gray-400 mb-2">{label}</p>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Per project */}
      <div className="card overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Emails sent per project</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="th">Project</th>
              <th className="th">Status</th>
              <th className="th">Total Leads</th>
              <th className="th">Sent</th>
              <th className="th">Progress</th>
              <th className="th">Follow-ups</th>
            </tr>
          </thead>
          <tbody>
            {(projects ?? []).map((p: Project) => (
              <tr key={p.id} className="table-row">
                <td className="td font-medium text-gray-800">{p.name}</td>
                <td className="td">
                  <span className={`badge ${p.status === 'active' ? 'badge-green' : p.status === 'paused' ? 'badge-amber' : 'badge-red'}`}>
                    {p.status}
                  </span>
                </td>
                <td className="td">{formatNumber(p.total_leads)}</td>
                <td className="td">{formatNumber(p.total_sent)}</td>
                <td className="td w-32">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full"
                        style={{ width: `${p.total_leads ? Math.round((p.total_sent / p.total_leads) * 100) : 0}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-8">
                      {p.total_leads ? Math.round((p.total_sent / p.total_leads) * 100) : 0}%
                    </span>
                  </div>
                </td>
                <td className="td">{p.followup_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Monthly */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Monthly breakdown</h2>
        <div className="space-y-2">
          {Object.entries(monthly).sort((a, b) => b[0].localeCompare(a[0])).map(([month, count]) => (
            <div key={month} className="flex items-center gap-4">
              <span className="text-xs text-gray-500 w-16">{month}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-400 rounded-full"
                  style={{ width: `${Math.min(100, (count / Math.max(...Object.values(monthly))) * 100)}%` }} />
              </div>
              <span className="text-xs font-medium text-gray-700 w-10 text-right">{count}</span>
            </div>
          ))}
          {Object.keys(monthly).length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">No data yet. Start sending emails to see analytics.</p>
          )}
        </div>
      </div>
    </div>
  )
}
