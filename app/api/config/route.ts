import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: config, error } = await supabase
      .from('config')
      .select('*')
      .single()

    if (error) {
      console.error('Config fetch error:', error)
      return NextResponse.json(
        { error: 'Error al obtener configuración' },
        { status: 500 }
      )
    }

    return NextResponse.json(config)
  } catch (error) {
    console.error('Config error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = await createClient()
    const body = await request.json()

    // Get current config ID
    const { data: currentConfig } = await supabase
      .from('config')
      .select('id')
      .single()

    if (!currentConfig) {
      return NextResponse.json(
        { error: 'Configuración no encontrada' },
        { status: 404 }
      )
    }

    const { data: config, error } = await supabase
      .from('config')
      .update({
        total_boletos: body.total_boletos,
        precio_boleto_dop: body.precio_boleto_dop,
        precio_boleto_usd: body.precio_boleto_usd,
        comision_referido: body.comision_referido,
        manual_progress: body.manual_progress ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentConfig.id)
      .select()
      .single()

    if (error) {
      console.error('Config update error:', error)
      return NextResponse.json(
        { error: 'Error al actualizar configuración' },
        { status: 500 }
      )
    }

    return NextResponse.json(config)
  } catch (error) {
    console.error('Config update error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
