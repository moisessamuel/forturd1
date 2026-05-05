import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()

    // Check if BMW X6 exists, if not create it
    const { data: x6, error: x6Error } = await supabase
      .from('sorteos')
      .select('*')
      .eq('slug', 'bmw-x6')
      .single()

    if (x6Error || !x6) {
      console.log('[v0] Creating BMW X6 sorteo...')
      const { error: insertError } = await supabase
        .from('sorteos')
        .insert({
          slug: 'bmw-x6',
          nombre: 'BMW X6 2024',
          descripcion: 'Vehiculo deportivo, elegante y potente. Diseñado para destacar.',
          precio_rd: 490,
          precio_usd: 9,
          total_boletos: 99999,
          estado: 'activo',
          metadata: { progreso_manual: 0 },
        })

      if (insertError) {
        console.error('[v0] Error creating BMW X6:', insertError)
      }
    }

    // Check if BMW X7 exists, if not create it
    const { data: x7, error: x7Error } = await supabase
      .from('sorteos')
      .select('*')
      .eq('slug', 'bmw-x7')
      .single()

    if (x7Error || !x7) {
      console.log('[v0] Creating BMW X7 sorteo...')
      const { error: insertError } = await supabase
        .from('sorteos')
        .insert({
          slug: 'bmw-x7',
          nombre: 'BMW X7 2024',
          descripcion: 'SUV espacioso, cómodo y confortable. Ideal para toda la familia.',
          precio_rd: 490,
          precio_usd: 9,
          total_boletos: 99999,
          estado: 'activo',
          metadata: { progreso_manual: 0 },
        })

      if (insertError) {
        console.error('[v0] Error creating BMW X7:', insertError)
      }
    }

    return NextResponse.json({ message: 'Sorteos initialized successfully' }, { status: 200 })
  } catch (error) {
    console.error('[v0] Error initializing sorteos:', error)
    return NextResponse.json({ error: 'Error initializing sorteos' }, { status: 500 })
  }
}
