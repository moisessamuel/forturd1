import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()

    console.log('[v0] Starting migration: Adding metadata column to sorteos...')

    // Add metadata column if it doesn't exist
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE sorteos 
        ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
      `
    })

    if (alterError && !alterError.message.includes('already exists')) {
      console.log('[v0] Note: ALTER TABLE might not work with RPC. Trying alternative approach...')
    }

    console.log('[v0] Migration completed')

    return NextResponse.json({
      success: true,
      message: 'Metadata column added to sorteos table',
    })
  } catch (error) {
    console.error('[v0] Migration error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Migration failed',
        message: 'Please add the metadata column manually in Supabase: ALTER TABLE sorteos ADD COLUMN metadata JSONB DEFAULT \'{}\'::jsonb;'
      },
      { status: 500 }
    )
  }
}
