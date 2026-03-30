import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const boleto = searchParams.get('boleto')
    const telefono = searchParams.get('telefono')

    if (!boleto && !telefono) {
      return NextResponse.json({ error: 'Número de boleto o teléfono requerido' }, { status: 400 })
    }

    const supabase = await createClient()

    // Search by phone number - returns all tickets for that person
    if (telefono) {
      // Strip all non-digit characters for flexible matching
      const digitsOnly = telefono.replace(/[^0-9]/g, '')
      const cleanPhone = telefono.replace(/[^0-9+]/g, '')
      const results: Array<{
        numero_boleto: string
        nombre: string
        telefono: string
        estado: string
        cantidad_boletos: number
        monto: number
        moneda: string
        fecha: string
        banco: string
        source: string
      }> = []

      console.log('[v0] Searching for phone:', telefono, 'digitsOnly:', digitsOnly, 'cleanPhone:', cleanPhone)

      // Search in players/tickets (new system) using flexible matching
      // Try multiple approaches: exact, contains digits, with/without country code
      let player = null
      
      // First try exact match
      const { data: exactPlayer, error: exactError } = await supabase
        .from('players')
        .select('*')
        .eq('phone_number', telefono.trim())
        .single()
      
      console.log('[v0] Exact match result:', exactPlayer, 'error:', exactError)
      player = exactPlayer

      // If no exact match, try with cleaned phone (only digits and +)
      if (!player) {
        const { data: cleanPlayer, error: cleanError } = await supabase
          .from('players')
          .select('*')
          .eq('phone_number', cleanPhone)
          .single()
        console.log('[v0] Clean phone match result:', cleanPlayer, 'error:', cleanError)
        player = cleanPlayer
      }

      // If still no match, try searching with ILIKE for partial match
      if (!player && digitsOnly.length >= 7) {
        // Try matching last 10 digits (without country code)
        const lastDigits = digitsOnly.slice(-10)
        console.log('[v0] Trying ILIKE with last 10 digits:', lastDigits)
        const { data: likeResults, error: likeError } = await supabase
          .from('players')
          .select('*')
          .ilike('phone_number', `%${lastDigits}%`)
        
        console.log('[v0] ILIKE 10 digits result:', likeResults, 'error:', likeError)
        if (likeResults && likeResults.length > 0) {
          player = likeResults[0]
        }
      }

      // If still no match, try just the last 7 digits
      if (!player && digitsOnly.length >= 7) {
        const last7 = digitsOnly.slice(-7)
        console.log('[v0] Trying ILIKE with last 7 digits:', last7)
        const { data: likeResults, error: likeError } = await supabase
          .from('players')
          .select('*')
          .ilike('phone_number', `%${last7}%`)
        
        console.log('[v0] ILIKE 7 digits result:', likeResults, 'error:', likeError)
        if (likeResults && likeResults.length > 0) {
          player = likeResults[0]
        }
      }

      console.log('[v0] Final player found:', player)

      if (player) {
        const { data: purchaseGroups } = await supabase
          .from('purchase_groups')
          .select('*, tickets(*)')
          .eq('player_id', player.id)
          .order('created_at', { ascending: false })

        if (purchaseGroups) {
          for (const pg of purchaseGroups) {
            for (const ticket of (pg.tickets || [])) {
              results.push({
                numero_boleto: ticket.numero_boleto,
                nombre: player.nombre,
                telefono: player.phone_number,
                estado: pg.estado || 'pendiente',
                cantidad_boletos: pg.total_tickets || 1,
                monto: pg.monto,
                moneda: pg.moneda,
                fecha: ticket.created_at,
                banco: pg.banco || '',
                source: 'new',
              })
            }
          }
        }
      }

      // Also search in legacy compras table with flexible matching
      const lastDigitsLegacy = digitsOnly.slice(-7)
      const { data: compras } = await supabase
        .from('compras')
        .select('*')
        .ilike('telefono', `%${lastDigitsLegacy}%`)
        .order('fecha', { ascending: false })

      if (compras) {
        for (const compra of compras) {
          if (compra.numero_boleto) {
            results.push({
              numero_boleto: compra.numero_boleto,
              nombre: compra.nombre_comprador,
              telefono: compra.telefono,
              estado: compra.estado,
              cantidad_boletos: compra.cantidad_boletos,
              monto: compra.monto,
              moneda: compra.moneda,
              fecha: compra.created_at || compra.fecha,
              banco: compra.banco || '',
              source: 'legacy',
            })
          }
        }
      }

      console.log('[v0] Total results found:', results.length)

      if (results.length === 0) {
        return NextResponse.json({ error: 'No se encontraron boletos para este teléfono' }, { status: 404 })
      }

      return NextResponse.json({ telefono: telefono, results })
    }

    // Search by ticket number - single result
    const cleanBoleto = boleto!.replace(/[^0-9]/g, '')

    // Try new tickets table first
    const { data: ticket } = await supabase
      .from('tickets')
      .select('*, player:players(*), purchase_group:purchase_groups(*)')
      .eq('numero_boleto', cleanBoleto)
      .single()

    if (ticket) {
      return NextResponse.json({
        numero_boleto: ticket.numero_boleto,
        nombre: ticket.player?.nombre,
        telefono: ticket.player?.phone_number || '',
        estado: ticket.purchase_group?.estado || 'pendiente',
        cantidad_boletos: ticket.purchase_group?.total_tickets || 1,
        monto: ticket.purchase_group?.monto,
        moneda: ticket.purchase_group?.moneda,
        fecha: ticket.created_at,
        banco: ticket.purchase_group?.banco || '',
        source: 'new',
      })
    }

    // Fallback to old compras table
    const { data: compra } = await supabase
      .from('compras')
      .select('*')
      .eq('numero_boleto', cleanBoleto)
      .single()

    if (compra) {
      return NextResponse.json({
        numero_boleto: compra.numero_boleto,
        nombre: compra.nombre_comprador,
        telefono: compra.telefono || '',
        estado: compra.estado,
        cantidad_boletos: compra.cantidad_boletos,
        monto: compra.monto,
        moneda: compra.moneda,
        fecha: compra.created_at,
        banco: compra.banco || '',
        source: 'legacy',
      })
    }

    return NextResponse.json({ error: 'Boleto no encontrado' }, { status: 404 })
  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
