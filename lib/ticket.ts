import { createClient } from '@/lib/supabase/server'

export async function generateTicketNumber(): Promise<string> {
  const supabase = await createClient()
  
  // Get all existing ticket numbers to avoid duplicates
  const { data: existing } = await supabase
    .from('compras')
    .select('numero_boleto')
  
  const usedNumbers = new Set(existing?.map(c => c.numero_boleto) || [])
  
  // Generate a random number between 1 and 200000 that hasn't been used
  let ticketNumber: string
  let attempts = 0
  const maxAttempts = 1000
  
  do {
    const randomNum = Math.floor(Math.random() * 200000) + 1
    ticketNumber = randomNum.toString().padStart(6, '0')
    attempts++
    
    if (attempts > maxAttempts) {
      throw new Error('No se pudo generar un numero de boleto unico')
    }
  } while (usedNumbers.has(ticketNumber))
  
  return ticketNumber
}

export function formatTicketDisplay(ticketNumber: string): string {
  // Format: #FT-2026-XXXXXX
  const year = new Date().getFullYear()
  return `#FT-${year}-${ticketNumber.padStart(4, '0')}`
}

export function formatCurrency(amount: number, currency: string = 'DOP'): string {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }
  
  return `RD$ ${new Intl.NumberFormat('es-DO').format(amount)}`
}

export function formatPhone(phone: string): string {
  // Clean the phone number
  const cleaned = phone.replace(/\D/g, '')
  
  // Format as Dominican phone number
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  
  return phone
}
