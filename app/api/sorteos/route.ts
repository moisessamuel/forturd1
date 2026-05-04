import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const activeOnly = searchParams.get('active') === 'true'

  try {
    let query = supabase.from('sorteos').select('*')

    if (slug) {
      query = query.eq('slug', slug).single()
    } else if (activeOnly) {
      query = query.eq('activo', true).order('created_at', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching sorteos:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in sorteos API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
