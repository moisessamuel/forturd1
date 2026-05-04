import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Usuario y contrasena requeridos' },
        { status: 400 }
      )
    }

    // Find user by username (case-insensitive)
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('*')
      .ilike('username', username)
      .single()

    if (error || !admin) {
      return NextResponse.json(
        { error: 'Credenciales invalidas' },
        { status: 401 }
      )
    }

    // Check if user has ruleta access
    if (admin.role !== 'ruleta_admin' && admin.role !== 'ruleta' && admin.role !== 'admin') {
      return NextResponse.json(
        { error: 'No tienes acceso a este panel' },
        { status: 403 }
      )
    }

    // Compare password directly (stored as plain text for this user)
    if (admin.password_hash !== password) {
      return NextResponse.json(
        { error: 'Credenciales invalidas' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      username: admin.username,
      role: admin.role,
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    )
  }
}
