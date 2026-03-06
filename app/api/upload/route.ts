import { put } from '@vercel/blob'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No se proporciono archivo' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Solo PNG, JPG, JPEG, WEBP, PDF' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'El archivo excede el tamano maximo de 10MB' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const ext = file.name.split('.').pop() || 'jpg'
    const filename = `comprobantes/${timestamp}.${ext}`

    // Upload to Vercel Blob (private store)
    const blob = await put(filename, file, {
      access: 'private',
    })

    // Return the pathname for private blob access (use /api/file?pathname=... to serve)
    return NextResponse.json({ 
      url: `/api/file?pathname=${encodeURIComponent(blob.pathname)}`,
      pathname: blob.pathname 
    })
  } catch (error) {
    console.error('Upload error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: `Error al subir archivo: ${errorMessage}` }, { status: 500 })
  }
}
