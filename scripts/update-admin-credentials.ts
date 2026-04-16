import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function updateCredentials() {
  const newPassword = 'bmwx6x7@'
  const hashedPassword = await bcrypt.hash(newPassword, 10)
  
  console.log('Generated hash for password:', hashedPassword)
  
  // Update admin user: change username to "adminforturd" and password
  const { error: adminError } = await supabase
    .from('admin_users')
    .update({ 
      username: 'adminforturd',
      password_hash: hashedPassword 
    })
    .eq('username', 'admin')
  
  if (adminError) {
    console.error('Error updating admin:', adminError)
  } else {
    console.log('Admin user updated: username changed to "adminforturd" with new password')
  }
  
  // Update boletofisico user: only change password
  const { error: boletoError } = await supabase
    .from('admin_users')
    .update({ 
      password_hash: hashedPassword 
    })
    .eq('username', 'boletofisico')
  
  if (boletoError) {
    console.error('Error updating boletofisico:', boletoError)
  } else {
    console.log('Boletofisico user updated: password changed')
  }
  
  console.log('\n=== CREDENTIALS UPDATED ===')
  console.log('Admin Panel:')
  console.log('  Username: adminforturd')
  console.log('  Password: bmwx6x7@')
  console.log('\nBoleto Fisico Panel:')
  console.log('  Username: boletofisico')
  console.log('  Password: bmwx6x7@')
}

updateCredentials()
