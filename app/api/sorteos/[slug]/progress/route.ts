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
      .select('total_boletos, boletos_vendidos')
      .eq('slug', slug)
      .single()

    if (sorteoError || !sorteo) {
      return NextResponse.json({ porcentaje: 0, vendidos: 0, total: 1000 })
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
    })
  } catch (error) {
    console.error('Error getting sorteo progress:', error)
    return NextResponse.json({ porcentaje: 0, vendidos: 0, total: 1000 })
  }
}
