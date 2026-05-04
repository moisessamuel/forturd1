import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const estado = searchParams.get('estado')
    const search = searchParams.get('search')

    // Fetch from ruleta_jugadas (paid spins)
    let query1 = supabase
      .from('ruleta_jugadas')
      .select('*, premio:ruleta_premios(*)')
      .order('created_at', { ascending: false })

    if (estado && estado !== 'todos') {
      query1 = query1.eq('estado', estado)
    }

    if (search && search.trim()) {
      query1 = query1.or(`nombre.ilike.%${search}%,telefono.ilike.%${search}%`)
    }

    const { data: paidJugadas, error: error1 } = await query1

    // Fetch from jugadas_ruleta (free spins from verificador)
    let query2 = supabase
      .from('jugadas_ruleta')
      .select('*')
      .order('created_at', { ascending: false })

    if (estado && estado !== 'todos') {
      query2 = query2.eq('estado', estado)
    }

    if (search && search.trim()) {
      query2 = query2.or(`nombre.ilike.%${search}%,telefono.ilike.%${search}%`)
    }

    const { data: freeJugadas, error: error2 } = await query2

    if (error1) {
      console.error('Error fetching paid jugadas:', error1)
    }

    if (error2) {
      console.error('Error fetching free jugadas:', error2)
    }

    // Combine and normalize both results
    const allJugadas = [
      ...(paidJugadas || []).map(j => ({
        ...j,
        es_giro_gratis: false,
        numero_boleto_referencia: null,
      })),
      ...(freeJugadas || []).map(j => ({
        ...j,
        es_giro_gratis: j.es_giro_gratis || true,
        numero_boleto_referencia: j.numero_boleto_referencia,
        metodo_pago: 'Verificador',
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({ jugadas: allJugadas })
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
