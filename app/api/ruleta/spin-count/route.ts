import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: Fetch global spin count
// SOURCE OF TRUTH: spins_individuales table (each record = 1 spin executed)
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Count ONLY from spins_individuales - this is the EXACT count of spins executed
    const { count: totalSpins } = await supabase
      .from('spins_individuales')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({ count: totalSpins || 0 })
  } catch (error) {
    console.error('Error fetching spin count:', error)
    return NextResponse.json({ count: 0 })
  }
}

// POST: Record individual spin execution
// Each POST = 1 spin executed. The COUNT of records in spins_individuales = total spins.
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

    // Insert individual spin record - THIS IS THE ONLY SOURCE OF TRUTH
    // The count of records = exact number of spins executed
    const { error } = await supabase
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

    if (error) {
      console.error('Error inserting spin:', error)
      return NextResponse.json({ success: false, error: error.message })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error recording spin:', error)
    return NextResponse.json({ success: false })
  }
}
