// Re-initialize admin password via the init endpoint
const BASE_URL = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'

async function reinit() {
  try {
    const res = await fetch(`${BASE_URL}/api/admin/init`)
    const data = await res.json()
    console.log('Result:', JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Error:', error.message)
  }
}

reinit()
