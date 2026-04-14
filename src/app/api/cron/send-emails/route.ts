import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail, getFollowupContent, shouldSendToday } from '@/lib/email'
import { Project, Lead } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const results: Record<string, unknown>[] = []

  try {
    // Fetch all active projects
    const { data: projects, error: projError } = await supabase
      .from('projects')
      .select('*')
      .eq('status', 'active')

    if (projError) throw projError
    if (!projects?.length) return NextResponse.json({ message: 'No active projects' })

    for (const project of projects as Project[]) {
      // Check if it's time to send for this project
      if (!shouldSendToday(project)) continue

      // Check daily limit
      const today = new Date().toISOString().split('T')[0]
      const { data: tracker } = await supabase
        .from('daily_send_tracker')
        .select('emails_sent')
        .eq('project_id', project.id)
        .eq('date', today)
        .single()

      const sentToday = tracker?.emails_sent ?? 0
      if (project.daily_limit > 0 && sentToday >= project.daily_limit) {
        results.push({ project: project.name, skipped: 'daily limit reached' })
        continue
      }

      const remaining = project.daily_limit > 0
        ? project.daily_limit - sentToday
        : 999999

      // Determine batch size
      const batchSize = project.batch_size === 0
        ? remaining
        : Math.min(project.batch_size, remaining)

      // --- SEND INITIAL EMAILS ---
      const { data: pendingLeads } = await supabase
        .from('leads')
        .select('*')
        .eq('project_id', project.id)
        .eq('email_status', 'pending')
        .limit(batchSize)

      let batchSent = 0

      for (const lead of (pendingLeads as Lead[]) ?? []) {
        const result = await sendEmail({
          project,
          lead,
          subject: project.email_subject,
          body: project.email_body,
        })

        const status = result.success ? 'sent' : 'failed'
        const now = new Date().toISOString()

        // Update lead
        await supabase.from('leads').update({
          email_status: status,
          email_sent_at: result.success ? now : null,
          next_followup_at: result.success && project.followup_count > 0 && project.followup_day_1
            ? new Date(Date.now() + project.followup_day_1 * 86400000).toISOString()
            : null,
        }).eq('id', lead.id)

        // Log
        await supabase.from('email_logs').insert({
          project_id: project.id,
          lead_id: lead.id,
          user_id: project.user_id,
          type: 'initial',
          to_email: lead.email,
          subject: project.email_subject,
          status,
          error_message: result.error ?? null,
          sent_at: now,
        })

        if (result.success) {
          batchSent++
          // Update project total_sent
          await supabase.from('projects').update({
            total_sent: project.total_sent + batchSent,
          }).eq('id', project.id)
        }
      }

      // --- SEND FOLLOW-UPS ---
      if (project.followup_count > 0) {
        const { data: followupLeads } = await supabase
          .from('leads')
          .select('*')
          .eq('project_id', project.id)
          .eq('email_status', 'sent')
          .lte('next_followup_at', new Date().toISOString())
          .not('next_followup_at', 'is', null)
          .limit(Math.max(0, batchSize - batchSent))

        for (const lead of (followupLeads as Lead[]) ?? []) {
          const nextStage = lead.followup_stage + 1
          if (nextStage > project.followup_count) continue

          const { subject, body } = getFollowupContent(project, nextStage)
          const result = await sendEmail({ project, lead, subject, body })
          const now = new Date().toISOString()
          const fuKey = `followup_${nextStage}_sent_at` as keyof Lead

          // Calculate next followup date
          const nextDelay = nextStage < project.followup_count
            ? (project[`followup_day_${nextStage + 1}` as keyof Project] as number | null)
            : null

          await supabase.from('leads').update({
            followup_stage: nextStage,
            [fuKey]: result.success ? now : null,
            next_followup_at: result.success && nextDelay
              ? new Date(Date.now() + nextDelay * 86400000).toISOString()
              : null,
          }).eq('id', lead.id)

          await supabase.from('email_logs').insert({
            project_id: project.id,
            lead_id: lead.id,
            user_id: project.user_id,
            type: `followup_${nextStage}`,
            to_email: lead.email,
            subject,
            status: result.success ? 'sent' : 'failed',
            error_message: result.error ?? null,
            sent_at: now,
          })

          if (result.success) batchSent++
        }
      }

      // Update daily tracker
      if (batchSent > 0) {
        await supabase.from('daily_send_tracker').upsert({
          project_id: project.id,
          date: today,
          emails_sent: sentToday + batchSent,
        }, { onConflict: 'project_id,date' })
      }

      results.push({ project: project.name, sent: batchSent })
    }

    return NextResponse.json({ success: true, results })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
