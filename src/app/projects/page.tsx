import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Settings, Users, Mail, Pause, Play, StopCircle } from 'lucide-react'
import { formatNumber, formatDate } from '@/lib/utils'
import { Project } from '@/types'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 max-w-6xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-400 mt-0.5">{projects?.length ?? 0} projects total</p>
        </div>
        <Link href="/projects/new" className="btn btn-primary">
          <Plus className="w-4 h-4" />
          New Project
        </Link>
      </div>

      {!(projects?.length) ? (
        <div className="card p-16 text-center">
          <Mail className="w-10 h-10 text-gray-200 mx-auto mb-4" />
          <h2 className="text-base font-medium text-gray-600 mb-2">No projects yet</h2>
          <p className="text-sm text-gray-400 mb-6">Create your first email outreach project to get started.</p>
          <Link href="/projects/new" className="btn btn-primary inline-flex">
            <Plus className="w-4 h-4" /> Create project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p: Project) => (
            <div key={p.id} className="card p-5 hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      p.status === 'active' ? 'bg-brand-500' :
                      p.status === 'paused' ? 'bg-amber-400' : 'bg-red-400'
                    }`} />
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{p.name}</h3>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 truncate pl-4">{p.from_email}</p>
                </div>
                <span className={`badge ml-2 flex-shrink-0 ${
                  p.status === 'active' ? 'badge-green' :
                  p.status === 'paused' ? 'badge-amber' : 'badge-red'
                }`}>
                  {p.status}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: 'Leads', value: formatNumber(p.total_leads) },
                  { label: 'Sent', value: formatNumber(p.total_sent) },
                  { label: 'Follow-ups', value: p.followup_count },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-sm font-semibold text-gray-800">{value}</p>
                    <p className="text-[10px] text-gray-400">{label}</p>
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>Progress</span>
                  <span>{p.total_leads ? Math.round((p.total_sent / p.total_leads) * 100) : 0}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full"
                    style={{ width: `${p.total_leads ? Math.round((p.total_sent / p.total_leads) * 100) : 0}%` }}
                  />
                </div>
              </div>

              {/* Schedule info */}
              <div className="flex items-center gap-3 text-[10px] text-gray-400 mb-4 pb-4 border-b border-gray-50">
                <span className="capitalize">{p.schedule_type} at {p.schedule_time}</span>
                <span>&bull;</span>
                <span>{p.batch_size === 0 ? 'All leads' : `${p.batch_size}/batch`}</span>
                <span>&bull;</span>
                <span>Limit {p.daily_limit}/day</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Link href={`/projects/${p.id}/leads`} className="btn btn-sm flex-1 justify-center">
                  <Users className="w-3 h-3" /> Leads
                </Link>
                <Link href={`/projects/${p.id}/settings`} className="btn btn-sm">
                  <Settings className="w-3 h-3" />
                </Link>
              </div>

              <p className="text-[10px] text-gray-300 mt-3">Created {formatDate(p.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
