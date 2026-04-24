import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = await createClient()

    const { data: referidos, error } = await supabase
      .from('referidos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Referidos fetch error:', error)
      return NextResponse.json(
        { error: 'Error al obtener referidos' },
        { status: 500 }
      )
    }

    // Get sales stats for each referido from both old and new tables, separated by currency
    const referidosWithStats = await Promise.all(
      (referidos || []).map(async (referido) => {
        const [{ data: oldCompras }, { data: newGroups }] = await Promise.all([
          supabase
            .from('compras')
            .select('monto, estado, moneda')
            .eq('referido_codigo', referido.codigo),
          supabase
            .from('purchase_groups')
            .select('monto, estado, moneda')
            .eq('referido_codigo', referido.codigo),
        ])

        // Calculate DOP sales (old system)
        const oldApprovedDOP = oldCompras
          ?.filter((c) => c.estado === 'aprobado' && (c.moneda === 'DOP' || !c.moneda))
          .reduce((sum, c) => sum + Number(c.monto), 0) || 0

        const oldApprovedUSD = oldCompras
          ?.filter((c) => c.estado === 'aprobado' && c.moneda === 'USD')
          .reduce((sum, c) => sum + Number(c.monto), 0) || 0

        // Calculate new system sales by currency
        const newApprovedDOP = newGroups
          ?.filter((pg) => pg.estado === 'aprobado' && (pg.moneda === 'DOP' || !pg.moneda))
          .reduce((sum, pg) => sum + Number(pg.monto), 0) || 0

        const newApprovedUSD = newGroups
          ?.filter((pg) => pg.estado === 'aprobado' && pg.moneda === 'USD')
          .reduce((sum, pg) => sum + Number(pg.monto), 0) || 0

        const ventasAprobadasDOP = oldApprovedDOP + newApprovedDOP
        const ventasAprobadasUSD = oldApprovedUSD + newApprovedUSD
        const ventasAprobadas = ventasAprobadasDOP + ventasAprobadasUSD

        return {
          ...referido,
          ventas_aprobadas: ventasAprobadas,
          ventas_dop: ventasAprobadasDOP,
          ventas_usd: ventasAprobadasUSD,
          comision_dop: ventasAprobadasDOP * 0.15,
          comision_usd: ventasAprobadasUSD * 0.15,
        }
      })
    )

    return NextResponse.json(referidosWithStats)
  } catch (error) {
    console.error('Referidos error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID es requerido' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('referidos')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Referido delete error:', error)
      return NextResponse.json(
        { error: 'Error al eliminar referido' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Referido delete error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = await createClient()
    const body = await request.json()

    if (!body.nombre_agente || !body.codigo) {
      return NextResponse.json(
        { error: 'Nombre y código son requeridos' },
        { status: 400 }
      )
    }

    const { data: referido, error } = await supabase
      .from('referidos')
      .insert({
        nombre_agente: body.nombre_agente,
        codigo: body.codigo.toUpperCase(),
        cedula: body.cedula || null,
        telefono: body.telefono || null,
        activo: true,
        created_by: body.created_by || 'admin',
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'El código ya existe' },
          { status: 400 }
        )
      }
      console.error('Referido insert error:', error)
      return NextResponse.json(
        { error: 'Error al crear referido' },
        { status: 500 }
      )
    }

    return NextResponse.json(referido)
  } catch (error) {
    console.error('Referido error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
