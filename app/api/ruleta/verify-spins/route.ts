import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const telefono = searchParams.get('telefono')

    if (!telefono) {
      return NextResponse.json({ error: 'Telefono es requerido' }, { status: 400 })
    }

    // First, check if user has any pending ticket purchases (free spins)
    const { data: purchaseGroups } = await supabase
      .from('purchase_groups')
      .select('id, estado, nombre')
      .eq('telefono', telefono)
      .order('created_at', { ascending: false })

    // Check for pending ticket purchases
    const pendingTicketPurchases = purchaseGroups?.filter(pg => pg.estado === 'pendiente') || []
    const approvedTicketPurchases = purchaseGroups?.filter(pg => pg.estado === 'aprobado') || []

    // Search for confirmed purchases with this phone number (paid spins)
    const { data: jugadas, error } = await supabase
      .from('ruleta_jugadas')
      .select('*')
      .eq('telefono', telefono)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching jugadas:', error)
      return NextResponse.json({ error: 'Error al verificar' }, { status: 500 })
    }

    // If no paid spins found but has pending ticket purchases
    if ((!jugadas || jugadas.length === 0) && pendingTicketPurchases.length > 0 && approvedTicketPurchases.length === 0) {
      return NextResponse.json({ 
        success: false, 
        pending: true,
        error: 'Tu boleto aún no ha sido confirmado. Una vez aprobado podrás usar tu giro gratis.' 
      })
    }

    if (!jugadas || jugadas.length === 0) {
      // Check if user has approved ticket purchases with free spins available
      if (approvedTicketPurchases.length > 0) {
        // User has approved tickets, redirect them to use free spins through verificar
        return NextResponse.json({ 
          success: false, 
          has_free_spins: true,
          error: 'Tienes giros gratis disponibles de tus boletos. Usa la página de verificar boletos para acceder a ellos.' 
        })
      }
      
      return NextResponse.json({ 
        success: false, 
        error: 'No se encontraron compras con este numero de telefono.' 
      }, { status: 404 })
    }

    // Check for pending purchases (not yet confirmed)
    const pendingJugadas = jugadas.filter(j => j.estado === 'pendiente')
    // Include both 'confirmado' and 'jugado' states (jugado means they've used some spins but may have more)
    const activeJugadas = jugadas.filter(j => j.estado === 'confirmado' || j.estado === 'jugado')

    // Count total spins purchased vs spins used
    let totalGirosComprados = 0
    let totalGirosUsados = 0
    let latestActiveJugada = null

    for (const jugada of activeJugadas) {
      // Calculate cantidad_giros from monto if not properly set
      let cantidadGiros = jugada.cantidad_giros
      if (!cantidadGiros || cantidadGiros <= 1) {
        // Calculate based on monto (100 DOP or 2 USD per spin)
        const monto = Number(jugada.monto) || 0
        if (jugada.moneda === 'DOP') {
          cantidadGiros = Math.max(1, Math.floor(monto / 100))
        } else if (jugada.moneda === 'USD') {
          cantidadGiros = Math.max(1, Math.floor(monto / 2))
        } else {
          cantidadGiros = 1
        }
      }
      
      totalGirosComprados += cantidadGiros
      
      // Use the giros_usados field from the database
      const girosUsados = jugada.giros_usados || 0
      totalGirosUsados += girosUsados
      
      // Track the first jugada with available spins
      const disponiblesEnEstaJugada = cantidadGiros - girosUsados
      if (disponiblesEnEstaJugada > 0 && !latestActiveJugada) {
        latestActiveJugada = jugada
      }
    }

    const girosDisponibles = totalGirosComprados - totalGirosUsados

    // If there are only pending purchases and no confirmed/active ones
    if (activeJugadas.length === 0 && pendingJugadas.length > 0) {
      return NextResponse.json({
        success: false,
        pending: true,
        error: 'Tu pago aun no ha sido confirmado. Por favor espera la verificacion.'
      })
    }

    // If no spins available
    if (girosDisponibles <= 0) {
      return NextResponse.json({
        success: false,
        error: 'No tienes giros disponibles. Ya usaste todos tus giros o compra mas para participar.'
      })
    }

    // User has available spins
    return NextResponse.json({
      success: true,
      giros_disponibles: girosDisponibles,
      giros_totales: totalGirosComprados,
      giros_usados: totalGirosUsados,
      jugada_id: latestActiveJugada?.id,
      nombre: latestActiveJugada?.nombre,
      telefono: latestActiveJugada?.telefono,
    })

  } catch (error) {
    console.error('Verify spins error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
