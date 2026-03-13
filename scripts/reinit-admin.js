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

    // Update ALL admin users to new password
    const { data, error } = await supabase
      .from('admin_users')
      .update({ password_hash: hash })
      .eq('username', 'pocoyo')
      .select()

    if (error) {
      console.error('DB error:', error.message)
      return
    }

    if (data && data.length > 0) {
      console.log(`Updated ${data.length} admin user(s) with username "pocoyo" to new password gillette007`)
    } else {
      console.log('No admin user found with username "pocoyo".')
      
      // List all admin users for debugging
      const { data: allAdmins } = await supabase.from('admin_users').select('id, username')
      console.log('All admin users:', JSON.stringify(allAdmins))
    }
  } catch (err) {
    console.error('Error:', err.message)
  }
}

updatePassword()
