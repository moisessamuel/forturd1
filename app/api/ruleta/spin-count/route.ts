import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: Fetch global spin count
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get total spin count from ruleta_jugadas (paid spins)
    const { count: paidCount } = await supabase
      .from('ruleta_jugadas')
      .select('*', { count: 'exact', head: true })

    // Get total spin count from jugadas_ruleta (free spins)
    const { count: freeCount } = await supabase
      .from('jugadas_ruleta')
      .select('*', { count: 'exact', head: true })

    // Also check global_spin_counter table for persistent count
    const { data: counterData } = await supabase
      .from('global_spin_counter')
      .select('count')
      .single()

    const totalCount = (counterData?.count || 0) + (paidCount || 0) + (freeCount || 0)

    return NextResponse.json({ count: totalCount })
  } catch (error) {
    console.error('Error fetching spin count:', error)
    return NextResponse.json({ count: 0 })
  }
}

// POST: Increment global spin count AND record individual spin
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Parse optional body for spin details
    let spinData = {
      telefono: 'unknown',
      nombre: null as string | null,
      tipo: 'pagado',
      resultado: 'Sigue Intentando',
      es_premio: false,
      jugada_id: null as string | null,
      monto: 0,
      moneda: 'DOP'
    }
    
    try {
      const body = await request.json()
      spinData = { ...spinData, ...body }
    } catch {
      // No body provided, use defaults
    }

    // 1. Insert individual spin record
    await supabase
      .from('spins_individuales')
      .insert({
        telefono: spinData.telefono,
        nombre: spinData.nombre,
        tipo: spinData.tipo,
        resultado: spinData.resultado,
        es_premio: spinData.es_premio,
        jugada_id: spinData.jugada_id,
        monto: spinData.monto,
        moneda: spinData.moneda
      })

    // 2. Increment global counter
    const { data: existing } = await supabase
      .from('global_spin_counter')
      .select('id, count')
      .single()

    if (existing) {
      await supabase
        .from('global_spin_counter')
        .update({ count: existing.count + 1 })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('global_spin_counter')
        .insert({ count: 1 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error incrementing spin count:', error)
    return NextResponse.json({ success: false })
  }
}
