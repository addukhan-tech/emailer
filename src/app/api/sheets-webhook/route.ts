import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Called by Google Apps Script when a new row is added to a connected sheet
export async function POST(request: NextRequest) {
  const supabase = createServiceClient()

  const body = await request.json()
  const { project_id, secret, row } = body

  if (!project_id || !secret || !row) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Fetch project and verify secret matches sheets_id
  const { data: project, error: projError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', project_id)
    .eq('sheets_connected', true)
    .single()

  if (projError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // Use the email column name configured in the project
  const emailCol = project.sheets_email_column || 'email'
  const email = row[emailCol]

  if (!email) {
    return NextResponse.json({ error: 'No email in row' }, { status: 400 })
  }

  // Check for duplicate
  const { data: existing } = await supabase
    .from('leads')
    .select('id')
    .eq('project_id', project_id)
    .eq('email', email)
    .single()

  if (existing) {
    return NextResponse.json({ message: 'Lead already exists' })
  }

  // Extract name from row
  const name = row['name'] || row['Name'] || row['full_name'] || null

  // Store all other columns in data JSONB
  const data: Record<string, string> = {}
  Object.entries(row).forEach(([k, v]) => {
    if (k !== emailCol && k !== 'name' && k !== 'Name') {
      data[k] = String(v)
    }
  })

  const { error: insertError } = await supabase.from('leads').insert({
    project_id,
    user_id: project.user_id,
    email,
    name,
    data,
    source: 'sheets',
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Update project lead count
  await supabase
    .from('projects')
    .update({ total_leads: project.total_leads + 1 })
    .eq('id', project_id)

  return NextResponse.json({ success: true, email })
}
