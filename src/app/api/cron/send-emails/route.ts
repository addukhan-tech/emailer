import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail, getFollowupContent, shouldSendToday } from '@/lib/email'
import { Project, Lead } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || ''
  const results: Record<string, unknown>[] = []

  try {
    const { data: projects, error: projError } = await supabase
      .from('projects').select('*').eq('status', 'active')

    if (projError) throw projError
    if (!projects?.length) return NextResponse.json({ message: 'No active projects' })

    for (const project of projects as Project[]) {
      const today = new Date().toISOString().split('T')[0]
      let batchSent = 0

      // ─── FOLLOWUPS ─────────────────────────────────────────────
      // Followups run on every cron tick regardless of schedule window
      // They are time-based (next_followup_at) not schedule-based
      if (project.followup_count > 0) {
        const { data: followupLeads } = await supabase
          .from('leads').select('*')
          .eq('project_id', project.id)
          .eq('email_status', 'sent')
          .eq('replied', false)
          .lte('next_followup_at', new Date().toISOString())
          .not('next_followup_at', 'is', null)
          .limit(50)

        for (const lead of (followupLeads as (Lead & { tracking_token?: string })[]) ?? []) {
          const nextStage = lead.followup_stage + 1
          if (nextStage > project.followup_count) continue

          const { subject, body } = getFollowupContent(project, nextStage)
          const result = await sendEmail({ project, lead, subject, body, appUrl })
          const now = new Date().toISOString()
          const fuKey = `followup_${nextStage}_sent_at` as keyof Lead
          const nextDelay = nextStage < project.followup_count
            ? (project[`followup_day_${nextStage + 1}` as keyof Project] as number | null) : null

          await supabase.from('leads').update({
            followup_stage: nextStage,
            [fuKey]: result.success ? now : null,
            next_followup_at: result.success && nextDelay
              ? new Date(Date.now() + nextDelay * 86400000).toISOString() : null,
          }).eq('id', lead.id)

          await supabase.from('email_logs').insert({
            project_id: project.id, lead_id: lead.id, user_id: project.user_id,
            type: `followup_${nextStage}`, to_email: lead.email, subject,
            status: result.success ? 'sent' : 'failed',
            error_message: result.error ?? null, sent_at: now,
          })

          if (result.success) batchSent++
        }
      }

      // ─── INITIAL EMAILS ────────────────────────────────────────
      // Initial emails only send within the scheduled time window
      if (!shouldSendToday(project)) {
        if (batchSent > 0) {
          // Still update tracker if followups went out
          await supabase.from('daily_send_tracker').upsert({
            project_id: project.id,
            date: today,
            emails_sent: (await supabase.from('daily_send_tracker').select('emails_sent').eq('project_id', project.id).eq('date', today).single()).data?.emails_sent ?? 0 + batchSent,
            last_sent_at: new Date().toISOString(),
          }, { onConflict: 'project_id,date' })
          await supabase.from('projects').update({ total_sent: project.total_sent + batchSent }).eq('id', project.id)
        }
        results.push({ project: project.name, followups_sent: batchSent, skipped_initial: 'outside schedule window' })
        continue
      }

      // Check how many we already sent today and when last email was sent
      const { data: tracker } = await supabase
        .from('daily_send_tracker')
        .select('emails_sent, last_sent_at')
        .eq('project_id', project.id)
        .eq('date', today)
        .single()

      const sentToday = tracker?.emails_sent ?? 0

      // Only stop initials if we've hit the daily limit
      if (project.daily_limit > 0 && sentToday >= project.daily_limit) {
        results.push({ project: project.name, skipped: 'daily limit reached', followups_sent: batchSent })
        continue
      }

      // Check interval — if last email was sent less than batch_interval_minutes ago, skip
      if (tracker?.last_sent_at && project.batch_interval_minutes > 0) {
        const lastSent = new Date(tracker.last_sent_at).getTime()
        const now = Date.now()
        const minutesSinceLastSend = (now - lastSent) / 60000
        if (minutesSinceLastSend < project.batch_interval_minutes) {
          results.push({
            project: project.name,
            skipped: `interval not reached (${Math.round(minutesSinceLastSend)}/${project.batch_interval_minutes} min)`,
            followups_sent: batchSent,
          })
          continue
        }
      }

      const remaining = project.daily_limit > 0 ? project.daily_limit - sentToday : 999999
      const batchSize = project.batch_size === 0 ? remaining : Math.min(project.batch_size, remaining)

      const { data: pendingLeads } = await supabase
        .from('leads').select('*')
        .eq('project_id', project.id)
        .eq('email_status', 'pending')
        .eq('replied', false)
        .not('email', 'is', null)
        .neq('email', '')
        .limit(batchSize)

      let initialSent = 0

      for (const lead of (pendingLeads as (Lead & { tracking_token?: string })[]) ?? []) {
        console.log('Attempting to send to:', lead.email, 'via', project.smtp_host, project.smtp_port)
        const result = await sendEmail({ project, lead, subject: project.email_subject, body: project.email_body, appUrl })
        const status = result.success ? 'sent' : 'failed'
        const now = new Date().toISOString()

        await supabase.from('leads').update({
          email_status: status,
          email_sent_at: result.success ? now : null,
          next_followup_at: result.success && project.followup_count > 0 && project.followup_day_1
            ? new Date(Date.now() + project.followup_day_1 * 86400000).toISOString() : null,
        }).eq('id', lead.id)

        await supabase.from('email_logs').insert({
          project_id: project.id, lead_id: lead.id, user_id: project.user_id,
          type: 'initial', to_email: lead.email, subject: project.email_subject,
          status, error_message: result.error ?? null, sent_at: now,
        })

        if (result.success) initialSent++
      }

      batchSent += initialSent

      if (batchSent > 0) {
        await supabase.from('daily_send_tracker').upsert({
          project_id: project.id,
          date: today,
          emails_sent: sentToday + batchSent,
          last_sent_at: new Date().toISOString(),
        }, { onConflict: 'project_id,date' })
        await supabase.from('projects').update({ total_sent: project.total_sent + batchSent }).eq('id', project.id)
      }

      results.push({ project: project.name, initial_sent: initialSent, followups_sent: batchSent - initialSent })
    }

    return NextResponse.json({ success: true, results })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}