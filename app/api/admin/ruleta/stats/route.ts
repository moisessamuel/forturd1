import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get paid jugadas from ruleta_jugadas
    const { data: paidJugadas } = await supabase
      .from('ruleta_jugadas')
      .select('monto, moneda, estado, es_gratis, resultado, player_id')

    // Get free jugadas from jugadas_ruleta
    const { data: freeJugadas } = await supabase
      .from('jugadas_ruleta')
      .select('monto, moneda, estado, es_giro_gratis, resultado, telefono')

    let ventasDOP = 0
    let ventasUSD = 0
    let pendientes = 0
    let confirmados = 0
    let jugados = 0
    let premiosEntregados = 0
    let girosGratis = 0
    const uniquePlayers = new Set<string>()
    
    // Process paid jugadas
    const jugadas = paidJugadas || []

    for (const j of jugadas || []) {
      if (j.player_id) {
        uniquePlayers.add(j.player_id)
      }

      if (j.es_gratis) {
        girosGratis++
      } else if (j.estado === 'confirmado' || j.estado === 'jugado') {
        if (j.moneda === 'DOP') {
          ventasDOP += Number(j.monto)
        } else {
          ventasUSD += Number(j.monto)
        }
      }

      if (j.estado === 'pendiente') {
        pendientes++
      } else if (j.estado === 'confirmado') {
        confirmados++
      } else if (j.estado === 'jugado') {
        jugados++
        if (j.resultado && j.resultado !== 'Sigue Intentando') {
          premiosEntregados++
        }
      }
    }

    // Process free jugadas from jugadas_ruleta
    for (const j of freeJugadas || []) {
      if (j.telefono) {
        uniquePlayers.add(j.telefono)
      }

      girosGratis++

      if (j.estado === 'pendiente') {
        pendientes++
      } else if (j.estado === 'confirmado') {
        confirmados++
      } else if (j.estado === 'jugado') {
        jugados++
        if (j.resultado && j.resultado !== 'Sigue Intentando') {
          premiosEntregados++
        }
      }
    }

    const girosTotales = (paidJugadas?.length || 0) + (freeJugadas?.length || 0)

    return NextResponse.json({
      ventas_dop: ventasDOP,
      ventas_usd: ventasUSD,
      total_giros: girosTotales,
      giros_pendientes: pendientes,
      giros_confirmados: confirmados,
      giros_jugados: jugados,
      premios_entregados: premiosEntregados,
      giros_gratis: girosGratis,
      jugadores_unicos: uniquePlayers.size,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
