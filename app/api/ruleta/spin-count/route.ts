import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendRuletaWinnerNotification } from '@/lib/email'

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

    // DEBUG: Log incoming spin data
    console.log('[v0] spin-count POST received:', JSON.stringify(spinData, null, 2))

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
      console.error('[v0] Error inserting spin:', error)
      return NextResponse.json({ success: false, error: error.message })
    }

    console.log('[v0] Spin inserted into spins_individuales')

    // ─── UPDATE GIROS_USADOS IN RULETA_JUGADAS (PAID SPINS) ─────────────────
    // This is CRITICAL - without this, verify-spins returns incorrect counts
    // ───────────────────────────────────────────────────────────────────────
    console.log('[v0] Checking if jugada_id exists:', spinData.jugada_id)
    if (spinData.jugada_id) {
      // Get current state of the jugada
      const { data: jugada, error: jugadaError } = await supabase
        .from('ruleta_jugadas')
        .select('giros_usados, cantidad_giros')
        .eq('id', spinData.jugada_id)
        .single()

      console.log('[v0] Jugada fetch result:', jugada, 'Error:', jugadaError)

      if (jugada) {
        const currentUsados = jugada.giros_usados || 0
        const totalGiros = jugada.cantidad_giros || 1
        const newGirosUsados = currentUsados + 1
        const newEstado = newGirosUsados >= totalGiros ? 'jugado' : 'confirmado'

        console.log('[v0] Updating jugada:', { currentUsados, totalGiros, newGirosUsados, newEstado })

        // Update the jugada with incremented giros_usados
        const { error: updateError } = await supabase
          .from('ruleta_jugadas')
          .update({
            giros_usados: newGirosUsados,
            estado: newEstado,
            jugado_at: new Date().toISOString(),
          })
          .eq('id', spinData.jugada_id)

        console.log('[v0] Jugada update error:', updateError)
      }
    } else {
      console.log('[v0] No jugada_id provided, skipping ruleta_jugadas update')
    }

    // ─── UPDATE GIROS_USADOS IN RULETA_GIROS_GRATIS (FREE SPINS FROM TICKETS) ───
    // When tipo is 'gratis', increment giros_usados in ruleta_giros_gratis
    // This ensures verify-spins returns correct available free spins
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('[v0] Checking free spin update: tipo=', spinData.tipo, 'telefono=', spinData.telefono)
    if (spinData.tipo === 'gratis' && spinData.telefono && spinData.telefono !== 'unknown') {
      // Get or create the user's free spin tracking record
      const { data: existingRecord, error: freeSpinError } = await supabase
        .from('ruleta_giros_gratis')
        .select('id, giros_usados')
        .eq('telefono', spinData.telefono)
        .single()

      console.log('[v0] Free spin record:', existingRecord, 'Error:', freeSpinError)

      if (existingRecord) {
        // Increment giros_usados
        const { error: updateFreeError } = await supabase
          .from('ruleta_giros_gratis')
          .update({
            giros_usados: (existingRecord.giros_usados || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingRecord.id)
        console.log('[v0] Free spin update error:', updateFreeError)
      } else {
        // Create new record with 1 spin used
        const { error: insertFreeError } = await supabase
          .from('ruleta_giros_gratis')
          .insert({
            telefono: spinData.telefono,
            giros_usados: 1,
          })
        console.log('[v0] Free spin insert error:', insertFreeError)
      }
    } else {
      console.log('[v0] Skipping free spin update - condition not met')
    }

    // ─── SEND WINNER NOTIFICATION EMAIL ─────────────────────────────────────
    // If this spin was a prize win, notify the admin via email
    // ─────────────────────────────────────────────────────────────────────────
    if (spinData.es_premio && spinData.resultado !== 'Sigue Intentando') {
      try {
        // Get current spin count for reference
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
        // Log error but don't fail the request - spin was already recorded
        console.error('Error sending winner notification email:', emailError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error recording spin:', error)
    return NextResponse.json({ success: false })
  }
}
