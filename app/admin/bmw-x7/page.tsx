import { SorteoAdminPanel } from '@/components/sorteo-admin-panel'

export const metadata = {
  title: 'Admin BMW X7 - FortuRD',
  description: 'Panel de administracion del sorteo BMW X7',
}

export default function AdminBMWX7Page() {
  return <SorteoAdminPanel sorteoSlug="bmw-x7" />
}
