import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateTicketNumber } from '@/lib/ticket'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const estado = searchParams.get('estado')
    const origen = searchParams.get('origen')
    const search = searchParams.get('search')

    let query = supabase
      .from('compras')
      .select('*')
      .order('created_at', { ascending: false })

    if (estado && estado !== 'todos') {
      query = query.eq('estado', estado)
    }

    if (origen && origen !== 'todos') {
      query = query.eq('origen', origen)
    }

    if (search) {
      query = query.or(
        `nombre_comprador.ilike.%${search}%,telefono.ilike.%${search}%,numero_boleto.ilike.%${search}%,cedula.ilike.%${search}%`
      )
    }

    const { data: compras, error } = await query

    if (error) {
      console.error('Compras fetch error:', error)
      return NextResponse.json(
        { error: 'Error al obtener compras' },
        { status: 500 }
      )
    }

    return NextResponse.json(compras)
  } catch (error) {
    console.error('Compras error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Get config for price
    const { data: config } = await supabase
      .from('config')
      .select('precio_boleto_dop')
      .single()

    if (!config) {
      return NextResponse.json(
        { error: 'Configuración no encontrada' },
        { status: 500 }
      )
    }

    // Generate ticket number
    const ticketNumber = await generateTicketNumber()

    // Get USD price
    const { data: fullConfig } = await supabase
      .from('config')
      .select('precio_boleto_usd')
      .single()

    // Calculate total based on currency
    const isUsd = body.moneda === 'USD'
    const precioUnitario = isUsd ? (fullConfig?.precio_boleto_usd || 20) : config.precio_boleto_dop
    const monto = precioUnitario * body.cantidad

    // Determine origin
    const origen = body.referido_codigo ? 'referido' : 'directo'

    // Validate referral code if provided
    if (body.referido_codigo) {
      const { data: referido } = await supabase
        .from('referidos')
        .select('id')
        .eq('codigo', body.referido_codigo.toUpperCase())
        .eq('activo', true)
        .single()

      if (!referido) {
        return NextResponse.json(
          { error: 'Código de referido inválido' },
          { status: 400 }
        )
      }
    }

    const { data: compra, error } = await supabase
      .from('compras')
      .insert({
        numero_boleto: ticketNumber,
        nombre_comprador: body.nombre,
        telefono: body.telefono,
        email: body.email || null,
        cedula: body.cedula || null,
        cantidad_boletos: body.cantidad,
        monto,
        moneda: body.moneda || 'DOP',
        banco: body.banco,
        metodo_pago: 'transferencia',
        referido_codigo: body.referido_codigo?.toUpperCase() || null,
        comprobante_url: body.comprobante_url || null,
        estado: 'pendiente',
        origen,
      })
      .select()
      .single()

    if (error) {
      console.error('Compra insert error:', error)
      return NextResponse.json(
        { error: 'Error al crear compra' },
        { status: 500 }
      )
    }

    return NextResponse.json(compra)
  } catch (error) {
    console.error('Compra error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
