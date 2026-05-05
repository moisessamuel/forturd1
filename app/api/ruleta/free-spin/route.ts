import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { numero_boleto, nombre, telefono, premio_id, resultado } = body

    if (!numero_boleto || !nombre) {
      return NextResponse.json(
        { error: 'numero_boleto y nombre son requeridos' },
        { status: 400 }
      )
    }

    // =============================================
    // SECURITY: Validate that user has APPROVED tickets before allowing free spin
    // This prevents bypassing the frontend restriction
    // =============================================
    if (telefono) {
      // Find the player
      const { data: player } = await supabase
        .from('players')
        .select('id')
        .eq('phone_number', telefono)
        .single()

      if (player) {
        // Get purchase groups for this player
        const { data: purchaseGroups } = await supabase
          .from('purchase_groups')
          .select('id, estado')
          .eq('player_id', player.id)

        const approvedPurchases = purchaseGroups?.filter(pg => pg.estado === 'aprobado') || []
        
        if (approvedPurchases.length === 0) {
          // No approved tickets - check if they have pending ones
          const pendingPurchases = purchaseGroups?.filter(pg => pg.estado === 'pendiente') || []
          
          if (pendingPurchases.length > 0) {
            return NextResponse.json(
              { error: 'Tus boletos aún no han sido confirmados. Una vez confirmados podrás usar tus giros gratis.' },
              { status: 403 }
            )
          }
        }

        // Count approved tickets
        let approvedTicketsCount = 0
        if (approvedPurchases.length > 0) {
          const { count } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .in('purchase_group_id', approvedPurchases.map(pg => pg.id))
          approvedTicketsCount = count || 0
        }

        // Check how many free spins have been used
        const { data: usageData } = await supabase
          .from('ruleta_giros_gratis')
          .select('giros_usados')
          .eq('telefono', telefono)
          .single()

        const freeSpinsUsed = usageData?.giros_usados || 0
        const freeSpinsAvailable = approvedTicketsCount - freeSpinsUsed

        if (freeSpinsAvailable <= 0) {
          return NextResponse.json(
            { error: 'No tienes giros gratis disponibles. Ya usaste todos tus giros.' },
            { status: 403 }
          )
        }
      }
    }

    // Insert free spin record into jugadas_ruleta
    const { data, error } = await supabase
      .from('jugadas_ruleta')
      .insert({
        nombre,
        telefono: telefono || '',
        email: '',
        monto: 0, // Free spin
        moneda: 'DOP',
        banco: 'Giro Gratis',
        estado: 'jugado',
        premio_id: premio_id || null,
        resultado: resultado || null,
        numero_boleto_referencia: numero_boleto,
        es_giro_gratis: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error recording free spin:', error)
      return NextResponse.json(
        { error: 'Error al registrar el giro gratis' },
        { status: 500 }
      )
    }

    // Also update the free spin tracking table (ruleta_giros_gratis)
    // This tracks how many free spins from tickets have been used
    if (telefono) {
      const { data: existingRecord } = await supabase
        .from('ruleta_giros_gratis')
        .select('giros_usados')
        .eq('telefono', telefono)
        .single()

      if (existingRecord) {
        // Increment existing record
        await supabase
          .from('ruleta_giros_gratis')
          .update({ 
            giros_usados: existingRecord.giros_usados + 1,
            ultimo_giro_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('telefono', telefono)
      } else {
        // Create new record
        await supabase
          .from('ruleta_giros_gratis')
          .insert({
            telefono,
            giros_usados: 1,
            ultimo_giro_at: new Date().toISOString()
          })
      }
    }

    return NextResponse.json({
      success: true,
      jugada_id: data.id,
      message: 'Giro gratis registrado exitosamente',
    })
  } catch (error) {
    console.error('Free spin API error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
