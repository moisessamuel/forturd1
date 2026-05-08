'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

const BMWX6Images = [
  '/images/bmw-x6-front.jpg',
  '/images/bmw-x6-angle.jpg',
  '/images/bmw-x6-lateral.jpg',
]

export default function BMWX6Page() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // ─── ROTACION AUTOMATICA DE IMAGENES ────────────────────────────────────
  // Rota automáticamente entre las 3 imágenes cada 3 segundos
  // ────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const imageRotationInterval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % BMWX6Images.length)
    }, 3000) // Cambia cada 3 segundos

    return () => clearInterval(imageRotationInterval)
  }, [])

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-black/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300">
            <span>←</span>
            <span>Volver</span>
          </Link>
        </div>
      </header>

      {/* Hero Section con Carrusel */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Carrusel de Imágenes */}
          <div className="relative">
            <div className="relative aspect-video overflow-hidden rounded-lg border border-gray-800 bg-gray-900">
              <Image
                src={BMWX6Images[currentImageIndex]}
                alt={`BMW X6 - Imagen ${currentImageIndex + 1}`}
                fill
                className="object-cover transition-opacity duration-1000"
                priority
              />
            </div>
            {/* Indicadores */}
            <div className="mt-4 flex justify-center gap-2">
              {BMWX6Images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`h-2 w-2 rounded-full transition-all ${
                    index === currentImageIndex ? 'w-8 bg-yellow-400' : 'bg-gray-600'
                  }`}
                  aria-label={`Ver imagen ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Contenido */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="mb-2 inline-block bg-yellow-400/20 px-3 py-1 rounded-full text-sm font-semibold text-yellow-400">
                EN CURSO
              </div>
              <h1 className="mb-4 text-4xl font-bold text-yellow-400">BMW X6</h1>
              <p className="mb-2 text-gray-400">📍 Santo Domingo, Distrito Nacional</p>
              <p className="mb-6 leading-relaxed text-gray-300">
                Gran sorteo BMW X6. Un vehículo de lujo que combina potencia, diseño deportivo y tecnología avanzada. Equipado con acabados premium, alto rendimiento y una experiencia de conduccion superior.
              </p>
            </div>

            {/* Precios */}
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">PRECIO (DOP)</p>
                <p className="text-2xl font-bold text-yellow-400">RD$ 490</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">PRECIO (USD)</p>
                <p className="text-2xl font-bold text-yellow-400">US$ 9</p>
              </div>
            </div>

            {/* Progreso */}
            <div className="mb-6">
              <div className="mb-2 flex justify-between">
                <span className="text-sm font-semibold">PROGRESO DE VENTA</span>
                <span className="text-sm font-bold text-yellow-400">2.00%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-800">
                <div className="h-full w-[2%] rounded-full bg-yellow-400 transition-all" />
              </div>
            </div>

            {/* Seguridad */}
            <div className="mb-6 flex items-center gap-2 text-sm text-gray-400">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Compra segura garantizada por FortuRD.
            </div>

            {/* CTA Button */}
            <Link
              href={`/sorteo/bmw-x6?buy=true`}
              className="block w-full rounded-lg border-2 border-yellow-400 bg-yellow-400 px-6 py-3 text-center font-bold text-black transition-all hover:bg-yellow-500"
            >
              COMPRA TUS BOLETOS
            </Link>
          </div>
        </div>
      </section>

      {/* Características */}
      <section className="border-t border-gray-800 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-8 text-center text-2xl font-bold">POTENCIA - LUJO - EXCLUSIVIDAD</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6">
              <h3 className="mb-2 font-bold text-yellow-400">Diseño Premium</h3>
              <p className="text-sm text-gray-400">Líneas aerodinámicas y acabados de lujo</p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6">
              <h3 className="mb-2 font-bold text-yellow-400">Tecnología Avanzada</h3>
              <p className="text-sm text-gray-400">Sistemas inteligentes y conectividad total</p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6">
              <h3 className="mb-2 font-bold text-yellow-400">Rendimiento Superior</h3>
              <p className="text-sm text-gray-400">Motor potente y manejo deportivo</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
