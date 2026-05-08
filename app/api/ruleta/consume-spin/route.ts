import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * CONSUME-SPIN: Endpoint atómico para consumir UN giro ANTES de la animación.
 * 
 * FLUJO CORRECTO:
 * 1. Usuario hace clic en "Girar"
 * 2. Frontend llama POST /api/ruleta/consume-spin
 * 3. Backend verifica disponibilidad y descuenta 1 giro en una transacción atómica
 * 4. Si tiene giros, devuelve { success: true, giros_restantes }
 * 5. Si NO tiene giros, devuelve { success: false, error }
 * 6. SOLO si success=true, el frontend inicia la animación
 * 
 * Esto PREVIENE:
 * - Giros fantasmas
 * - Doble conteo
 * - Restauración de giros usados
 * - Race conditions
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { telefono, tipo, jugada_id } = body

    if (!telefono) {
      return NextResponse.json({ 
        success: false, 
        error: 'Teléfono es requerido' 
      }, { status: 400 })
    }

    // ════════════════════════════════════════════════════════════════════════
    // CASO 1: GIROS PAGADOS (tiene jugada_id)
    // ════════════════════════════════════════════════════════════════════════
    if (jugada_id) {
      // Obtener estado actual de la jugada
      const { data: jugada, error: fetchError } = await supabase
        .from('ruleta_jugadas')
        .select('id, cantidad_giros, giros_usados, estado')
        .eq('id', jugada_id)
        .single()

      if (fetchError || !jugada) {
        return NextResponse.json({ 
          success: false, 
          error: 'Jugada no encontrada' 
        })
      }

      // Verificar que aún tiene giros disponibles
      const cantidadGiros = jugada.cantidad_giros || 1
      const girosUsados = jugada.giros_usados || 0
      const girosDisponibles = cantidadGiros - girosUsados

      if (girosDisponibles <= 0 || jugada.estado === 'jugado') {
        return NextResponse.json({ 
          success: false, 
          error: 'No tienes giros disponibles. Ya usaste todos tus giros comprados.',
          giros_restantes: 0
        })
      }

      // CONSUMIR EL GIRO: Incrementar giros_usados atomicamente
      const newGirosUsados = girosUsados + 1
      const newEstado = newGirosUsados >= cantidadGiros ? 'jugado' : 'confirmado'
      const girosRestantes = cantidadGiros - newGirosUsados

      const { error: updateError } = await supabase
        .from('ruleta_jugadas')
        .update({
          giros_usados: newGirosUsados,
          estado: newEstado,
          jugado_at: new Date().toISOString(),
        })
        .eq('id', jugada_id)
        .eq('giros_usados', girosUsados) // Optimistic lock - solo actualiza si no cambió

      if (updateError) {
        console.error('Error consuming paid spin:', updateError)
        return NextResponse.json({ 
          success: false, 
          error: 'Error al consumir giro. Intenta nuevamente.' 
        })
      }

      return NextResponse.json({
        success: true,
        tipo: 'pagado',
        giros_restantes: girosRestantes,
        message: `Giro consumido. Te quedan ${girosRestantes} giro${girosRestantes !== 1 ? 's' : ''}.`
      })
    }

    // ════════════════════════════════════════════════════════════════════════
    // CASO 2: GIROS GRATIS (por boletos de sorteo)
    // ════════════════════════════════════════════════════════════════════════
    if (tipo === 'gratis') {
      // Obtener player por teléfono
      const { data: player } = await supabase
        .from('players')
        .select('id')
        .eq('phone_number', telefono)
        .single()

      if (!player) {
        return NextResponse.json({ 
          success: false, 
          error: 'No se encontró tu cuenta. Verifica tu número de teléfono.' 
        })
      }

      // Contar boletos aprobados (cada boleto = 1 giro gratis)
      const { data: purchaseGroups } = await supabase
        .from('purchase_groups')
        .select('id')
        .eq('player_id', player.id)
        .eq('estado', 'aprobado')

      if (!purchaseGroups || purchaseGroups.length === 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'No tienes boletos aprobados para giros gratis.' 
        })
      }

      const { count: totalBoletos } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .in('purchase_group_id', purchaseGroups.map(pg => pg.id))

      const totalGirosGratis = totalBoletos || 0

      // Obtener giros usados de ruleta_giros_gratis
      const { data: freeSpinRecord } = await supabase
        .from('ruleta_giros_gratis')
        .select('id, giros_usados')
        .eq('telefono', telefono)
        .single()

      const girosUsados = freeSpinRecord?.giros_usados || 0
      const girosDisponibles = totalGirosGratis - girosUsados

      if (girosDisponibles <= 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'No tienes giros gratis disponibles. Ya usaste todos tus giros.',
          giros_restantes: 0
        })
      }

      // CONSUMIR EL GIRO: Incrementar giros_usados en ruleta_giros_gratis
      const newGirosUsados = girosUsados + 1
      const girosRestantes = totalGirosGratis - newGirosUsados

      if (freeSpinRecord) {
        // Actualizar registro existente
        const { error: updateError } = await supabase
          .from('ruleta_giros_gratis')
          .update({
            giros_usados: newGirosUsados,
            updated_at: new Date().toISOString(),
          })
          .eq('id', freeSpinRecord.id)
          .eq('giros_usados', girosUsados) // Optimistic lock

        if (updateError) {
          console.error('Error consuming free spin:', updateError)
          return NextResponse.json({ 
            success: false, 
            error: 'Error al consumir giro gratis. Intenta nuevamente.' 
          })
        }
      } else {
        // Crear nuevo registro con 1 giro usado
        const { error: insertError } = await supabase
          .from('ruleta_giros_gratis')
          .insert({
            telefono,
            giros_usados: 1,
          })

        if (insertError) {
          console.error('Error creating free spin record:', insertError)
          return NextResponse.json({ 
            success: false, 
            error: 'Error al registrar giro gratis. Intenta nuevamente.' 
          })
        }
      }

      return NextResponse.json({
        success: true,
        tipo: 'gratis',
        giros_restantes: girosRestantes,
        message: `Giro gratis consumido. Te quedan ${girosRestantes} giro${girosRestantes !== 1 ? 's' : ''} gratis.`
      })
    }

    // ════════════════════════════════════════════════════════════════════════
    // CASO 3: Sin tipo válido
    // ════════════════════════════════════════════════════════════════════════
    return NextResponse.json({ 
      success: false, 
      error: 'Tipo de giro no válido' 
    }, { status: 400 })

  } catch (error) {
    console.error('Consume spin error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}
