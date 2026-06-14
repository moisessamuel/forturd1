import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    console.log('[v0] Iniciando migración de 1,000 boletos físicos a BMW X6...')

    const supabase = await createClient()

    // PASO 1: Obtener todos los boletos BOLETOFISICO (grupos)
    const { data: boletoFisicoGroups, error: fetchError } = await supabase
      .from('purchase_groups')
      .select('id, sorteo_slug, referido_codigo')
      .eq('referido_codigo', 'BOLETOFISICO')

    if (fetchError) throw new Error(`Error fetching BOLETOFISICO groups: ${fetchError.message}`)

    console.log(`[v0] Encontrados ${boletoFisicoGroups?.length} grupos de boletos físicos`)

    if (!boletoFisicoGroups || boletoFisicoGroups.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay boletos físicos para migrar',
        migrated: 0,
        conflictsResolved: 0,
        totalTickets: 0,
      })
    }

    // PASO 2: Obtener números de tickets BOLETOFISICO
    const { data: boletoFisicoNumbers, error: ticketError } = await supabase
      .from('tickets')
      .select('numero_boleto')
      .in('purchase_group_id', boletoFisicoGroups.map((g: any) => g.id))

    if (ticketError) throw new Error(`Error fetching BOLETOFISICO numbers: ${ticketError.message}`)

    const boletoFisicoSet = new Set((boletoFisicoNumbers || []).map((t: any) => t.numero_boleto))
    console.log(`[v0] Total de números de boletos físicos: ${boletoFisicoSet.size}`)

    // PASO 3: Obtener números BMW X6
    const { data: x6Groups } = await supabase
      .from('purchase_groups')
      .select('id')
      .eq('sorteo_slug', 'bmw-x6')

    const x6GroupIds = (x6Groups || []).map((g: any) => g.id)

    let x6NumberSet = new Set<string>()
    let x6Tickets = []

    if (x6GroupIds.length > 0) {
      const { data: x6Numbers } = await supabase
        .from('tickets')
        .select('numero_boleto, id')
        .in('purchase_group_id', x6GroupIds)

      x6Tickets = x6Numbers || []
      x6NumberSet = new Set((x6Numbers || []).map((t: any) => t.numero_boleto))
    }

    console.log(`[v0] Total de números en BMW X6: ${x6NumberSet.size}`)

    // PASO 4: Detectar conflictos
    const conflicts = Array.from(boletoFisicoSet).filter((num: any) => x6NumberSet.has(num))
    console.log(`[v0] Conflictos detectados: ${conflicts.length}`)

    // PASO 5: Resolver conflictos - cambiar números en BMW X6
    let conflictsResolved = 0

    if (conflicts.length > 0) {
      const { data: config } = await supabase
        .from('config')
        .select('total_boletos')
        .single()
      const maxRange = (config as any)?.total_boletos || 200000

      const allUsedNumbers = new Set([...Array.from(boletoFisicoSet), ...Array.from(x6NumberSet)])

      for (const conflictNumber of conflicts) {
        // Encontrar ticket X6 con este número
        const ticketToReplace = x6Tickets.find((t: any) => t.numero_boleto === conflictNumber)

        if (ticketToReplace) {
          // Buscar número disponible
          let found = false
          for (let i = 1; i <= maxRange; i++) {
            const candidate = i.toString().padStart(5, '0')
            if (!allUsedNumbers.has(candidate)) {
              // Actualizar ticket X6 con nuevo número
              await supabase
                .from('tickets')
                .update({ numero_boleto: candidate })
                .eq('id', ticketToReplace.id)

              allUsedNumbers.add(candidate)
              allUsedNumbers.delete(conflictNumber)
              conflictsResolved++
              console.log(`[v0] Reemplazo X6: ${conflictNumber} -> ${candidate}`)
              found = true
              break
            }
          }

          if (!found) throw new Error('No hay suficientes números disponibles para resolver conflictos')
        }
      }
    }

    // PASO 6: Actualizar todos los grupos BOLETOFISICO a BMW X6
    console.log('[v0] Actualizando grupos a BMW X6...')
    const { error: updateError } = await supabase
      .from('purchase_groups')
      .update({ sorteo_slug: 'bmw-x6' })
      .eq('referido_codigo', 'BOLETOFISICO')

    if (updateError) throw new Error(`Error updating groups: ${updateError.message}`)

    console.log(`[v0] ✓ ${boletoFisicoGroups.length} grupos actualizados a BMW X6`)

    // PASO 7: Validación final
    const { data: finalX6Groups } = await supabase
      .from('purchase_groups')
      .select('id')
      .eq('sorteo_slug', 'bmw-x6')

    const finalGroupIds = (finalX6Groups || []).map((g: any) => g.id)

    const { data: finalTickets, count: ticketCount } = await supabase
      .from('tickets')
      .select('numero_boleto', { count: 'exact' })
      .in('purchase_group_id', finalGroupIds)

    const finalNumbers = finalTickets?.map((t: any) => t.numero_boleto) || []
    const uniqueNumbers = new Set(finalNumbers)

    if (uniqueNumbers.size !== finalNumbers.length) {
      throw new Error(`Validación fallida: ${finalNumbers.length - uniqueNumbers.size} duplicados detectados`)
    }

    const totalActiveTickets = ticketCount || finalNumbers.length

    console.log(`[v0] ✓ Migración completada sin duplicados`)
    console.log(`[v0] Total en BMW X6: ${totalActiveTickets} boletos activos`)

    return NextResponse.json({
      success: true,
      message: 'Migración de 1,000 boletos físicos completada exitosamente',
      migrated: boletoFisicoGroups.length,
      conflictsResolved,
      totalTickets: totalActiveTickets,
      details: `${boletoFisicoSet.size} boletos físicos ahora son participantes activos en BMW X6. ${conflictsResolved} conflictos resueltos reemplazando números en BMW X6.`,
    })
  } catch (error: any) {
    console.error('[v0] Error en migración:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || JSON.stringify(error),
      },
      { status: 500 }
    )
  }
}
