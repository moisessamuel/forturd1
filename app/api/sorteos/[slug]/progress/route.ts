import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: Obtiene el progreso actual del sorteo
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = await createClient()

  try {
    const { data: sorteo, error } = await supabase
      .from('sorteos')
      .select('progreso_manual')
      .eq('slug', slug)
      .single()

    if (error || !sorteo) {
      return NextResponse.json({ porcentaje: 0 })
    }

    return NextResponse.json({
      porcentaje: sorteo.progreso_manual || 0
    })
  } catch (error) {
    return NextResponse.json({ porcentaje: 0 })
  }
}

// PUT: Actualiza el progreso del sorteo
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const { porcentaje } = body

    if (typeof porcentaje !== 'number' || porcentaje < 0 || porcentaje > 100) {
      return NextResponse.json(
        { error: 'Valor de progreso invalido. Debe estar entre 0 y 100.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Actualizar directamente la columna progreso_manual
    const { data, error } = await supabase
      .from('sorteos')
      .update({ progreso_manual: porcentaje })
      .eq('slug', slug)
      .select()

    if (error) {
      console.error('Error updating progress:', error)
      return NextResponse.json(
        { error: `Error al actualizar: ${error.message}` },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: `Sorteo no encontrado: ${slug}` },
        { status: 404 }
      )
    }

    return NextResponse.json({
      porcentaje,
      message: 'Progreso actualizado correctamente'
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
