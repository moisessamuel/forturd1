import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ qr: string }> }
) {
  try {
    const { qr } = await params
    const supabase = await createClient()

    // Find QR code
    const { data: qrCode, error: qrError } = await supabase
      .from('qr_codes')
      .select('*, player:players(*)')
      .eq('qr_value', qr)
      .single()

    if (qrError || !qrCode) {
      return NextResponse.json({ error: 'QR no encontrado' }, { status: 404 })
    }

    // Get all purchase groups with tickets for this player
    const { data: purchaseGroups } = await supabase
      .from('purchase_groups')
      .select('*, tickets(*)')
      .eq('player_id', qrCode.player_id)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      player: qrCode.player,
      qr_code: { id: qrCode.id, qr_value: qrCode.qr_value },
      purchase_groups: purchaseGroups || [],
    })
  } catch (error) {
    console.error('Player QR error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
