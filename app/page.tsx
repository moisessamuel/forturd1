import { Header } from '@/components/header'
import { SorteosDisponibles } from '@/components/sorteos-disponibles'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-7xl px-4 pt-8">
        <SorteosDisponibles />
      </div>
    </main>
  )
}
