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

    console.log('[v0] Login attempt for username:', username)

    // Find admin user (case-insensitive search)
    const { data: admin, error: adminError } = await supabase
      .from('admin_users')
      .select('id, username, password_hash, role')
      .ilike('username', username)
      .single()

    console.log('[v0] Admin found:', admin ? { username: admin.username, role: admin.role } : 'not found')
    console.log('[v0] Admin error:', adminError)

    if (adminError || !admin) {
      return NextResponse.json(
        { error: 'Credenciales invalidas' },
        { status: 401 }
      )
    }

    // Verify password - check if hash is bcrypt format, otherwise compare plain text
    let isValid = false
    const isBcryptHash = admin.password_hash && admin.password_hash.startsWith('$2')
    
    if (isBcryptHash) {
      // It's a bcrypt hash, use bcrypt.compare
      try {
        isValid = await bcrypt.compare(password, admin.password_hash)
        console.log('[v0] bcrypt compare result:', isValid)
      } catch (bcryptError) {
        console.log('[v0] bcrypt error:', bcryptError)
        isValid = false
      }
    } else {
      // It's plain text password (legacy), compare directly
      isValid = admin.password_hash === password
      console.log('[v0] Plain text compare result:', isValid)
    }

    if (!isValid) {
      console.log('[v0] Password verification failed')
      return NextResponse.json(
        { error: 'Credenciales invalidas' },
        { status: 401 }
      )
    }

    console.log('[v0] Login successful for:', admin.username)

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
