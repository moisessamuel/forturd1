import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import { sendTicketApprovalEmail } from '@/lib/email'

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
    const motivo = body.motivo

    // If reverting to pendiente, get current state first and log it
    if (newEstado === 'pendiente' && motivo) {
      const { data: currentGroup } = await supabase
        .from('purchase_groups')
        .select('estado')
        .eq('id', id)
        .single()

      if (currentGroup) {
        await supabase.from('audit_log').insert({
          purchase_group_id: id,
          admin_username: session.username || 'admin',
          estado_anterior: currentGroup.estado,
          estado_nuevo: 'pendiente',
          motivo,
        })
      }
    }

    // Update purchase group
    const updateData: Record<string, unknown> = { estado: newEstado }
    if (newEstado === 'aprobado') {
      updateData.fecha_aprobacion = new Date().toISOString()
    }
    if (newEstado === 'pendiente') {
      updateData.fecha_aprobacion = null
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

    // Send email notification when approved
    if (newEstado === 'aprobado' && group.player?.email) {
      try {
        const ticketNumbers = group.tickets?.map((t: { numero_boleto: string }) => t.numero_boleto) || []
        // Generate QR code image URL using Google Charts API
        const qrValue = group.qr_code?.qr_value || ''
        const qrCodeUrl = qrValue 
          ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrValue)}`
          : ''
        const purchaseDate = new Date(group.created_at).toLocaleDateString('es-DO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })

        await sendTicketApprovalEmail({
          playerName: group.player.nombre,
          playerEmail: group.player.email,
          ticketNumbers,
          totalAmount: group.monto,
          moneda: group.moneda || 'DOP',
          qrCodeUrl,
          purchaseDate,
        })
        console.log(`[v0] Email sent to ${group.player.email} for purchase ${id}`)
      } catch (emailError) {
        console.error('[v0] Error sending approval email:', emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json(group)
  } catch (error) {
    console.error('Compra update error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
