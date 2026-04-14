import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, ArrowUpRight, Mail, Users, TrendingUp, Zap } from 'lucide-react'
import { formatNumber, formatDate, getStatusColor } from '@/lib/utils'
import { Project } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: projects }, { data: recentLogs }, { count: totalLeads }] = await Promise.all([
    supabase.from('projects').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
    supabase.from('email_logs').select('*, leads(name, email), projects(name)').eq('user_id', user!.id).order('sent_at', { ascending: false }).limit(8),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
  ])

  const totalSent = (projects ?? []).reduce((sum: number, p: Project) => sum + p.total_sent, 0)
  const activeProjects = (projects ?? []).filter((p: Project) => p.status === 'active').length

  // Today's sends
  const today = new Date().toISOString().split('T')[0]
  const { data: todayTracker } = await supabase
    .from('daily_send_tracker')
    .select('emails_sent')
    .eq('date', today)
    .in('project_id', (projects ?? []).map((p: Project) => p.id))
  const sentToday = (todayTracker ?? []).reduce((s: number, t: { emails_sent: number }) => s + t.emails_sent, 0)

  return (
    <div className="p-6 max-w-6xl mx-auto fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <Link href="/projects/new" className="btn btn-primary">
          <Plus className="w-4 h-4" />
          New Project
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Sent', value: formatNumber(totalSent), icon: Mail, color: 'text-brand-600', bg: 'bg-brand-50' },
          { label: 'Total Leads', value: formatNumber(totalLeads ?? 0), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active Projects', value: activeProjects, icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Sent Today', value: formatNumber(sentToday), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400">{label}</p>
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Projects */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Projects</h2>
            <Link href="/projects" className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {(projects ?? []).slice(0, 5).map((p: Project) => (
              <Link key={p.id} href={`/projects/${p.id}/leads`} className="card block p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${
                      p.status === 'active' ? 'bg-brand-500' :
                      p.status === 'paused' ? 'bg-amber-400' : 'bg-red-400'
                    }`} />
                    <span className="text-sm font-medium text-gray-800">{p.name}</span>
                  </div>
                  <span className={`badge ${
                    p.status === 'active' ? 'badge-green' :
                    p.status === 'paused' ? 'badge-amber' : 'badge-red'
                  }`}>
                    {p.status}
                  </span>
                </div>
                <div className="flex items-center gap-6 text-xs text-gray-400 mb-3">
                  <span>{formatNumber(p.total_leads)} leads</span>
                  <span>{formatNumber(p.total_sent)} sent</span>
                  <span className="truncate text-gray-300">{p.from_email}</span>
                </div>
                {/* Progress */}
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full transition-all"
                    style={{ width: `${p.total_leads ? Math.round((p.total_sent / p.total_leads) * 100) : 0}%` }}
                  />
                </div>
              </Link>
            ))}
            {!(projects?.length) && (
              <div className="card p-8 text-center">
                <Mail className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No projects yet</p>
                <Link href="/projects/new" className="btn btn-primary btn-sm mt-3 inline-flex">
                  Create first project
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Recent Activity</h2>
          <div className="card divide-y divide-gray-50">
            {(recentLogs ?? []).map((log: Record<string, unknown>) => (
              <div key={log.id as string} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">
                      {(log.leads as Record<string, string>)?.name || (log.leads as Record<string, string>)?.email}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                      {(log.projects as Record<string, string>)?.name} &middot; {log.type as string}
                    </p>
                  </div>
                  <span className={`badge flex-shrink-0 ${log.status === 'sent' ? 'badge-green' : 'badge-red'}`}>
                    {log.status as string}
                  </span>
                </div>
                <p className="text-[10px] text-gray-300 mt-1">{formatDate(log.sent_at as string)}</p>
              </div>
            ))}
            {!(recentLogs?.length) && (
              <div className="px-4 py-8 text-center">
                <p className="text-xs text-gray-400">No emails sent yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
