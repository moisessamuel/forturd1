import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Verificar autorización básica (header de admin)
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.includes('Bearer')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const supabase = await createClient()

    console.log('[v0] Iniciando migración de boletos físicos a BMW X6...')

    // PASO 1: Obtener todos los boletos BOLETOFISICO
    const { data: boletoFisicoGroups, error: fetchError } = await supabase
      .from('purchase_groups')
      .select('id, sorteo_slug, player_id, referido_codigo')
      .eq('referido_codigo', 'BOLETOFISICO')

    if (fetchError) throw new Error(`Error fetching BOLETOFISICO groups: ${fetchError.message}`)

    console.log(`[v0] Encontrados ${boletoFisicoGroups?.length || 0} grupos de boletos físicos`)

    if (!boletoFisicoGroups || boletoFisicoGroups.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay boletos físicos para migrar',
        migrated: 0,
        conflictsResolved: 0,
      })
    }

    // PASO 2: Obtener todos los números de boletos BOLETOFISICO
    const { data: boletoFisicoNumbers, error: ticketError } = await supabase
      .from('tickets')
      .select('numero_boleto, purchase_group_id')
      .in('purchase_group_id', boletoFisicoGroups.map((g: any) => g.id))

    if (ticketError) throw new Error(`Error fetching ticket numbers: ${ticketError.message}`)

    const boletoFisicoSet = new Set((boletoFisicoNumbers || []).map((t: any) => t.numero_boleto))
    console.log(`[v0] Total de números de boletos físicos: ${boletoFisicoSet.size}`)

    // PASO 3: Obtener números usados en BMW X6
    const x6GroupsQuery = await supabase
      .from('purchase_groups')
      .select('id')
      .eq('sorteo_slug', 'bmw-x6')

    const x6GroupIds = (x6GroupsQuery.data || []).map((g: any) => g.id)

    const { data: x6Numbers, error: x6Error } = await supabase
      .from('tickets')
      .select('numero_boleto, purchase_group_id')
      .in('purchase_group_id', x6GroupIds)

    if (x6Error) throw new Error(`Error fetching X6 numbers: ${x6Error.message}`)

    const x6NumberSet = new Set((x6Numbers || []).map((t: any) => t.numero_boleto))
    console.log(`[v0] Total de números en BMW X6: ${x6NumberSet.size}`)

    // PASO 4: Detectar conflictos
    const conflicts = Array.from(boletoFisicoSet).filter((num: any) => x6NumberSet.has(num))
    console.log(`[v0] Conflictos detectados: ${conflicts.length}`)

    // PASO 5: Resolver conflictos
    const conflictMapping: Record<string, string> = {}

    if (conflicts.length > 0) {
      const { data: config } = await supabase
        .from('config')
        .select('total_boletos')
        .single()
      const maxRange = (config as any)?.total_boletos || 200000

      const allUsedNumbers = new Set([...Array.from(boletoFisicoSet), ...Array.from(x6NumberSet)])
      let replacementCount = 0

      for (let i = 1; i <= maxRange && replacementCount < conflicts.length; i++) {
        const candidate = i.toString().padStart(5, '0')
        if (!allUsedNumbers.has(candidate)) {
          const conflictToReplace = conflicts[replacementCount]
          conflictMapping[conflictToReplace] = candidate
          allUsedNumbers.add(candidate)
          replacementCount++
          console.log(`[v0] Reemplazo: ${conflictToReplace} -> ${candidate}`)
        }
      }

      if (replacementCount < conflicts.length) {
        throw new Error('No hay suficientes números disponibles para resolver conflictos')
      }
    }

    // PASO 6: Actualizar grupos BOLETOFISICO para apuntar a BMW X6
    console.log('[v0] Actualizando grupos de boletos físicos...')
    
    const { error: updateGroupError } = await supabase
      .from('purchase_groups')
      .update({ sorteo_slug: 'bmw-x6' })
      .eq('referido_codigo', 'BOLETOFISICO')

    if (updateGroupError) throw new Error(`Error updating groups: ${updateGroupError.message}`)

    console.log('[v0] Grupos actualizados exitosamente')

    // PASO 7: Si hay conflictos, actualizar números de boletos X6 afectados
    if (Object.keys(conflictMapping).length > 0) {
      console.log(`[v0] Resolviendo ${Object.keys(conflictMapping).length} conflictos de números...`)

      for (const [oldNum, newNum] of Object.entries(conflictMapping)) {
        const { data: ticketToUpdate } = await supabase
          .from('tickets')
          .select('id')
          .eq('numero_boleto', oldNum)
          .in('purchase_group_id', x6GroupIds)
          .single()

        if (ticketToUpdate) {
          const { error: updateTicketError } = await supabase
            .from('tickets')
            .update({ numero_boleto: newNum })
            .eq('id', (ticketToUpdate as any).id)

          if (updateTicketError) throw new Error(`Error updating ticket: ${updateTicketError.message}`)
        }
      }
      console.log('[v0] Conflictos resueltos')
    }

    // PASO 8: Validación final
    console.log('[v0] Validando integridad de migración...')

    const { data: finalCheck } = await supabase
      .from('tickets')
      .select('numero_boleto')
      .in('purchase_group_id', 
        (await supabase.from('purchase_groups').select('id').eq('sorteo_slug', 'bmw-x6')).data?.map((g: any) => g.id) || []
      )

    const finalSet = new Set((finalCheck || []).map((t: any) => t.numero_boleto))
    if (finalSet.size !== (finalCheck?.length || 0)) {
      throw new Error('Error de validación: se detectaron números duplicados después de la migración')
    }

    console.log('[v0] ✓ Migración completada exitosamente')

    return NextResponse.json({
      success: true,
      message: 'Migración de boletos físicos completada',
      migrated: boletoFisicoGroups.length,
      conflictsResolved: Object.keys(conflictMapping).length,
    })
  } catch (error: any) {
    console.error('[v0] Error en migración:', error.message)
    return NextResponse.json(
      { error: error.message || 'Error desconocido' },
      { status: 500 }
    )
  }
}

    const supabase = await createClient()

    console.log('[v0] Iniciando migración de boletos físicos a BMW X6...')

    // PASO 1: Obtener todos los boletos BOLETOFISICO (asumiendo están en sorteo_slug NULL o 'default')
    const { data: boletoFisicoGroups, error: fetchError } = await supabase
      .from('purchase_groups')
      .select('id, sorteo_slug, player_id, referido_codigo')
      .eq('referido_codigo', 'BOLETOFISICO')

    if (fetchError) throw new Error(`Error fetching BOLETOFISICO groups: ${fetchError.message}`)

    console.log(`[v0] Encontrados ${boletoFisicoGroups?.length || 0} grupos de boletos físicos`)

    if (!boletoFisicoGroups || boletoFisicoGroups.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay boletos físicos para migrar',
        migrated: 0,
        conflictsResolved: 0,
      })
    }

    // PASO 2: Obtener todos los números de boletos BOLETOFISICO
    const { data: boletoFisicoNumbers, error: ticketError } = await supabase
      .from('tickets')
      .select('numero_boleto, purchase_group_id')
      .in('purchase_group_id', boletoFisicoGroups.map(g => g.id))

    if (ticketError) throw new Error(`Error fetching ticket numbers: ${ticketError.message}`)

    const boletoFisicoSet = new Set(boletoFisicoNumbers?.map(t => t.numero_boleto) || [])
    console.log(`[v0] Total de números de boletos físicos: ${boletoFisicoSet.size}`)

    // PASO 3: Obtener números usados en BMW X6
    const { data: x6Numbers, error: x6Error } = await supabase
      .from('tickets')
      .select('numero_boleto, purchase_group_id')
      .in('purchase_group_id', 
        (await supabase
          .from('purchase_groups')
          .select('id')
          .eq('sorteo_slug', 'bmw-x6')).data?.map(g => g.id) || []
      )

    if (x6Error) throw new Error(`Error fetching X6 numbers: ${x6Error.message}`)

    const x6NumberSet = new Set(x6Numbers?.map(t => t.numero_boleto) || [])
    console.log(`[v0] Total de números en BMW X6: ${x6NumberSet.size}`)

    // PASO 4: Detectar conflictos (números que existen en ambos)
    const conflicts = Array.from(boletoFisicoSet).filter(num => x6NumberSet.has(num))
    console.log(`[v0] Conflictos detectados: ${conflicts.length}`)

    // PASO 5: Para conflictos, encontrar números disponibles en BMW X6
    const conflictMapping: Record<string, string> = {} // boletoFisico -> nuevoNumero

    if (conflicts.length > 0) {
      // Obtener config para el rango máximo
      const { data: config } = await supabase
        .from('config')
        .select('total_boletos')
        .single()
      const maxRange = config?.total_boletos || 200000

      // Encontrar números disponibles para reemplazos
      const allUsedNumbers = new Set([...boletoFisicoSet, ...x6NumberSet])
      let replacementCount = 0

      for (let i = 1; i <= maxRange && replacementCount < conflicts.length; i++) {
        const candidate = i.toString().padStart(5, '0')
        if (!allUsedNumbers.has(candidate)) {
          const conflictToReplace = conflicts[replacementCount]
          conflictMapping[conflictToReplace] = candidate
          allUsedNumbers.add(candidate)
          replacementCount++
          console.log(`[v0] Reemplazo: ${conflictToReplace} -> ${candidate}`)
        }
      }

      if (replacementCount < conflicts.length) {
        throw new Error('No hay suficientes números disponibles para resolver conflictos')
      }
    }

    // PASO 6: Comenzar transacción - Actualizar grupos de boletos físicos
    console.log('[v0] Iniciando actualización de grupos y boletos...')

    // Actualizar todos los grupos BOLETOFISICO para que apunten a BMW X6
    const { error: updateGroupError } = await supabase
      .from('purchase_groups')
      .update({ sorteo_slug: 'bmw-x6' })
      .eq('referido_codigo', 'BOLETOFISICO')

    if (updateGroupError) throw new Error(`Error updating groups: ${updateGroupError.message}`)

    console.log(`[v0] ${boletoFisicoGroups.length} grupos actualizados a BMW X6`)

    // PASO 7: Para boletos en conflicto, actualizar números en BMW X6
    if (Object.keys(conflictMapping).length > 0) {
      console.log(`[v0] Reemplazando ${Object.keys(conflictMapping).length} boletos del BMW X6...`)

      for (const [oldNum, newNum] of Object.entries(conflictMapping)) {
        // Encontrar boleto en BMW X6 con oldNum
        const { data: ticketToReplace } = await supabase
          .from('tickets')
          .select('id')
          .eq('numero_boleto', oldNum)
          .single()

        if (ticketToReplace?.id) {
          // Reemplazar número en BMW X6
          const { error: updateError } = await supabase
            .from('tickets')
            .update({ numero_boleto: newNum })
            .eq('id', ticketToReplace.id)

          if (updateError) throw new Error(`Error updating ticket: ${updateError.message}`)
        }
      }
    }

    // PASO 8: Validación final - confirmar sin duplicados
    const { data: finalX6Tickets } = await supabase
      .from('tickets')
      .select('numero_boleto')
      .in('purchase_group_id',
        (await supabase
          .from('purchase_groups')
          .select('id')
          .eq('sorteo_slug', 'bmw-x6')).data?.map(g => g.id) || []
      )

    const finalNumbers = finalX6Tickets?.map(t => t.numero_boleto) || []
    const duplicates = finalNumbers.filter((num, idx) => finalNumbers.indexOf(num) !== idx)

    if (duplicates.length > 0) {
      throw new Error(`Validación fallida: se encontraron duplicados: ${duplicates.join(', ')}`)
    }

    console.log(`[v0] ✅ Migración completada exitosamente`)

    return NextResponse.json({
      success: true,
      message: 'Boletos físicos migrados exitosamente a BMW X6',
      migrated: boletoFisicoGroups.length,
      conflictsResolved: Object.keys(conflictMapping).length,
      totalTickets: finalNumbers.length,
    })
  } catch (error) {
    console.error('[v0] Migración fallida:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido en migración',
      },
      { status: 500 }
    )
  }
}
