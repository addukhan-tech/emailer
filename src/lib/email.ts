import nodemailer from 'nodemailer'
import { Project, Lead } from '@/types'

// Replace template variables like {{name}}, {{email}}, {{company}}
export function renderTemplate(template: string, lead: Lead): string {
  let result = template
  result = result.replace(/\{\{name\}\}/gi, lead.name || '')
  result = result.replace(/\{\{email\}\}/gi, lead.email)
  // Replace any custom data fields
  if (lead.data) {
    Object.entries(lead.data).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), String(value))
    })
  }
  return result
}

export function createTransporter(project: Project) {
  return nodemailer.createTransport({
    host: project.smtp_host,
    port: project.smtp_port,
    secure: project.smtp_secure,
    auth: {
      user: project.smtp_user,
      pass: project.smtp_pass,
    },
    tls: { rejectUnauthorized: false },
  })
}

export async function sendEmail({
  project,
  lead,
  subject,
  body,
}: {
  project: Project
  lead: Lead
  subject: string
  body: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = createTransporter(project)
    const renderedSubject = renderTemplate(subject, lead)
    const renderedBody = renderTemplate(body, lead)

    await transporter.sendMail({
      from: project.from_name
        ? `"${project.from_name}" <${project.from_email}>`
        : project.from_email,
      to: lead.email,
      subject: renderedSubject,
      html: renderedBody,
      text: renderedBody.replace(/<[^>]*>/g, ''),
    })

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export function getFollowupContent(project: Project, stage: number) {
  const subjects: Record<number, string | null> = {
    1: project.followup_subject_1,
    2: project.followup_subject_2,
    3: project.followup_subject_3,
    4: project.followup_subject_4,
  }
  const bodies: Record<number, string | null> = {
    1: project.followup_body_1,
    2: project.followup_body_2,
    3: project.followup_body_3,
    4: project.followup_body_4,
  }
  return {
    subject: subjects[stage] || project.email_subject,
    body: bodies[stage] || project.email_body,
  }
}

export function getFollowupDelay(project: Project, stage: number): number | null {
  const days: Record<number, number | null> = {
    1: project.followup_day_1,
    2: project.followup_day_2,
    3: project.followup_day_3,
    4: project.followup_day_4,
  }
  return days[stage] ?? null
}

export function shouldSendToday(project: Project): boolean {
  const now = new Date()
  const [hours, minutes] = project.schedule_time.split(':').map(Number)
  const scheduledToday = new Date()
  scheduledToday.setHours(hours, minutes, 0, 0)

  // Only run within a 2-minute window of scheduled time
  const diff = Math.abs(now.getTime() - scheduledToday.getTime())
  if (diff > 2 * 60 * 1000) return false

  if (project.schedule_type === 'daily') return true

  if (project.schedule_type === 'weekly') {
    return now.getDay() === (project.schedule_day_of_week ?? 1)
  }

  if (project.schedule_type === 'monthly') {
    return now.getDate() === (project.schedule_day_of_month ?? 1)
  }

  return false
}
