import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Check both sorteos
    const { data: sorteos, error } = await supabase
      .from('sorteos')
      .select('id, slug, nombre, estado, metadata')
      .in('slug', ['bmw-x6', 'bmw-x7'])

    if (error) {
      console.error('[v0] Error checking sorteos:', error)
      return NextResponse.json(
        { error: `Error: ${error.message}` },
        { status: 500 }
      )
    }

    const x6 = sorteos?.find(s => s.slug === 'bmw-x6')
    const x7 = sorteos?.find(s => s.slug === 'bmw-x7')

    return NextResponse.json(
      {
        bmw_x6_exists: !!x6,
        bmw_x7_exists: !!x7,
        bmw_x6: x6 || null,
        bmw_x7: x7 || null,
        total_sorteos: sorteos?.length || 0,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[v0] Error in GET /api/admin/check-sorteos:', error)
    return NextResponse.json(
      { error: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}
