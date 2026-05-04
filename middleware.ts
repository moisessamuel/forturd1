import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const MAINTENANCE_MODE = false

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir acceso a la página de mantenimiento, admin y archivos internos
  if (
    pathname.startsWith('/mantenimiento') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.') // permite imágenes, favicon, etc.
  ) {
    return NextResponse.next()
  }

  // Redirigir TODO al mantenimiento
  if (MAINTENANCE_MODE) {
    return NextResponse.redirect(new URL('/mantenimiento', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/:path*',
}
