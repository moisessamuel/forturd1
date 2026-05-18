/**
 * Normaliza un número de teléfono a formato limpio de 10 dígitos
 * Soporta múltiples formatos:
 * - 8095551234
 * - (809) 555-1234
 * - +1 809-555-1234
 * - +18095551234
 * - 1-809-555-1234
 * 
 * Retorna: "8095551234" o null si no es válido
 */
export function normalizePhone(phone: string): string | null {
  if (!phone || typeof phone !== 'string') return null

  // Eliminar todos los caracteres que no sean dígitos o +
  let cleaned = phone.replace(/[^\d+]/g, '')

  // Remover el + si está al principio
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1)
  }

  // Remover código de país +1 o 1 inicial si existe
  // Si comienza con 1 seguido de exactamente 10 dígitos, remover el 1
  if (cleaned.startsWith('1') && cleaned.length === 11) {
    cleaned = cleaned.substring(1)
  }

  // Validar que queden exactamente 10 dígitos (formato dominicano)
  if (cleaned.length !== 10 || !/^\d{10}$/.test(cleaned)) {
    return null
  }

  return cleaned
}

/**
 * Normaliza múltiples teléfonos para comparación
 * Útil cuando necesitas verificar si un teléfono existe en un array
 */
export function normalizePhones(phones: string[]): (string | null)[] {
  return phones.map(normalizePhone)
}
