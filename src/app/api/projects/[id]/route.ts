import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
 
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
 
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}
 
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 
  const body = await request.json()
 
  // Whitelist only valid project columns — never pass id, user_id, created_at, updated_at or unknown fields
  const allowed = [
    'name', 'description', 'from_email', 'from_name',
    'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_secure',
    'email_subject', 'email_body',
    'schedule_type', 'schedule_time', 'schedule_day_of_week', 'schedule_day_of_month',
    'batch_size', 'batch_interval_minutes', 'daily_limit',
    'followup_count',
    'followup_day_1', 'followup_day_2', 'followup_day_3', 'followup_day_4',
    'followup_subject_1', 'followup_body_1',
    'followup_subject_2', 'followup_body_2',
    'followup_subject_3', 'followup_body_3',
    'followup_subject_4', 'followup_body_4',
    'status',
    'sheets_connected', 'sheets_id', 'sheets_tab', 'sheets_email_column',
    'total_leads', 'total_sent',
    'custom_fields',
  ]
 
  const update = Object.fromEntries(
    Object.entries(body).filter(([key]) => allowed.includes(key))
  )
 
  const { data, error } = await supabase
    .from('projects')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()
 
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
 
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
 
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
 