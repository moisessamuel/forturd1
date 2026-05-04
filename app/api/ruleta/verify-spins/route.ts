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

    // Search for confirmed purchases with this phone number
    const { data: jugadas, error } = await supabase
      .from('ruleta_jugadas')
      .select('*')
      .eq('telefono', telefono)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching jugadas:', error)
      return NextResponse.json({ error: 'Error al verificar' }, { status: 500 })
    }

    if (!jugadas || jugadas.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No se encontraron compras con este numero de telefono.' 
      }, { status: 404 })
    }

    // Check for pending purchases (not yet confirmed)
    const pendingJugadas = jugadas.filter(j => j.estado === 'pendiente')
    const confirmedJugadas = jugadas.filter(j => j.estado === 'confirmado')

    // Count total spins purchased vs spins used
    let totalGirosComprados = 0
    let totalGirosUsados = 0
    let latestConfirmedJugada = null

    for (const jugada of confirmedJugadas) {
      // Each jugada can have multiple spins (cantidad_giros field)
      const cantidadGiros = jugada.cantidad_giros || 1
      totalGirosComprados += cantidadGiros
      
      // Check if spin has been used (has resultado)
      if (jugada.resultado) {
        totalGirosUsados += 1
      }
      
      // Track the latest confirmed jugada for reference
      if (!latestConfirmedJugada) {
        latestConfirmedJugada = jugada
      }
    }

    const girosDisponibles = totalGirosComprados - totalGirosUsados

    // If there are only pending purchases and no confirmed ones
    if (confirmedJugadas.length === 0 && pendingJugadas.length > 0) {
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
      jugada_id: latestConfirmedJugada?.id,
      nombre: latestConfirmedJugada?.nombre,
      telefono: latestConfirmedJugada?.telefono,
    })

  } catch (error) {
    console.error('Verify spins error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
