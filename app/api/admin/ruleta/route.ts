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
        source_table: 'ruleta_jugadas',
      })),
      ...(freeJugadas || []).map(j => ({
        ...j,
        es_giro_gratis: j.es_giro_gratis || true,
        numero_boleto_referencia: j.numero_boleto_referencia,
        metodo_pago: 'Verificador',
        source_table: 'jugadas_ruleta',
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
    const { id, estado, source_table } = body

    const updateData: Record<string, unknown> = { estado }
    
    if (estado === 'confirmado') {
      updateData.confirmado_at = new Date().toISOString()
    }

    // Determine which table to update
    const tableName = source_table === 'jugadas_ruleta' ? 'jugadas_ruleta' : 'ruleta_jugadas'

    // Try updating in ruleta_jugadas first
    const { error: error1 } = await supabase
      .from('ruleta_jugadas')
      .update(updateData)
      .eq('id', id)

    // Also try jugadas_ruleta (free spins table)
    const { error: error2 } = await supabase
      .from('jugadas_ruleta')
      .update(updateData)
      .eq('id', id)

    if (error1 && error2) {
      console.error('Error updating jugada:', error1, error2)
      return NextResponse.json({ error: 'Error updating jugada' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const sourceTable = searchParams.get('source_table')
    const resetType = searchParams.get('reset')

    console.log('[API DELETE] Params:', { id, sourceTable, resetType })

    // If id is provided, delete single record
    if (id) {
      // Try deleting from the specified table first, then fallback to the other
      const tablesToTry = sourceTable === 'jugadas_ruleta' 
        ? ['jugadas_ruleta', 'ruleta_jugadas'] 
        : ['ruleta_jugadas', 'jugadas_ruleta']

      for (const table of tablesToTry) {
        const { data, error } = await supabase
          .from(table)
          .delete()
          .eq('id', id)
          .select()

        if (!error && data && data.length > 0) {
          return NextResponse.json({ success: true, message: `Record deleted from ${table}` })
        }
      }

      // If we get here, record wasn't found or deleted - return success anyway
      // (it may have already been deleted)
      return NextResponse.json({ success: true, message: 'Record deleted or not found' })
    }

    // If resetType is 'counters', reset spin counters but keep history
    // SOURCE OF TRUTH: spins_individuales table — must be cleared to reset to 0
    if (resetType === 'counters') {
      // Delete all individual spin records (this resets the count to 0)
      const { error: errorSpins } = await supabase
        .from('spins_individuales')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      // Also reset the global_spin_counter table
      const { error: errorCounter } = await supabase
        .from('global_spin_counter')
        .update({ count: 0 })
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (errorSpins) console.error('Error clearing spins_individuales:', errorSpins)
      if (errorCounter) console.error('Error resetting global_spin_counter:', errorCounter)

      if (errorSpins) {
        return NextResponse.json({ error: 'Error al resetear contadores' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'Contadores reiniciados a 0' })
    }

    // If resetType is 'all', delete absolutely everything
    if (resetType === 'all') {
      // Delete all individual spin records
      const { error: error0 } = await supabase
        .from('spins_individuales')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      // Delete all from ruleta_jugadas
      const { error: error1 } = await supabase
        .from('ruleta_jugadas')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      // Delete all from jugadas_ruleta
      const { error: error2 } = await supabase
        .from('jugadas_ruleta')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      // Reset global spin counter
      const { error: error3 } = await supabase
        .from('global_spin_counter')
        .update({ count: 0 })
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (error0) console.error('Error deleting spins_individuales:', error0)
      if (error1) console.error('Error deleting ruleta_jugadas:', error1)
      if (error2) console.error('Error deleting jugadas_ruleta:', error2)
      if (error3) console.error('Error resetting counter:', error3)

      return NextResponse.json({ success: true, message: 'Todos los datos eliminados' })
    }

    // Default: delete all jugadas but keep counter
    const { error: error1 } = await supabase
      .from('ruleta_jugadas')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    const { error: error2 } = await supabase
      .from('jugadas_ruleta')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (error1) console.error('Error deleting ruleta_jugadas:', error1)
    if (error2) console.error('Error deleting jugadas_ruleta:', error2)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
