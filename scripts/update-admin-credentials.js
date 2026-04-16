import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function updateCredentials() {
  const newPassword = 'bmwx6x7@'
  const hashedPassword = await bcrypt.hash(newPassword, 10)
  
  console.log('Updating pocoyo user password...')
  
  // Update pocoyo user password
  const { error: pocoyoError } = await supabase
    .from('admin_users')
    .update({ password_hash: hashedPassword })
    .eq('username', 'pocoyo')
  
  if (pocoyoError) {
    console.error('Error updating pocoyo:', pocoyoError)
  } else {
    console.log('Pocoyo credentials updated successfully!')
    console.log('  Username: pocoyo')
    console.log('  Password: bmwx6x7@')
  }
}

updateCredentials()
