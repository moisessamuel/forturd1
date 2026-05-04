import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'
import { createSession, setSessionCookie } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Usuario y contrasena son requeridos' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Find admin user (case-insensitive search)
    const { data: admin, error: adminError } = await supabase
      .from('admin_users')
      .select('id, username, password_hash, role')
      .ilike('username', username)
      .single()

    if (adminError || !admin) {
      return NextResponse.json(
        { error: 'Credenciales invalidas' },
        { status: 401 }
      )
    }

    // Verify password - try bcrypt first, then plain text for legacy
    let isValid = false
    try {
      isValid = await bcrypt.compare(password, admin.password_hash)
    } catch {
      // If bcrypt fails, try direct comparison for legacy plain-text passwords
      isValid = admin.password_hash === password
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Credenciales invalidas' },
        { status: 401 }
      )
    }

    // Create session with role
    try {
      const token = await createSession(admin.id, admin.username, admin.role || 'admin')
      await setSessionCookie(token)
    } catch (sessionError) {
      console.error('Session creation error:', sessionError)
      // Continue without cookie session - will use sessionStorage
    }

    return NextResponse.json({
      success: true,
      user: {
        id: admin.id,
        username: admin.username,
        role: admin.role || 'admin',
      },
    })
  } catch (error) {
    console.error('Unified login error:', error)
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    )
  }
}
