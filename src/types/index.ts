export type UserRole = 'admin' | 'member'
export type ProjectStatus = 'active' | 'paused' | 'stopped'
export type ScheduleType = 'daily' | 'weekly' | 'monthly'
export type LeadEmailStatus = 'pending' | 'sent' | 'failed' | 'unsubscribed' | 'no_email'
export type EmailLogType = 'initial' | 'followup_1' | 'followup_2' | 'followup_3' | 'followup_4'
export type LeadSource = 'manual' | 'csv' | 'sheets'
 
export interface CustomField {
  key: string       // e.g. "clinic_name" — used in {{clinic_name}}
  label: string     // e.g. "Clinic Name" — shown in UI
}
 
export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  created_at: string
}
 
export interface Project {
  id: string
  user_id: string
  name: string
  description: string | null
  from_email: string
  from_name: string | null
  smtp_host: string
  smtp_port: number
  smtp_user: string
  smtp_pass: string
  smtp_secure: boolean
  email_subject: string
  email_body: string
  schedule_type: ScheduleType
  schedule_time: string
  schedule_day_of_week: number | null
  schedule_day_of_month: number | null
  batch_size: number
  batch_interval_minutes: number
  daily_limit: number
  followup_count: number
  followup_day_1: number | null
  followup_day_2: number | null
  followup_day_3: number | null
  followup_day_4: number | null
  followup_subject_1: string | null
  followup_body_1: string | null
  followup_subject_2: string | null
  followup_body_2: string | null
  followup_subject_3: string | null
  followup_body_3: string | null
  followup_subject_4: string | null
  followup_body_4: string | null
  status: ProjectStatus
  sheets_connected: boolean
  sheets_id: string | null
  sheets_tab: string | null
  sheets_email_column: string | null
  total_leads: number
  total_sent: number
  // Custom personalization fields defined per project
  custom_fields: CustomField[] | null
  created_at: string
  updated_at: string
}
 
export interface ProjectColumn {
  id: string
  project_id: string
  name: string
  column_key: string
  position: number
  is_email_column: boolean
  created_at: string
}
 
export interface Lead {
  id: string
  project_id: string
  user_id: string
  email: string
  name: string | null
  data: Record<string, string>
  email_status: LeadEmailStatus
  email_sent_at: string | null
  followup_stage: number
  followup_1_sent_at: string | null
  followup_2_sent_at: string | null
  followup_3_sent_at: string | null
  followup_4_sent_at: string | null
  next_followup_at: string | null
  source: LeadSource
  created_at: string
  updated_at: string
}
 
export interface EmailLog {
  id: string
  project_id: string
  lead_id: string
  user_id: string
  type: EmailLogType
  to_email: string
  subject: string
  status: 'sent' | 'failed'
  error_message: string | null
  sent_at: string
}
 
export interface ProjectFormData {
  name: string
  description: string
  from_email: string
  from_name: string
  smtp_host: string
  smtp_port: number
  smtp_user: string
  smtp_pass: string
  smtp_secure: boolean
  email_subject: string
  email_body: string
  schedule_type: ScheduleType
  schedule_time: string
  schedule_day_of_week: number
  schedule_day_of_month: number
  batch_size: number
  batch_interval_minutes: number
  daily_limit: number
  followup_count: number
  followup_day_1: number
  followup_day_2: number
  followup_day_3: number
  followup_day_4: number
  followup_subject_1: string
  followup_body_1: string
  followup_subject_2: string
  followup_body_2: string
  followup_subject_3: string
  followup_body_3: string
  followup_subject_4: string
  followup_body_4: string
  custom_fields: CustomField[]
}
 