import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateTicketNumbers } from '@/lib/ticket'
import { getSession } from '@/lib/auth'
import { randomUUID } from 'crypto'
import { sendTicketPendingEmail } from '@/lib/email'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const estado = searchParams.get('estado')
    const search = searchParams.get('search')

    let query = supabase
      .from('purchase_groups')
      .select('*, player:players(*), tickets(*)')
      .order('created_at', { ascending: false })

    if (estado && estado !== 'todos') {
      query = query.eq('estado', estado)
    }

    const { data: groups, error } = await query

    if (error) {
      console.error('Purchase groups fetch error:', error)
      return NextResponse.json({ error: 'Error al obtener compras' }, { status: 500 })
    }

    // For each group, load individual ticket players if they differ from purchase group player
    const groupsWithTicketPlayers = await Promise.all((groups || []).map(async (group) => {
      const tickets = group.tickets || []
      const purchaseGroupPlayerId = group.player_id
      
      // Find tickets with different player_id (individually edited tickets)
      const ticketsWithDifferentPlayers = tickets.filter(
        (t: { player_id: string }) => t.player_id && t.player_id !== purchaseGroupPlayerId
      )
      
      if (ticketsWithDifferentPlayers.length === 0) {
        return group
      }
      
      // Get unique player IDs
      const uniquePlayerIds = [...new Set(ticketsWithDifferentPlayers.map((t: { player_id: string }) => t.player_id))]
      
      // Fetch those players
      const { data: ticketPlayers } = await supabase
        .from('players')
        .select('*')
        .in('id', uniquePlayerIds)
      
      // Create a map of player_id to player data
      const playerMap: Record<string, unknown> = {}
      ticketPlayers?.forEach((player) => {
        playerMap[player.id] = player
      })
      
      // Add ticket_player to each ticket that has a different player
      const ticketsWithPlayers = tickets.map((ticket: { player_id: string }) => ({
        ...ticket,
        ticket_player: playerMap[ticket.player_id] || null,
      }))
      
      return {
        ...group,
        tickets: ticketsWithPlayers,
      }
    }))

    // Filter by search if provided
    let result = groupsWithTicketPlayers || []
    if (search) {
      const s = search.toLowerCase()
      result = result.filter((g: Record<string, unknown>) => {
        const player = g.player as Record<string, string> | null
        const tickets = g.tickets as Array<Record<string, string>> | null
        return (
          player?.nombre?.toLowerCase().includes(s) ||
          player?.phone_number?.toLowerCase().includes(s) ||
          player?.cedula?.toLowerCase().includes(s) ||
          tickets?.some((t) => t.numero_boleto?.toLowerCase().includes(s))
        )
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Compras error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Get config for price
    const { data: config } = await supabase
      .from('config')
      .select('precio_boleto_dop, precio_boleto_usd')
      .single()

    if (!config) {
      return NextResponse.json({ error: 'Configuración no encontrada' }, { status: 500 })
    }

    // Validate referral code if provided
    if (body.referido_codigo) {
      const { data: referido } = await supabase
        .from('referidos')
        .select('id')
        .eq('codigo', body.referido_codigo.toUpperCase())
        .eq('activo', true)
        .single()

      if (!referido) {
        return NextResponse.json({ error: 'Código de referido inválido' }, { status: 400 })
      }
    }

    // Calculate total
    const isUsd = body.moneda === 'USD'
    const precioUnitario = isUsd ? (config.precio_boleto_usd || 20) : config.precio_boleto_dop
    const monto = precioUnitario * body.cantidad

    // 1. Find or create player by phone number
    const phoneNumber = body.telefono.trim()
    let player: { id: string } | null = null

    const { data: existingPlayer } = await supabase
      .from('players')
      .select('id')
      .eq('phone_number', phoneNumber)
      .single()

    if (existingPlayer) {
      player = existingPlayer
      // Update player info if changed
      await supabase
        .from('players')
        .update({
          nombre: body.nombre,
          email: body.email || null,
          cedula: body.cedula || null,
        })
        .eq('id', existingPlayer.id)
    } else {
      const { data: newPlayer, error: playerError } = await supabase
        .from('players')
        .insert({
          phone_number: phoneNumber,
          nombre: body.nombre,
          email: body.email || null,
          cedula: body.cedula || null,
        })
        .select('id')
        .single()

      if (playerError || !newPlayer) {
        console.error('Player insert error:', playerError)
        return NextResponse.json({ error: 'Error al crear jugador' }, { status: 500 })
      }
      player = newPlayer
    }

    // 2. Find or create permanent QR for this player
    let qrCode: { id: string; qr_value: string } | null = null

    const { data: existingQR } = await supabase
      .from('qr_codes')
      .select('id, qr_value')
      .eq('player_id', player.id)
      .single()

    if (existingQR) {
      qrCode = existingQR
    } else {
      const qrValue = `FRD-${randomUUID().slice(0, 8).toUpperCase()}`
      const { data: newQR, error: qrError } = await supabase
        .from('qr_codes')
        .insert({
          qr_value: qrValue,
          player_id: player.id,
        })
        .select('id, qr_value')
        .single()

      if (qrError || !newQR) {
        console.error('QR insert error:', qrError)
        return NextResponse.json({ error: 'Error al crear QR' }, { status: 500 })
      }
      qrCode = newQR
    }

    // 3. Generate unique ticket numbers
    const ticketNumbers = await generateTicketNumbers(body.cantidad)

    // 4. Create purchase group
    const { data: purchaseGroup, error: pgError } = await supabase
      .from('purchase_groups')
      .insert({
        player_id: player.id,
        qr_code_id: qrCode.id,
        total_tickets: body.cantidad,
        monto,
        moneda: body.moneda || 'DOP',
        banco: body.banco,
        comprobante_url: body.comprobante_url || null,
        referido_codigo: body.referido_codigo?.toUpperCase() || null,
        estado: 'pendiente',
      })
      .select('id')
      .single()

    if (pgError || !purchaseGroup) {
      console.error('Purchase group insert error:', pgError)
      return NextResponse.json({ error: 'Error al crear grupo de compra' }, { status: 500 })
    }

    // 5. Create all tickets
    const ticketsToInsert = ticketNumbers.map((num) => ({
      numero_boleto: num,
      purchase_group_id: purchaseGroup.id,
      player_id: player!.id,
      status: 'pending',
    }))

    const { error: ticketsError } = await supabase
      .from('tickets')
      .insert(ticketsToInsert)

    if (ticketsError) {
      console.error('Tickets insert error:', ticketsError)
      // Rollback: delete the purchase group
      await supabase.from('purchase_groups').delete().eq('id', purchaseGroup.id)
      return NextResponse.json({ error: 'Error al crear boletos' }, { status: 500 })
    }

    // Return the full purchase group with tickets and QR
    const { data: fullPG } = await supabase
      .from('purchase_groups')
      .select('*, player:players(*), tickets(*), qr_code:qr_codes(*)')
      .eq('id', purchaseGroup.id)
      .single()

    // Send pending email notification if player has email
    if (body.email) {
      try {
        const purchaseDate = new Date().toLocaleDateString('es-DO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })

        await sendTicketPendingEmail({
          playerName: body.nombre,
          playerEmail: body.email,
          ticketNumbers,
          totalAmount: monto,
          moneda: body.moneda || 'DOP',
          qrCodeUrl: '',
          purchaseDate,
        })
        console.log(`[v0] Pending email sent to ${body.email}`)
      } catch (emailError) {
        console.error('[v0] Error sending pending email:', emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json(fullPG)
  } catch (error) {
    console.error('Compra error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
