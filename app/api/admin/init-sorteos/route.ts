import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()

    // Check if BMW X6 exists, if not create it
    const { data: x6, error: x6Error } = await supabase
      .from('sorteos')
      .select('id')
      .eq('slug', 'bmw-x6')
      .single()

    if (!x6) {
      console.log('[v0] Creating BMW X6 sorteo...')
      const { error: insertError, data: insertData } = await supabase
        .from('sorteos')
        .insert({
          slug: 'bmw-x6',
          nombre: 'BMW X6 2024',
          descripcion: 'Vehiculo deportivo, elegante y potente. Diseñado para destacar.',
          precio_rd: 300,
          precio_usd: 9,
          total_boletos: 99999,
          estado: 'activo',
          metadata: { progreso_manual: 0 },
        })
        .select()

      if (insertError) {
        console.error('[v0] Error creating BMW X6:', insertError)
        return NextResponse.json(
          { error: `Error creating BMW X6: ${insertError.message}` },
          { status: 400 }
        )
      }
      console.log('[v0] BMW X6 created successfully')
    } else {
      console.log('[v0] BMW X6 already exists')
    }

    // Check if BMW X7 exists, if not create it
    const { data: x7, error: x7Error } = await supabase
      .from('sorteos')
      .select('id')
      .eq('slug', 'bmw-x7')
      .single()

    return NextResponse.json(
      { 
        message: 'Sorteos initialized successfully',
        x6_exists: !!x6,
        x7_exists: !!x7,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[v0] Error initializing sorteos:', error)
    return NextResponse.json(
      { error: `Error initializing sorteos: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}
