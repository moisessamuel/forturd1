import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: group, error } = await supabase
      .from('purchase_groups')
      .select('*, player:players(*), tickets(*), qr_code:qr_codes(*)')
      .eq('id', id)
      .single()

    if (error || !group) {
      return NextResponse.json({ error: 'Compra no encontrada' }, { status: 404 })
    }

    return NextResponse.json(group)
  } catch (error) {
    console.error('Compra fetch error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    const newEstado = body.estado

    // Update purchase group
    const updateData: Record<string, unknown> = { estado: newEstado }
    if (newEstado === 'aprobado') {
      updateData.fecha_aprobacion = new Date().toISOString()
    }

    const { data: group, error } = await supabase
      .from('purchase_groups')
      .update(updateData)
      .eq('id', id)
      .select('*, player:players(*), tickets(*), qr_code:qr_codes(*)')
      .single()

    if (error) {
      console.error('Purchase group update error:', error)
      return NextResponse.json({ error: 'Error al actualizar compra' }, { status: 500 })
    }

    // Update all tickets status
    const ticketStatus = newEstado === 'aprobado' ? 'verified' : newEstado === 'rechazado' ? 'rejected' : 'pending'

    await supabase
      .from('tickets')
      .update({ status: ticketStatus })
      .eq('purchase_group_id', id)

    return NextResponse.json(group)
  } catch (error) {
    console.error('Compra update error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
