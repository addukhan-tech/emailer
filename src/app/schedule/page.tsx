import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Project } from '@/types'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default async function SchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user!.id)
    .order('schedule_time', { ascending: true })

  return (
    <div className="p-6 max-w-4xl mx-auto fade-in">
      <h1 className="text-xl font-semibold text-gray-900 mb-8">Schedule Overview</h1>

      <div className="space-y-4">
        {(projects ?? []).map((p: Project) => (
          <div key={p.id} className="card p-5 flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                p.status === 'active' ? 'bg-brand-500' :
                p.status === 'paused' ? 'bg-amber-400' : 'bg-red-400'
              }`} />
              <div className="min-w-0">
                <Link href={`/projects/${p.id}/leads`}
                  className="text-sm font-medium text-gray-900 hover:text-brand-600 truncate block">
                  {p.name}
                </Link>
                <p className="text-xs text-gray-400">{p.from_email}</p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs text-gray-500 flex-wrap">
              <div className="text-center">
                <p className="text-[10px] text-gray-300 uppercase tracking-wide">Type</p>
                <p className="font-medium text-gray-700 capitalize">{p.schedule_type}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-300 uppercase tracking-wide">Time</p>
                <p className="font-medium text-gray-700">{p.schedule_time}</p>
              </div>
              {p.schedule_type === 'weekly' && p.schedule_day_of_week != null && (
                <div className="text-center">
                  <p className="text-[10px] text-gray-300 uppercase tracking-wide">Day</p>
                  <p className="font-medium text-gray-700">{DAYS[p.schedule_day_of_week]}</p>
                </div>
              )}
              <div className="text-center">
                <p className="text-[10px] text-gray-300 uppercase tracking-wide">Batch</p>
                <p className="font-medium text-gray-700">{p.batch_size === 0 ? 'All' : p.batch_size}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-300 uppercase tracking-wide">Interval</p>
                <p className="font-medium text-gray-700">{p.batch_interval_minutes}min</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-300 uppercase tracking-wide">Daily Limit</p>
                <p className="font-medium text-gray-700">{p.daily_limit}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-300 uppercase tracking-wide">Follow-ups</p>
                <p className="font-medium text-gray-700">{p.followup_count}</p>
              </div>
            </div>

            <span className={`badge flex-shrink-0 ${
              p.status === 'active' ? 'badge-green' :
              p.status === 'paused' ? 'badge-amber' : 'badge-red'
            }`}>
              {p.status}
            </span>
          </div>
        ))}

        {!(projects?.length) && (
          <div className="card p-16 text-center">
            <p className="text-sm text-gray-400 mb-3">No projects yet</p>
            <Link href="/projects/new" className="btn btn-primary btn-sm inline-flex">Create project</Link>
          </div>
        )}
      </div>

      <div className="mt-6 card p-4 bg-brand-50/50 border-brand-100">
        <p className="text-xs text-brand-700">
          <strong>How scheduling works:</strong> Vercel runs a cron job every minute. Each minute it checks
          all active projects, and if the current time matches a project&apos;s schedule time (within 2 minutes),
          it sends the next batch of emails. Daily limits reset at midnight.
        </p>
      </div>
    </div>
  )
}
