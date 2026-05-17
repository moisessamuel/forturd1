import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * FREE-SPIN-COUNT: Devuelve el conteo de giros gratis para un número de boleto.
 *
 * REGLA OFICIAL: Giradas Gratis = FLOOR(TotalBoletosAprobados / 2)
 * Combina boletos de bmw-x6 y bmw-x7 para el cálculo total.
 *
 * Giradas Restantes = FLOOR(TotalBoletosAprobados / 2) - GiradasUsadas
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const numeroBoleto = searchParams.get('numero_boleto')

    if (!numeroBoleto) {
      return NextResponse.json({ error: 'Numero de boleto requerido' }, { status: 400 })
    }

    // Get ticket info to find the player
    const { data: ticket } = await supabase
      .from('tickets')
      .select('purchase_group_id, numero_boleto')
      .eq('numero_boleto', numeroBoleto)
      .single()

    if (!ticket) {
      return NextResponse.json({
        total_boletos: 0,
        giros_gratis_totales: 0,
        giros_usados: 0,
        giros_disponibles: 0,
        estado: 'pendiente',
      })
    }

    // Get the purchase group to find the player_id
    const { data: purchaseGroup } = await supabase
      .from('purchase_groups')
      .select('id, estado, player_id, sorteo_slug')
      .eq('id', ticket.purchase_group_id)
      .single()

    if (!purchaseGroup) {
      return NextResponse.json({
        total_boletos: 0,
        giros_gratis_totales: 0,
        giros_usados: 0,
        giros_disponibles: 0,
        estado: 'pendiente',
      })
    }

    const estado = purchaseGroup.estado || 'pendiente'

    // Get the phone number for this player
    const { data: player } = await supabase
      .from('players')
      .select('phone_number')
      .eq('id', purchaseGroup.player_id)
      .single()

    const telefono = player?.phone_number || null

    // Count ALL approved BMW X6 + BMW X7 tickets for this player
    // REGLA OFICIAL: Se combinan bmw-x6 y bmw-x7 para el cálculo
    let totalBoletosAprobados = 0
    if (purchaseGroup.player_id) {
      const { data: approvedGroups } = await supabase
        .from('purchase_groups')
        .select('id')
        .eq('player_id', purchaseGroup.player_id)
        .eq('estado', 'aprobado')
        .in('sorteo_slug', ['bmw-x6', 'bmw-x7'])

      if (approvedGroups && approvedGroups.length > 0) {
        const { count } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .in('purchase_group_id', approvedGroups.map(pg => pg.id))
        totalBoletosAprobados = count || 0
      }
    }

    // FÓRMULA OFICIAL: FLOOR(TotalBoletosAprobados / 2)
    const girosGratisTotales = Math.floor(totalBoletosAprobados / 2)

    // Count free spins already used (from ruleta_giros_gratis)
    let girosUsados = 0
    if (telefono) {
      const { data: usageData } = await supabase
        .from('ruleta_giros_gratis')
        .select('giros_usados')
        .eq('telefono', telefono)
        .single()
      girosUsados = usageData?.giros_usados || 0
    }

    // FÓRMULA DE CONTROL: Giradas Restantes = FLOOR(total/2) - usadas
    const girosDisponibles = Math.max(0, girosGratisTotales - girosUsados)

    return NextResponse.json({
      total_boletos: totalBoletosAprobados,
      giros_gratis_totales: girosGratisTotales,
      giros_usados: girosUsados,
      giros_disponibles: girosDisponibles,
      estado,
    })
  } catch (error) {
    console.error('Error fetching free spin count:', error)
    return NextResponse.json({
      total_boletos: 0,
      giros_gratis_totales: 0,
      giros_usados: 0,
      giros_disponibles: 0,
      error: 'Error fetching data',
    })
  }
}
