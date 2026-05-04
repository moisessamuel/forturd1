import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('ruleta_jugadas')
      .select('estado')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error checking status:', error)
      return NextResponse.json({ error: 'Error checking status' }, { status: 500 })
    }

    return NextResponse.json({ estado: data.estado })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
