import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createClient } from '@/lib/supabase/server'
import { createSession, setSessionCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Usuario y contraseña son requeridos' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Find admin user
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .single()

    if (!admin) {
      return NextResponse.json(
        { error: 'Credenciales invalidas' },
        { status: 401 }
      )
    }

    // Verify password
    let isValid = false
    try {
      isValid = await bcrypt.compare(password, admin.password_hash)
    } catch {
      isValid = false
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Credenciales invalidas' },
        { status: 401 }
      )
    }

    // Create session with role
    const token = await createSession(admin.id, admin.username, admin.role || 'admin')
    await setSessionCookie(token)

    return NextResponse.json({
      success: true,
      user: {
        id: admin.id,
        username: admin.username,
        role: admin.role || 'admin',
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
