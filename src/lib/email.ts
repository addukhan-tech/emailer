import nodemailer from 'nodemailer'
import { Project, Lead } from '@/types'

export function renderTemplate(template: string, lead: Lead): string {
  let result = template
  const firstName = lead.name ? lead.name.trim().split(' ')[0] : ''
  const fullName = lead.name || ''
  result = result.replace(/\{\{first_name\}\}/gi, firstName)
  result = result.replace(/\{\{name\}\}/gi, firstName)
  result = result.replace(/\{\{full_name\}\}/gi, fullName)
  result = result.replace(/\{\{email\}\}/gi, lead.email)
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
    auth: { user: project.smtp_user, pass: project.smtp_pass },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  })
}

export function getTrackingPixel(leadToken: string, appUrl: string): string {
  return `<img src="${appUrl}/api/track/${leadToken}" width="1" height="1" style="display:none;" alt="" />`
}

export async function sendEmail({
  project, lead, subject, body, appUrl,
}: {
  project: Project
  lead: Lead & { tracking_token?: string }
  subject: string
  body: string
  appUrl?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = createTransporter(project)
    const renderedSubject = renderTemplate(subject, lead)
    let renderedBody = renderTemplate(body, lead)
    if (appUrl && lead.tracking_token) {
      renderedBody = renderedBody + `<img src="${appUrl}/api/track/${lead.tracking_token}" width="1" height="1" style="display:none;" alt="" />`
    }
    await transporter.sendMail({
      from: project.from_name ? `"${project.from_name}" <${project.from_email}>` : project.from_email,
      to: lead.email,
      subject: renderedSubject,
      html: renderedBody,
      text: renderedBody.replace(/<[^>]*>/g, ''),
    })
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('SMTP Error:', message)
    return { success: false, error: message }
  }
}

export function getFollowupContent(project: Project, stage: number) {
  const subjects: Record<number, string | null> = { 1: project.followup_subject_1, 2: project.followup_subject_2, 3: project.followup_subject_3, 4: project.followup_subject_4 }
  const bodies: Record<number, string | null> = { 1: project.followup_body_1, 2: project.followup_body_2, 3: project.followup_body_3, 4: project.followup_body_4 }
  return { subject: subjects[stage] || project.email_subject, body: bodies[stage] || project.email_body }
}

export function getFollowupDelay(project: Project, stage: number): number | null {
  const days: Record<number, number | null> = { 1: project.followup_day_1, 2: project.followup_day_2, 3: project.followup_day_3, 4: project.followup_day_4 }
  return days[stage] ?? null
}

export function shouldSendToday(project: Project): boolean {
  const now = new Date()
  const [hours, minutes] = project.schedule_time.split(':').map(Number)
  
  // Check if current time matches schedule (within 5 minute window)
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  
  if (Math.abs(currentHour - hours) > 0) return false
  if (Math.abs(currentMinute - minutes) > 5) return false
  
  // Check day of week for weekly schedule
  if (project.schedule_type === 'weekly') {
    return now.getDay() === (project.schedule_day_of_week ?? 1)
  }
  
  // Check day of month for monthly schedule
  if (project.schedule_type === 'monthly') {
    return now.getDate() === (project.schedule_day_of_month ?? 1)
  }
  
  return true
}