import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
      .select('total_boletos, boletos_vendidos, progreso_manual')
      .eq('slug', slug)
      .single()

    if (sorteoError || !sorteo) {
      return NextResponse.json({ porcentaje: 0, vendidos: 0, total: 1000 })
    }

    // If there's a manual progress set, return it
    if (sorteo.progreso_manual !== null && sorteo.progreso_manual !== undefined) {
      return NextResponse.json({
        porcentaje: sorteo.progreso_manual,
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

    const total = sorteo.total_boletos || 1000
    const porcentaje = (vendidos / total) * 100

    return NextResponse.json({
      porcentaje: Math.min(porcentaje, 100),
      vendidos,
      total,
      isManual: false,
    })
  } catch (error) {
    console.error('Error getting sorteo progress:', error)
    return NextResponse.json({ porcentaje: 0, vendidos: 0, total: 1000 })
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

    // Update the manual progress for this sorteo
    const { error } = await supabase
      .from('sorteos')
      .update({ progreso_manual: porcentaje })
      .eq('slug', slug)

    if (error) {
      console.error('Error updating progress:', error)
      return NextResponse.json(
        { error: 'Error updating progress' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { porcentaje, message: 'Progress updated successfully', isManual: true },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in PUT /api/sorteos/[slug]/progress:', error)
    return NextResponse.json(
      { error: 'Error updating progress' },
      { status: 500 }
    )
  }
}
