import { SorteoAdminPanel } from '@/components/sorteo-admin-panel'

export const metadata = {
  title: 'Admin BMW X6 - FortuRD',
  description: 'Panel de administracion del sorteo BMW X6',
}

export default function AdminBMWX6Page() {
  return <SorteoAdminPanel sorteoSlug="bmw-x6" />
}
