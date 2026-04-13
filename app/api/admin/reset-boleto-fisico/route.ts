import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'

export async function POST() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Only allow boleto_fisico or admin to reset
    if (session.role !== 'boleto_fisico' && session.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const supabase = await createClient()

    // Get all purchase_groups where:
    // 1. referido_codigo is 'BOLETOFISICO' OR
    // 2. player name contains 'boleto fisico'
    
    // First get players with boleto fisico name
    const { data: boletoFisicoPlayers } = await supabase
      .from('players')
      .select('id')
      .or('nombre.ilike.%boleto fisico%,nombre.ilike.%boletofisico%')

    const playerIds = boletoFisicoPlayers?.map(p => p.id) || []

    // Get purchase groups that match boleto fisico criteria
    let query = supabase
      .from('purchase_groups')
      .select('id')
      .or(`referido_codigo.eq.BOLETOFISICO${playerIds.length > 0 ? `,player_id.in.(${playerIds.join(',')})` : ''}`)

    const { data: purchaseGroups } = await query
    const purchaseGroupIds = purchaseGroups?.map(pg => pg.id) || []

    if (purchaseGroupIds.length === 0) {
      return NextResponse.json({ success: true, message: 'No hay boletos fisicos para restablecer' })
    }

    // Delete in correct order (respect foreign keys)
    // 1. Delete tickets for these purchase groups
    await supabase
      .from('tickets')
      .delete()
      .in('purchase_group_id', purchaseGroupIds)

    // 2. Delete the purchase groups
    await supabase
      .from('purchase_groups')
      .delete()
      .in('id', purchaseGroupIds)

    // 3. Delete players with boleto fisico name (if they have no other purchases)
    if (playerIds.length > 0) {
      for (const playerId of playerIds) {
        const { data: remainingPurchases } = await supabase
          .from('purchase_groups')
          .select('id')
          .eq('player_id', playerId)
          .limit(1)

        if (!remainingPurchases || remainingPurchases.length === 0) {
          await supabase.from('qr_codes').delete().eq('player_id', playerId)
          await supabase.from('players').delete().eq('id', playerId)
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Boletos fisicos restablecidos correctamente' })
  } catch (error) {
    console.error('Reset boleto fisico error:', error)
    return NextResponse.json({ error: 'Error al restablecer boletos fisicos' }, { status: 500 })
  }
}
