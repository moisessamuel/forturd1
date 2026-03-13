import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const newPassword = 'gillette007'

async function updatePassword() {
  try {
    const hash = await bcrypt.hash(newPassword, 10)
    console.log('New hash generated for gillette007')

    const { data, error } = await supabase
      .from('admin_users')
      .update({ password_hash: hash })
      .eq('username', 'admin')
      .select()

    if (error) {
      console.error('DB error:', error.message)
      return
    }

    if (data && data.length > 0) {
      console.log('Admin password updated successfully!')
    } else {
      console.log('No admin user found with username "admin". Inserting...')
      const { error: insertError } = await supabase
        .from('admin_users')
        .insert({ username: 'admin', password_hash: hash })

      if (insertError) {
        console.error('Insert error:', insertError.message)
      } else {
        console.log('Admin user created with new password!')
      }
    }
  } catch (err) {
    console.error('Error:', err.message)
  }
}

updatePassword()
