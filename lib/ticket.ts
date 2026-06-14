import { createClient } from '@/lib/supabase/server'

export async function generateTicketNumbers(count: number): Promise<string[]> {
  const supabase = await createClient()

  // Get config for max range
  const { data: config } = await supabase
    .from('config')
    .select('total_boletos')
    .single()
  const maxRange = config?.total_boletos || 200000
  
  // Get ALL existing ticket numbers from both tables to avoid duplicates
  const [{ data: oldTickets }, { data: newTickets }] = await Promise.all([
    supabase.from('compras').select('numero_boleto'),
    supabase.from('tickets').select('numero_boleto'),
  ])
  
  const usedNumbers = new Set([
    ...(oldTickets?.map(c => c.numero_boleto) || []),
    ...(newTickets?.map(t => t.numero_boleto) || []),
  ])

  // EXCLUSIÓN: Obtener números de boletos físicos para excluirlos de generación aleatoria
  const { data: boletoFisicoGroups } = await supabase
    .from('purchase_groups')
    .select('id')
    .eq('referido_codigo', 'BOLETOFISICO')

  if (boletoFisicoGroups && boletoFisicoGroups.length > 0) {
    const boletoFisicoIds = boletoFisicoGroups.map(g => g.id)
    const { data: boletoFisicoTickets } = await supabase
      .from('tickets')
      .select('numero_boleto')
      .in('purchase_group_id', boletoFisicoIds)

    const boletoFisicoNumbers = boletoFisicoTickets?.map(t => t.numero_boleto) || []
    console.log(`[v0] Excluyendo ${boletoFisicoNumbers.length} números de boletos físicos de generación aleatoria`)
    
    boletoFisicoNumbers.forEach(num => usedNumbers.add(num))
  }

  const generated: string[] = []
  let attempts = 0
  const maxAttempts = count * 100

  while (generated.length < count) {
    const randomNum = Math.floor(Math.random() * maxRange) + 1
    const ticketNumber = randomNum.toString().padStart(5, '0')
    attempts++

    if (attempts > maxAttempts) {
      throw new Error('No se pudo generar números de boleto únicos. Es posible que no haya suficientes boletos disponibles.')
    }

    if (!usedNumbers.has(ticketNumber) && !generated.includes(ticketNumber)) {
      generated.push(ticketNumber)
      usedNumbers.add(ticketNumber)
    }
  }

  return generated
}

// Keep backward compatibility
export async function generateTicketNumber(): Promise<string> {
  const numbers = await generateTicketNumbers(1)
  return numbers[0]
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
