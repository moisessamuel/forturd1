import bcrypt from 'bcryptjs'

async function main() {
  const password = 'Gamundiiw1'
  const hash = await bcrypt.hash(password, 10)
  console.log('Password hash for Gamundiiw1:', hash)
}

main()
