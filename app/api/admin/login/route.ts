import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createClient } from '@/lib/supabase/server'
import { createSession, setSessionCookie } from '@/lib/auth'

const DEFAULT_USERNAME = 'pocoyo'
const DEFAULT_PASSWORD = 'gillette007'

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
    let { data: admin, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .single()

    // If admin doesn't exist and it's the default user, auto-create it
    if ((error || !admin) && username === DEFAULT_USERNAME && password === DEFAULT_PASSWORD) {
      const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10)
      const { data: newAdmin, error: insertError } = await supabase
        .from('admin_users')
        .upsert({ username: DEFAULT_USERNAME, password_hash: hash }, { onConflict: 'username' })
        .select()
        .single()

      if (insertError || !newAdmin) {
        return NextResponse.json(
          { error: 'Credenciales invalidas' },
          { status: 401 }
        )
      }

      admin = newAdmin
    }

    if (!admin) {
      return NextResponse.json(
        { error: 'Credenciales invalidas' },
        { status: 401 }
      )
    }

    // Verify password - if hash is not a valid bcrypt hash, re-hash it
    let isValid = false
    try {
      isValid = await bcrypt.compare(password, admin.password_hash)
    } catch {
      // Invalid hash format, if default credentials match, fix the hash
      if (username === DEFAULT_USERNAME && password === DEFAULT_PASSWORD) {
        const newHash = await bcrypt.hash(DEFAULT_PASSWORD, 10)
        await supabase
          .from('admin_users')
          .update({ password_hash: newHash })
          .eq('id', admin.id)
        isValid = true
      }
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Credenciales invalidas' },
        { status: 401 }
      )
    }

    // Create session
    const token = await createSession(admin.id, admin.username)
    await setSessionCookie(token)

    return NextResponse.json({
      success: true,
      user: {
        id: admin.id,
        username: admin.username,
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
