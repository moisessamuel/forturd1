import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizePhone } from '@/lib/phone-utils'

/**
 * CONSUME-SPIN: Endpoint ATÓMICO para consumir UN giro ANTES de la animación.
 * 
 * FÓRMULA OFICIAL:
 * girosDisponibles = (girosPorBoletos + girosComprados) - girosConsumidos
 * 
 * FLUJO:
 * 1. Usuario hace clic en "Girar"
 * 2. Frontend llama POST /api/ruleta/consume-spin con { telefono }
 * 3. Backend calcula giros disponibles desde la BD (ÚNICA FUENTE DE VERDAD)
 * 4. Si tiene giros, descuenta 1 atómicamente y devuelve { success: true, giros_restantes }
 * 5. Si NO tiene giros, devuelve { success: false }
 * 6. SOLO si success=true, el frontend inicia la animación
 * 
 * PREVIENE:
 * - Giros fantasmas
 * - Doble conteo
 * - Race conditions (usa optimistic locking)
 * - Giros negativos
 * - Restauración de giros usados
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const telefonoRaw = body.telefono

    if (!telefonoRaw) {
      return NextResponse.json({ 
        success: false, 
        error: 'Teléfono es requerido' 
      }, { status: 400 })
    }

    // Normalizar el número de teléfono
    const telefono = normalizePhone(telefonoRaw)
    if (!telefono) {
      return NextResponse.json({ 
        success: false, 
        error: 'Número de teléfono inválido' 
      }, { status: 400 })
    }

    // ════════════════════════════════════════════════════════════════════════
    // PASO 1: CALCULAR GIROS DISPONIBLES DESDE LA BD (ÚNICA FUENTE DE VERDAD)
    // ════════════════════════════════════════════════════════════════════════

    // 1A. Buscar player por teléfono
    const { data: player } = await supabase
      .from('players')
      .select('id, nombre')
      .eq('phone_number', telefono)
      .single()

    // 1B+1C. Obtener registro de giros gratis y calcular disponibles con fórmula correcta
    const { data: freeSpinRecord } = await supabase
      .from('ruleta_giros_gratis')
      .select('id, giros_usados, boletos_contados')
      .eq('telefono', telefono)
      .single()

    // FÓRMULA CORRECTA (evita resurrección de giros al comprar más boletos):
    // - boletos_contados: snapshot del total de boletos cuando se consumió el último giro
    // - boletosNuevos: boletos aprobados DESDE el último snapshot
    // - girasNuevas: FLOOR(boletosNuevos / 2) → giradas que generan los boletos nuevos
    // - girosDisponibles = girasNuevas (los usados ya están "cocinados" en boletos_contados)
    const girosGratisUsados = freeSpinRecord?.giros_usados || 0
    const boletosContados = freeSpinRecord?.boletos_contados || 0

    // Boletos aprobados que aún no han sido "procesados" hacia giradas
    // Solo contamos los boletos por encima del snapshot anterior
    const totalBoletosAprobados = player ? await (async () => {
      const { data: purchaseGroups } = await supabase
        .from('purchase_groups')
        .select('id')
        .eq('player_id', player.id)
        .eq('estado', 'aprobado')
        .in('sorteo_slug', ['bmw-x6', 'bmw-x7'])
      if (!purchaseGroups || purchaseGroups.length === 0) return 0
      const { count } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .in('purchase_group_id', purchaseGroups.map(pg => pg.id))
      return count || 0
    })() : 0

    // boletosNuevos = boletos que aún no han generado giradas
    const boletosNuevos = Math.max(0, totalBoletosAprobados - boletosContados)
    // girasNuevas = giradas que generan los boletos nuevos (FLOOR / 2)
    const girasNuevas = Math.floor(boletosNuevos / 2)
    // Giradas disponibles = solo las nuevas (las anteriores ya fueron usadas en snapshots previos)
    const girosGratisDisponibles = girasNuevas

    // 1D. Calcular GIROS PAGADOS (solo de la jugada activa más reciente)
    const { data: jugadas } = await supabase
      .from('ruleta_jugadas')
      .select('id, cantidad_giros, giros_usados, estado')
      .eq('telefono', telefono)
      .eq('estado', 'confirmado')
      .eq('es_gratis', false) // Solo giros comprados directamente, NO giros gratis por boletos
      .order('created_at', { ascending: false })

    let jugadaActiva: { id: string; cantidad_giros: number; giros_usados: number } | null = null
    let girosPagadosDisponibles = 0

    if (jugadas && jugadas.length > 0) {
      for (const jugada of jugadas) {
        const cantidad = jugada.cantidad_giros || 1
        const usados = jugada.giros_usados || 0
        const disponibles = cantidad - usados

        if (disponibles > 0) {
          jugadaActiva = { 
            id: jugada.id, 
            cantidad_giros: cantidad, 
            giros_usados: usados 
          }
          girosPagadosDisponibles = disponibles
          break // Solo usar la jugada más reciente con giros disponibles
        } else {
          // Auto-fix: marcar como 'jugado' si no tiene giros restantes
          await supabase
            .from('ruleta_jugadas')
            .update({ estado: 'jugado' })
            .eq('id', jugada.id)
        }
      }
    }

    // 1E. CALCULAR TOTAL DISPONIBLE
    const totalDisponibles = girosGratisDisponibles + girosPagadosDisponibles

    // ════════════════════════════════════════════════════════════════════════
    // PASO 2: VALIDAR QUE HAY GIROS DISPONIBLES
    // ════════════════════════════════════════════════════════════════════════
    
    if (totalDisponibles <= 0) {
      return NextResponse.json({
        success: false,
        error: 'No tienes giros disponibles. Ya usaste todos tus giros.',
        giros_restantes: 0,
        giros_gratis_restantes: 0,
        giros_pagados_restantes: 0,
      })
    }

    // ════════════════════════════════════════════════════════════════════════
    // PASO 3: CONSUMIR UN GIRO (PRIORIDAD: GRATIS PRIMERO, LUEGO PAGADOS)
    // ════════════════════════════════════════════════════════════════════════
    
    let tipoConsumido: 'gratis' | 'pagado' = 'gratis'
    let nuevosGirosGratisRestantes = girosGratisDisponibles
    let nuevosGirosPagadosRestantes = girosPagadosDisponibles

    if (girosGratisDisponibles > 0) {
      // CONSUMIR UN GIRO GRATIS
      tipoConsumido = 'gratis'
      nuevosGirosGratisRestantes = girosGratisDisponibles - 1

      // Al consumir 1 girada gratis, avanzamos el snapshot en 2 boletos
      // (porque 2 boletos = 1 girada). Esto previene que esos 2 boletos
      // vuelvan a generar una girada en el futuro.
      const newGirosUsados = girosGratisUsados + 1
      const newBoletosContados = boletosContados + 2

      if (freeSpinRecord) {
        const { error: updateError, count } = await supabase
          .from('ruleta_giros_gratis')
          .update({
            giros_usados: newGirosUsados,
            boletos_contados: newBoletosContados,
            updated_at: new Date().toISOString(),
          })
          .eq('id', freeSpinRecord.id)
          .eq('giros_usados', girosGratisUsados) // LOCK optimista

        if (updateError || count === 0) {
          return NextResponse.json({
            success: false,
            error: 'Error de sincronización. Por favor intenta de nuevo.',
            retry: true,
          })
        }
      } else {
        const { error: insertError } = await supabase
          .from('ruleta_giros_gratis')
          .insert({
            telefono,
            giros_usados: 1,
            boletos_contados: boletosContados + 2, // 2 boletos = 1 girada
          })

        if (insertError) {
          return NextResponse.json({
            success: false,
            error: 'Error al registrar giro. Por favor intenta de nuevo.',
            retry: true,
          })
        }
      }
    } else if (girosPagadosDisponibles > 0 && jugadaActiva) {
      // CONSUMIR UN GIRO PAGADO
      tipoConsumido = 'pagado'
      const newGirosUsados = jugadaActiva.giros_usados + 1
      nuevosGirosPagadosRestantes = girosPagadosDisponibles - 1
      const newEstado = newGirosUsados >= jugadaActiva.cantidad_giros ? 'jugado' : 'confirmado'

      const { error: updateError, count } = await supabase
        .from('ruleta_jugadas')
        .update({
          giros_usados: newGirosUsados,
          estado: newEstado,
          jugado_at: new Date().toISOString(),
        })
        .eq('id', jugadaActiva.id)
        .eq('giros_usados', jugadaActiva.giros_usados) // LOCK: solo actualiza si no cambió

      if (updateError || count === 0) {
        // Race condition detectada
        return NextResponse.json({
          success: false,
          error: 'Error de sincronización. Por favor intenta de nuevo.',
          retry: true,
        })
      }
    } else {
      // No debería llegar aquí si totalDisponibles > 0, pero por seguridad
      return NextResponse.json({
        success: false,
        error: 'Error inesperado. Por favor intenta de nuevo.',
      })
    }

    // ════════════════════════════════════════════════════════════════════════
    // PASO 4: DEVOLVER RESULTADO CON BALANCE ACTUALIZADO
    // ════════════════════════════════════════════════════════════════════════
    
    const nuevosGirosTotales = nuevosGirosGratisRestantes + nuevosGirosPagadosRestantes

    return NextResponse.json({
      success: true,
      tipo: tipoConsumido,
      giros_restantes: nuevosGirosTotales,
      giros_gratis_restantes: nuevosGirosGratisRestantes,
      giros_pagados_restantes: nuevosGirosPagadosRestantes,
      puede_seguir_girando: nuevosGirosTotales > 0,
      message: `Giro ${tipoConsumido} consumido. Te quedan ${nuevosGirosTotales} giro${nuevosGirosTotales !== 1 ? 's' : ''}.`
    })

  } catch (error) {
    console.error('Consume spin error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor. Por favor intenta de nuevo.' 
    }, { status: 500 })
  }
}
