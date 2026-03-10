import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'

export async function POST() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = await createClient()

    // Delete in correct order (respect foreign keys)
    // 1. Delete tickets (depends on purchase_groups)
    await supabase.from('tickets').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 2. Delete purchase_groups (depends on players, qr_codes)
    await supabase.from('purchase_groups').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 3. Delete qr_codes (depends on players)
    await supabase.from('qr_codes').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 4. Delete players
    await supabase.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 5. Delete old compras
    await supabase.from('compras').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 6. Delete old boletos if table exists
    await supabase.from('boletos').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    return NextResponse.json({ success: true, message: 'Sistema restablecido correctamente' })
  } catch (error) {
    console.error('Reset error:', error)
    return NextResponse.json({ error: 'Error al restablecer el sistema' }, { status: 500 })
  }
}
