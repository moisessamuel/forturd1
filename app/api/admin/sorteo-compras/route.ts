import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// This endpoint is for the individual sorteo admin panels (BMW X6, BMW X7)
// Authentication is handled via sessionStorage on the client side
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const sorteoSlug = searchParams.get('sorteo_slug')
    const estado = searchParams.get('estado')
    const search = searchParams.get('search')

    if (!sorteoSlug) {
      return NextResponse.json({ error: 'sorteo_slug is required' }, { status: 400 })
    }

    // Query compras table for this sorteo
    let query = supabase
      .from('compras')
      .select('*')
      .eq('sorteo_slug', sorteoSlug)
      .order('created_at', { ascending: false })

    if (estado && estado !== 'Todos' && estado !== 'todos') {
      query = query.eq('estado', estado.toLowerCase())
    }

    if (search) {
      query = query.or(`nombre_comprador.ilike.%${search}%,telefono.ilike.%${search}%,numero_boleto.ilike.%${search}%`)
    }

    const { data: compras, error } = await query

    if (error) {
      console.error('Sorteo compras fetch error:', error)
      return NextResponse.json({ error: 'Error al obtener compras' }, { status: 500 })
    }

    // Transform to match the expected format in the admin panel
    const result = (compras || []).map(compra => ({
      id: compra.id,
      nombre: compra.nombre_comprador,
      telefono: compra.telefono,
      email: compra.email,
      cedula: compra.cedula,
      numero_boleto: compra.numero_boleto,
      cantidad_boletos: compra.cantidad_boletos || 1,
      total_tickets: compra.cantidad_boletos || 1,
      monto: compra.monto,
      moneda: compra.moneda || 'DOP',
      banco: compra.banco,
      metodo_pago: compra.metodo_pago,
      comprobante_url: compra.comprobante_url,
      estado: compra.estado,
      referido_codigo: compra.referido_codigo,
      sorteo_slug: compra.sorteo_slug,
      created_at: compra.created_at,
      updated_at: compra.updated_at,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Sorteo compras error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// Update estado (approve/reject/reset)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { id, estado } = body

    if (!id || !estado) {
      return NextResponse.json({ error: 'id and estado are required' }, { status: 400 })
    }

    // Update compra status
    const { data, error } = await supabase
      .from('compras')
      .update({ 
        estado,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update estado error:', error)
      return NextResponse.json({ error: 'Error al actualizar estado' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('PATCH error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
