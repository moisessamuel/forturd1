import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const { username, password, sorteo } = await request.json()

    if (!username || !password || !sorteo) {
      return NextResponse.json(
        { error: 'Usuario, contraseña y sorteo son requeridos' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check for BMW-specific users first
    const { data: admin, error: adminError } = await supabase
      .from('admin_users')
      .select('id, username, password_hash, role')
      .eq('username', username.toUpperCase())
      .single()

    if (adminError || !admin) {
      console.log('[v0] User not found:', username)
      return NextResponse.json(
        { error: 'Credenciales invalidas' },
        { status: 401 }
      )
    }

    // Check if user has access to this sorteo
    const expectedRole = `sorteo_${sorteo}`
    const hasAccess = admin.role === 'admin' || admin.role === expectedRole

    if (!hasAccess) {
      console.log('[v0] User does not have access to sorteo:', sorteo, 'role:', admin.role)
      return NextResponse.json(
        { error: 'No tienes acceso a este panel' },
        { status: 403 }
      )
    }

    // Verify password using bcrypt
    let isValid = false
    try {
      isValid = await bcrypt.compare(password, admin.password_hash)
      console.log('[v0] Password valid:', isValid)
    } catch (e) {
      console.error('[v0] Bcrypt compare error:', e)
      // If bcrypt fails (invalid hash), try direct comparison for legacy passwords
      isValid = admin.password_hash === password
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Credenciales invalidas' },
        { status: 401 }
      )
    }

    // Return success with user info
    return NextResponse.json({
      success: true,
      user: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        sorteo: sorteo
      }
    })
  } catch (error) {
    console.error('[v0] BMW login error:', error)
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    )
  }
}
