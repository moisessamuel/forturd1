import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, newPassword, adminKey } = body

    // Security check: require admin key for this sensitive operation
    const expectedKey = process.env.ADMIN_CHANGE_PASSWORD_KEY || 'admin-change-key'
    
    if (adminKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid admin key' },
        { status: 401 }
      )
    }

    if (!username || !newPassword) {
      return NextResponse.json(
        { error: 'username and newPassword are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Hash the new password
    const hash = await bcrypt.hash(newPassword, 10)

    // Update the admin user
    const { data, error } = await supabase
      .from('admin_users')
      .update({ password_hash: hash })
      .eq('username', username)
      .select()

    if (error) {
      console.error('Error updating password:', error)
      return NextResponse.json(
        { error: 'Error updating password', details: error.message },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
      username: username,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error in change password endpoint:', error)
    return NextResponse.json(
      { error: 'Server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
