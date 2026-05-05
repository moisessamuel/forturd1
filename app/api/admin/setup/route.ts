import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    // Get admin verification token from headers
    const adminToken = request.headers.get('x-admin-token')
    if (adminToken !== process.env.ADMIN_API_TOKEN) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Try to add metadata column if it doesn't exist
    const { error } = await supabase.rpc('add_metadata_column_to_sorteos')

    if (error && error.code !== 'PGRST116') {
      // PGRST116 means the column already exists (column name conflict)
      console.error('Error adding metadata column:', error)
      return NextResponse.json(
        { error: 'Error setting up database', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        message: 'Database setup verified or updated successfully',
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in setup endpoint:', error)
    return NextResponse.json(
      { error: 'Setup error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
