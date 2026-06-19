import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Actualizar primer premio: "1 Boleto BMW X6"
    const { error: error1 } = await supabase
      .from('ruleta_premios')
      .update({ 
        nombre: 'Ganaste 1 Boleto BMW X6',
        descripcion: '1 Boleto BMW X6'
      })
      .eq('id', 1) // Ajusta el ID según tu DB

    // Actualizar segundo premio: "2 Boletos BMW X6"
    const { error: error2 } = await supabase
      .from('ruleta_premios')
      .update({ 
        nombre: 'Ganaste 2 Boletos BMW X6',
        descripcion: '2 Boletos BMW X6'
      })
      .eq('id', 2) // Ajusta el ID según tu DB

    if (error1 || error2) {
      console.error('Error updating prizes:', error1 || error2)
      return NextResponse.json({ 
        error: 'Error updating prizes',
        details: error1?.message || error2?.message
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Premios actualizados correctamente'
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
