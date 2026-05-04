import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({
        authenticated: false,
        role: null,
      })
    }

    return NextResponse.json({
      authenticated: true,
      role: session.role || 'admin',
      user: {
        userId: session.userId,
        username: session.username,
        role: session.role || 'admin',
      },
    })
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json(
      { error: 'Error al verificar sesión' },
      { status: 500 }
    )
  }
}
