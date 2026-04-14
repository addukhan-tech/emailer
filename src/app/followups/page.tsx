import { createClient } from '@/lib/supabase/server'
import { formatDateTime, formatDate } from '@/lib/utils'
import { Lead } from '@/types'

export default async function FollowupsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: leads } = await supabase
    .from('leads')
    .select('*, projects(name, followup_count)')
    .eq('user_id', user!.id)
    .eq('email_status', 'sent')
    .gt('followup_stage', -1)
    .not('next_followup_at', 'is', null)
    .order('next_followup_at', { ascending: true })
    .limit(200)

  const now = new Date()
  const overdue = (leads ?? []).filter((l: Lead) => new Date(l.next_followup_at!) < now)
  const upcoming = (leads ?? []).filter((l: Lead) => new Date(l.next_followup_at!) >= now)

  return (
    <div className="p-6 max-w-5xl mx-auto fade-in">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">Follow-ups</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {overdue.length} overdue &bull; {upcoming.length} upcoming
        </p>
      </div>

      {overdue.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-3">Overdue</h2>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-red-50/50">
                <tr>
                  <th className="th">Lead</th>
                  <th className="th">Email</th>
                  <th className="th">Project</th>
                  <th className="th">Stage</th>
                  <th className="th">Scheduled For</th>
                </tr>
              </thead>
              <tbody>
                {overdue.map((lead: Lead & { projects: { name: string } }) => (
                  <tr key={lead.id} className="table-row">
                    <td className="td font-medium">{lead.name || '—'}</td>
                    <td className="td text-gray-400">{lead.email}</td>
                    <td className="td"><span className="badge badge-gray">{lead.projects?.name}</span></td>
                    <td className="td"><span className="badge badge-blue">FU {lead.followup_stage + 1}</span></td>
                    <td className="td text-red-500 text-xs">{formatDateTime(lead.next_followup_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Upcoming</h2>
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">Lead</th>
                <th className="th">Email</th>
                <th className="th">Project</th>
                <th className="th">Stage</th>
                <th className="th">Scheduled For</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((lead: Lead & { projects: { name: string } }) => (
                <tr key={lead.id} className="table-row">
                  <td className="td font-medium">{lead.name || '—'}</td>
                  <td className="td text-gray-400">{lead.email}</td>
                  <td className="td"><span className="badge badge-gray">{lead.projects?.name}</span></td>
                  <td className="td"><span className="badge badge-blue">FU {lead.followup_stage + 1}</span></td>
                  <td className="td text-xs text-gray-500">{formatDateTime(lead.next_followup_at)}</td>
                </tr>
              ))}
              {upcoming.length === 0 && (
                <tr><td colSpan={5} className="td text-center py-10 text-gray-400 text-sm">
                  No upcoming follow-ups
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
