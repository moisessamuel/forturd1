import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Define the sorteos that should exist
const REQUIRED_SORTEOS = [
  {
    slug: 'bmw-x6',
    nombre: 'BMW X6 2024',
    descripcion: 'Deportivo, elegante y potente. Diseñado para destacar.',
    precio_rd: 300,
    precio_usd: 9,
    total_boletos: 99999,
    estado: 'activo',
  },
]

/**
 * Ensure all required sorteos exist in the database
 * Creates them if they don't exist, returns success regardless
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const results = []

    for (const sorteoTemplate of REQUIRED_SORTEOS) {
      // Check if sorteo exists
      const { data: existing, error: checkError } = await supabase
        .from('sorteos')
        .select('id, slug')
        .eq('slug', sorteoTemplate.slug)
        .single()

      if (existing) {
        // Already exists
        results.push({
          slug: sorteoTemplate.slug,
          status: 'exists',
          id: existing.id,
        })
        continue
      }

      // Create the sorteo
      const { data: created, error: createError } = await supabase
        .from('sorteos')
        .insert({
          ...sorteoTemplate,
          metadata: {
            progreso_manual: 0,
            boletosVendidos: [],
            created_at: new Date().toISOString(),
          },
        })
        .select('id, slug')
        .single()

      if (createError) {
        console.error(`Error creating sorteo ${sorteoTemplate.slug}:`, createError)
        results.push({
          slug: sorteoTemplate.slug,
          status: 'error',
          error: createError.message,
        })
      } else {
        results.push({
          slug: sorteoTemplate.slug,
          status: 'created',
          id: created?.id,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Sorteos initialization completed',
      results,
    })
  } catch (error) {
    console.error('Error in ensure-sorteos:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to check sorteo status
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const statuses = []

    for (const sorteoTemplate of REQUIRED_SORTEOS) {
      const { data, error } = await supabase
        .from('sorteos')
        .select('id, slug, metadata')
        .eq('slug', sorteoTemplate.slug)
        .single()

      statuses.push({
        slug: sorteoTemplate.slug,
        exists: !!data,
        progress: data?.metadata?.progreso_manual || 0,
      })
    }

    return NextResponse.json({
      sorteos: statuses,
      allExist: statuses.every((s) => s.exists),
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check sorteo status',
    })
  }
}
