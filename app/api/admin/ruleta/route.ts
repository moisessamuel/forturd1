import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const estado = searchParams.get('estado')
    const search = searchParams.get('search')

    let query = supabase
      .from('ruleta_jugadas')
      .select('*, premio:ruleta_premios(*)')
      .order('created_at', { ascending: false })

    if (estado && estado !== 'todos') {
      query = query.eq('estado', estado)
    }

    if (search && search.trim()) {
      query = query.or(`nombre.ilike.%${search}%,telefono.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching jugadas:', error)
      return NextResponse.json({ error: 'Error fetching data' }, { status: 500 })
    }

    return NextResponse.json({ jugadas: data })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { id, estado } = body

    const updateData: Record<string, unknown> = { estado }
    
    if (estado === 'confirmado') {
      updateData.confirmado_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('ruleta_jugadas')
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.error('Error updating jugada:', error)
      return NextResponse.json({ error: 'Error updating jugada' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient()

    // Delete all jugadas from ruleta_jugadas
    const { error } = await supabase
      .from('ruleta_jugadas')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all rows

    if (error) {
      console.error('Error deleting jugadas:', error)
      return NextResponse.json({ error: 'Error deleting data' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
