import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DEFAULT_SORTEOS: Record<string, any> = {
  'bmw-x6': {
    slug: 'bmw-x6',
    nombre: 'BMW X6 2024',
    descripcion: 'Deportivo, elegante y potente. Diseñado para destacar.',
    precio_rd: 490,
    precio_usd: 9,
    total_boletos: 99999,
    estado: 'activo',
  },
  'bmw-x7': {
    slug: 'bmw-x7',
    nombre: 'BMW X7 2024',
    descripcion: 'Espacioso, cómodo y confortable. Ideal para toda la familia.',
    precio_rd: 490,
    precio_usd: 9,
    total_boletos: 99999,
    estado: 'activo',
  },
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = await createClient()

  try {
    // Get sorteo info
    const { data: sorteo, error: sorteoError } = await supabase
      .from('sorteos')
      .select('total_boletos, boletos_vendidos, metadata')
      .eq('slug', slug)
      .single()

    // If sorteo doesn't exist, return default progress
    if (sorteoError || !sorteo) {
      return NextResponse.json({ 
        porcentaje: 0, 
        vendidos: 0, 
        total: 99999,
        isManual: false,
        _note: 'Sorteo not found in database'
      })
    }

    // Try to get manual progress from metadata JSON field
    let manualProgress = null
    if (sorteo.metadata && typeof sorteo.metadata === 'object') {
      manualProgress = (sorteo.metadata as any).progreso_manual
    }

    // If there's a manual progress set, return it
    if (manualProgress !== null && manualProgress !== undefined) {
      return NextResponse.json({
        porcentaje: manualProgress,
        vendidos: 0,
        total: 100,
        isManual: true,
      })
    }

    // Count approved tickets for this sorteo from purchase_groups
    const { data: groups, error: groupsError } = await supabase
      .from('purchase_groups')
      .select('id')
      .eq('sorteo_slug', slug)
      .eq('estado', 'aprobado')

    let vendidos = 0

    if (!groupsError && groups) {
      // Count tickets in approved groups
      for (const group of groups) {
        const { count } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('purchase_group_id', group.id)

        vendidos += count || 0
      }
    }

    // Also count from legacy compras table
    const { data: legacyCompras } = await supabase
      .from('compras')
      .select('cantidad')
      .eq('sorteo_slug', slug)
      .eq('estado', 'aprobado')

    if (legacyCompras) {
      vendidos += legacyCompras.reduce((sum, c) => sum + (c.cantidad || 0), 0)
    }

    const total = sorteo.total_boletos || 99999
    const porcentaje = (vendidos / total) * 100

    return NextResponse.json({
      porcentaje: Math.min(porcentaje, 100),
      vendidos,
      total,
      isManual: false,
    })
  } catch (error) {
    console.error('Error getting sorteo progress:', error)
    return NextResponse.json({ porcentaje: 0, vendidos: 0, total: 99999 })
  }
}

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
        { error: 'Invalid progress value. Must be between 0 and 100.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // First, try to get current sorteo and metadata
    let { data: sorteo, error: selectError } = await supabase
      .from('sorteos')
      .select('metadata')
      .eq('slug', slug)
      .single()

    // If sorteo doesn't exist, create it first
    if (selectError || !sorteo) {
      if (DEFAULT_SORTEOS[slug]) {
        const { data: created, error: createError } = await supabase
          .from('sorteos')
          .insert({
            ...DEFAULT_SORTEOS[slug],
            metadata: {
              progreso_manual: porcentaje,
              boletosVendidos: [],
              created_at: new Date().toISOString(),
            },
          })
          .select('metadata')
          .single()

        if (!createError && created) {
          return NextResponse.json(
            { 
              porcentaje, 
              message: 'Sorteo created and progress updated',
              isManual: true,
              slug,
              updated_at: new Date().toISOString()
            },
            { status: 200 }
          )
        }
      }

      return NextResponse.json(
        { error: `Sorteo not found and could not be created: ${slug}` },
        { status: 404 }
      )
    }

    // Prepare updated metadata
    const currentMetadata = (sorteo?.metadata && typeof sorteo.metadata === 'object') 
      ? sorteo.metadata 
      : {}
    const updatedMetadata = {
      ...currentMetadata,
      progreso_manual: porcentaje,
      ultima_actualizacion: new Date().toISOString(),
    }

    // Update the metadata field in sorteos table
    const { data: updateData, error: updateError } = await supabase
      .from('sorteos')
      .update({ metadata: updatedMetadata })
      .eq('slug', slug)
      .select()

    if (updateError) {
      console.error('Error updating progress:', updateError)
      return NextResponse.json(
        { 
          error: `Error updating progress: ${updateError.message}`,
          code: updateError.code,
          details: updateError.details
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        porcentaje, 
        message: 'Progress updated successfully', 
        isManual: true,
        slug,
        updated_at: new Date().toISOString()
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in PUT /api/sorteos/[slug]/progress:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Error updating progress: ${errorMessage}` },
      { status: 500 }
    )
  }
}
