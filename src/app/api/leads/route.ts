import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('project_id')
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '50')
  const offset = (page - 1) * limit

  let query = supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (projectId) query = query.eq('project_id', projectId)
  if (status) query = query.eq('email_status', status)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count, page, limit })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  // Single lead
  if (!Array.isArray(body)) {
    const { data, error } = await supabase
      .from('leads')
      .insert({ ...body, user_id: user.id })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Update project total_leads
    await supabase.rpc('increment_project_leads', { project_id: body.project_id })
    return NextResponse.json(data, { status: 201 })
  }

  // Bulk insert (CSV / Sheets import)
  const leads = body.map((l: Record<string, unknown>) => ({ ...l, user_id: user.id }))
  const { data, error } = await supabase.from('leads').insert(leads).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

 if (leads.length > 0 && (leads[0] as Record<string, unknown>).project_id) {
    const pid = (leads[0] as Record<string, unknown>).project_id as string
    const { count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', pid)
    await supabase
      .from('projects')
      .update({ total_leads: count ?? 0 })
      .eq('id', pid)
  }
  return NextResponse.json({ inserted: data?.length ?? 0 }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids } = await request.json()
  const { error } = await supabase.from('leads').delete().in('id', ids).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
