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

    // Query purchase_groups for this sorteo
    let query = supabase
      .from('purchase_groups')
      .select('*, player:players(*), tickets(*)')
      .eq('sorteo_slug', sorteoSlug)
      .order('created_at', { ascending: false })

    if (estado && estado !== 'todos') {
      query = query.eq('estado', estado)
    }

    const { data: groups, error } = await query

    if (error) {
      console.error('Sorteo compras fetch error:', error)
      return NextResponse.json({ error: 'Error al obtener compras' }, { status: 500 })
    }

    // Transform to include total_tickets count
    let result = (groups || []).map(group => ({
      ...group,
      total_tickets: group.tickets?.length || group.total_tickets || 0,
    }))

    // Filter by search if provided
    if (search) {
      const s = search.toLowerCase()
      result = result.filter((g) => {
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
    console.error('Sorteo compras error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// Update estado (approve/reject)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { id, estado } = body

    if (!id || !estado) {
      return NextResponse.json({ error: 'id and estado are required' }, { status: 400 })
    }

    // Update purchase group status
    const { data, error } = await supabase
      .from('purchase_groups')
      .update({ 
        estado,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*, player:players(*), tickets(*)')
      .single()

    if (error) {
      console.error('Update estado error:', error)
      return NextResponse.json({ error: 'Error al actualizar estado' }, { status: 500 })
    }

    // If approved, update all tickets to 'active'
    if (estado === 'aprobado') {
      await supabase
        .from('tickets')
        .update({ status: 'active' })
        .eq('purchase_group_id', id)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('PATCH error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
