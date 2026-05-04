import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// This endpoint is for the individual sorteo admin panels (BMW X6, BMW X7)
// Authentication is handled via sessionStorage on the client side
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const sorteoSlug = searchParams.get('sorteo_slug')
    const estado = searchParams.get('estado')
    const search = searchParams.get('search')

    if (!sorteoSlug) {
      return NextResponse.json({ error: 'sorteo_slug is required' }, { status: 400 })
    }

    // Query purchase_groups table with player data for this sorteo
    let query = supabase
      .from('purchase_groups')
      .select(`
        id,
        player_id,
        sorteo_slug,
        estado,
        monto,
        moneda,
        banco,
        total_tickets,
        comprobante_url,
        created_at,
        updated_at,
        player:players(id, nombre, phone_number, email)
      `)
      .eq('sorteo_slug', sorteoSlug)
      .order('created_at', { ascending: false })

    if (estado && estado !== 'Todos' && estado !== 'todos') {
      query = query.eq('estado', estado.toLowerCase())
    }

    const { data: compras, error } = await query

    if (error) {
      console.error('Sorteo compras fetch error:', error)
      return NextResponse.json({ error: 'Error al obtener compras' }, { status: 500 })
    }

    // Filter by search if provided
    let result = compras || []
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(compra => {
        const nombre = compra.player?.nombre?.toLowerCase() || ''
        const telefono = compra.player?.phone_number?.toLowerCase() || ''
        return nombre.includes(searchLower) || telefono.includes(searchLower)
      })
    }

    // Transform to match the expected format in the admin panel
    const transformed = result.map(compra => ({
      id: compra.id,
      nombre: compra.player?.nombre || 'N/A',
      telefono: compra.player?.phone_number || 'N/A',
      email: compra.player?.email || null,
      cantidad_boletos: compra.total_tickets || 1,
      total_tickets: compra.total_tickets || 1,
      monto: compra.monto,
      moneda: compra.moneda || 'DOP',
      banco: compra.banco || 'N/A',
      comprobante_url: compra.comprobante_url,
      estado: compra.estado,
      sorteo_slug: compra.sorteo_slug,
      created_at: compra.created_at,
      updated_at: compra.updated_at,
      player: compra.player,
    }))

    return NextResponse.json(transformed)
  } catch (error) {
    console.error('Sorteo compras error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// Update estado (approve/reject/reset)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { id, estado } = body

    if (!id || !estado) {
      return NextResponse.json({ error: 'id and estado are required' }, { status: 400 })
    }

    // Update purchase_groups status
    const { data, error } = await supabase
      .from('purchase_groups')
      .update({ 
        estado,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update estado error:', error)
      return NextResponse.json({ error: 'Error al actualizar estado' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('PATCH error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// Delete a purchase
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // First delete associated tickets
    await supabase
      .from('tickets')
      .delete()
      .eq('purchase_group_id', id)

    // Then delete the purchase group
    const { error } = await supabase
      .from('purchase_groups')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete purchase error:', error)
      return NextResponse.json({ error: 'Error al eliminar compra' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
