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

    // Get sales stats for each referido
    const referidosWithStats = await Promise.all(
      (referidos || []).map(async (referido) => {
        const { data: compras } = await supabase
          .from('compras')
          .select('monto, estado')
          .eq('referido_codigo', referido.codigo)

        const ventasAprobadas = compras
          ?.filter((c) => c.estado === 'aprobado')
          .reduce((sum, c) => sum + Number(c.monto), 0) || 0

        const ventasTotales = compras?.reduce((sum, c) => sum + Number(c.monto), 0) || 0

        return {
          ...referido,
          ventas_aprobadas: ventasAprobadas,
          ventas_totales: ventasTotales,
          comision: ventasAprobadas * 0.1, // 10% commission
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
        activo: true,
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
