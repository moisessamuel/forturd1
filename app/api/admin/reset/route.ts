import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()

    // Delete all compras (this cascades to boletos)
    await supabase.from('compras').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Reset boletos - delete all assigned boletos
    await supabase.from('boletos').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Reset referidos stats (keep the referido agents but reset their counts)
    // We keep referidos since they are agents, not transactional data

    return NextResponse.json({ success: true, message: 'Sistema restablecido correctamente' })
  } catch (error) {
    console.error('Reset error:', error)
    return NextResponse.json(
      { error: 'Error al restablecer el sistema' },
      { status: 500 }
    )
  }
}
