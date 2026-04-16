import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// This route is called when a lead opens the email (tracking pixel)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  
  try {
    const supabase = await createServiceClient()

    // Find lead by tracking token
    const { data: lead } = await supabase
      .from('leads')
      .select('id, email_open_count')
      .eq('tracking_token', token)
      .single()

    if (lead) {
      // Update opened status
      await supabase
        .from('leads')
        .update({
          email_opened: true,
          email_opened_at: new Date().toISOString(),
          email_open_count: (lead.email_open_count ?? 0) + 1,
        })
        .eq('id', lead.id)
    }
  } catch {}

  // Return a 1x1 transparent GIF pixel
  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  )

  return new NextResponse(pixel, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
    },
  })
}
