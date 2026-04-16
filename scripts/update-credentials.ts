import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function updateCredentials() {
  const newPassword = 'bmwx6x7@'
  const hashedPassword = await bcrypt.hash(newPassword, 12)

  console.log('Updating admin credentials...')

  // Update admin user: change username to "adminforturd" and password
  const { error: adminError } = await supabase
    .from('admin_users')
    .update({
      username: 'adminforturd',
      password_hash: hashedPassword,
    })
    .eq('role', 'admin')

  if (adminError) {
    console.error('Error updating admin:', adminError)
  } else {
    console.log('Admin credentials updated: username=adminforturd, password=bmwx6x7@')
  }

  // Update boleto_fisico user: only change password (keep username as boletofisico)
  const { error: boletoError } = await supabase
    .from('admin_users')
    .update({
      password_hash: hashedPassword,
    })
    .eq('role', 'boleto_fisico')

  if (boletoError) {
    console.error('Error updating boleto_fisico:', boletoError)
  } else {
    console.log('Boleto fisico password updated: password=bmwx6x7@')
  }

  console.log('Done!')
}

updateCredentials()
