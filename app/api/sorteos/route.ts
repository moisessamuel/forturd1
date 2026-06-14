import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Define sorteos that must exist
const REQUIRED_SORTEOS: Record<string, any> = {
  'bmw-x6': {
    slug: 'bmw-x6',
    nombre: 'BMW X6 2024',
    descripcion: 'Deportivo, elegante y potente. Diseñado para destacar.',
    precio_rd: 300,
    precio_usd: 9,
    total_boletos: 99999,
    estado: 'activo',
  },
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const activeOnly = searchParams.get('active') === 'true'

  try {
    let query = supabase.from('sorteos').select('*')

    if (slug) {
      query = query.eq('slug', slug).single()
      const { data, error } = await query

      // If sorteo doesn't exist and it's a required one, create it
      if (error && REQUIRED_SORTEOS[slug]) {
        console.log(`[v0] Creating missing sorteo: ${slug}`)
        const { data: created, error: createError } = await supabase
          .from('sorteos')
          .insert({
            ...REQUIRED_SORTEOS[slug],
            progreso_manual: 0,
          })
          .select('*')
          .single()

        if (createError) {
          console.error(`Error creating sorteo ${slug}:`, createError)
          // Return template data so UI doesn't break
          return NextResponse.json({
            ...REQUIRED_SORTEOS[slug],
            id: slug,
            progreso_manual: 0,
          })
        }

        return NextResponse.json(created)
      }

      if (error) {
        console.error('Error fetching sorteos:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    } else if (activeOnly) {
      query = query.eq('activo', true).order('created_at', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching sorteos:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in sorteos API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
