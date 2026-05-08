import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendRuletaWinnerNotification } from '@/lib/email'

/**
 * SPIN-COUNT: Registra los resultados de giros para tracking global.
 * 
 * NOTA: Este endpoint NO consume giros. El consumo se hace en /api/ruleta/consume-spin
 * ANTES de que la animación comience. Este endpoint solo registra el resultado
 * para estadísticas y notificaciones de premios.
 */

// GET: Fetch global spin count
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { count: totalSpins } = await supabase
      .from('spins_individuales')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({ count: totalSpins || 0 })
  } catch (error) {
    console.error('Error fetching spin count:', error)
    return NextResponse.json({ count: 0 })
  }
}

// POST: Record individual spin result (for tracking only)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
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

    // Insert individual spin record for tracking
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

    // Send winner notification email if this was a prize win
    if (spinData.es_premio && spinData.resultado !== 'Sigue Intentando') {
      try {
        const { count: spinNumber } = await supabase
          .from('spins_individuales')
          .select('*', { count: 'exact', head: true })

        await sendRuletaWinnerNotification({
          telefono: spinData.telefono,
          nombre: spinData.nombre,
          premio: spinData.resultado,
          fecha: new Date().toLocaleString('es-DO', { 
            timeZone: 'America/Santo_Domingo',
            dateStyle: 'full',
            timeStyle: 'short'
          }),
          spinNumber: spinNumber || undefined
        })
      } catch (emailError) {
        console.error('Error sending winner notification email:', emailError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error recording spin:', error)
    return NextResponse.json({ success: false })
  }
}
