import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get all jugadas
    const { data: jugadas } = await supabase
      .from('ruleta_jugadas')
      .select('monto, moneda, estado, es_gratis, resultado, player_id')

    let ventasDOP = 0
    let ventasUSD = 0
    let pendientes = 0
    let confirmados = 0
    let jugados = 0
    let premiosEntregados = 0
    let girosTotales = jugadas?.length || 0
    let girosGratis = 0
    const uniquePlayers = new Set<string>()

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
