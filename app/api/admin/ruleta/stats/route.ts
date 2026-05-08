import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // ─── PRIMARY SOURCE: spins_individuales (each spin = 1 record) ─────────
    const { data: spins, count: totalSpins } = await supabase
      .from('spins_individuales')
      .select('*', { count: 'exact' })

    // ─── SECONDARY: Get jugadas for pending/confirmed counts ───────────────
    const { data: paidJugadas } = await supabase
      .from('ruleta_jugadas')
      .select('monto, moneda, estado, es_gratis, player_id, cantidad_giros')

    const { data: freeJugadas } = await supabase
      .from('jugadas_ruleta')
      .select('monto, moneda, estado, telefono, cantidad_giros')

    let ventasDOP = 0
    let ventasUSD = 0
    let pendientes = 0
    let confirmados = 0
    let premiosEntregados = 0
    let girosGratis = 0
    const uniquePlayers = new Set<string>()

    // ─── Count from spins_individuales (accurate per-spin data) ────────────
    for (const spin of spins || []) {
      if (spin.telefono) {
        uniquePlayers.add(spin.telefono)
      }
      
      if (spin.tipo === 'gratis' || spin.tipo === 'boleto') {
        girosGratis++
      }
      
      if (spin.es_premio) {
        premiosEntregados++
      }
    }

    // ─── Calculate sales from paid jugadas ─────────────────────────────────
    for (const j of paidJugadas || []) {
      if (j.player_id) {
        uniquePlayers.add(j.player_id)
      }

      if (!j.es_gratis && (j.estado === 'confirmado' || j.estado === 'jugado')) {
        if (j.moneda === 'DOP') {
          ventasDOP += Number(j.monto) || 0
        } else {
          ventasUSD += Number(j.monto) || 0
        }
      }

      if (j.estado === 'pendiente') {
        pendientes += j.cantidad_giros || 1
      } else if (j.estado === 'confirmado') {
        confirmados += j.cantidad_giros || 1
      }
    }

    // ─── Process free jugadas for player tracking ──────────────────────────
    for (const j of freeJugadas || []) {
      if (j.telefono) {
        uniquePlayers.add(j.telefono)
      }

      if (j.estado === 'pendiente') {
        pendientes += j.cantidad_giros || 1
      } else if (j.estado === 'confirmado') {
        confirmados += j.cantidad_giros || 1
      }
    }

    // Total giros jugados = records in spins_individuales
    const girosJugados = totalSpins || 0

    // Total giros = jugados + pendientes + confirmados (ready to play)
    const girosTotales = girosJugados + pendientes + confirmados

    return NextResponse.json({
      ventas_dop: ventasDOP,
      ventas_usd: ventasUSD,
      total_giros: girosTotales,
      giros_pendientes: pendientes,
      giros_confirmados: confirmados,
      giros_jugados: girosJugados,
      premios_entregados: premiosEntregados,
      giros_gratis: girosGratis,
      jugadores_unicos: uniquePlayers.size,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
