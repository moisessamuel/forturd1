import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: bancos, error } = await supabase
      .from('bancos')
      .select('*')
      .eq('activo', true)
      .order('nombre')

    if (error) {
      console.error('Bancos fetch error:', error)
      return NextResponse.json(
        { error: 'Error al obtener bancos' },
        { status: 500 }
      )
    }

    return NextResponse.json(bancos)
  } catch (error) {
    console.error('Bancos error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
