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
  
  console.log('Updating admin user...')
  
  // Update admin user: change username to 'adminforturd' and password
  const { error: adminError } = await supabase
    .from('admin_users')
    .update({ 
      username: 'adminforturd',
      password_hash: hashedPassword 
    })
    .eq('role', 'admin')
  
  if (adminError) {
    console.error('Error updating admin:', adminError)
  } else {
    console.log('Admin credentials updated successfully!')
    console.log('  Username: adminforturd')
    console.log('  Password: bmwx6x7@')
  }
  
  console.log('\nUpdating boletofisico user...')
  
  // Update boletofisico user: only change password (keep username as 'boletofisico')
  const { error: boletoError } = await supabase
    .from('admin_users')
    .update({ password_hash: hashedPassword })
    .eq('role', 'boleto_fisico')
  
  if (boletoError) {
    console.error('Error updating boletofisico:', boletoError)
  } else {
    console.log('Boletofisico credentials updated successfully!')
    console.log('  Username: boletofisico')
    console.log('  Password: bmwx6x7@')
  }
}

updateCredentials()
