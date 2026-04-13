import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'

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

    const updateData: Record<string, string> = {}

    if (body.nombre !== undefined) updateData.nombre = body.nombre
    if (body.phone_number !== undefined) updateData.phone_number = body.phone_number
    if (body.email !== undefined) updateData.email = body.email

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No hay datos para actualizar' }, { status: 400 })
    }

    const { data: player, error } = await supabase
      .from('players')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Player update error:', error)
      return NextResponse.json({ error: 'Error al actualizar datos del comprador' }, { status: 500 })
    }

    return NextResponse.json(player)
  } catch (error) {
    console.error('Player update error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
