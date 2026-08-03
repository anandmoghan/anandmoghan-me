import { Navigate, Routes, Route } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { BottomTabBar } from './components/BottomTabBar'
import { OverviewPage } from './pages/OverviewPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { AddPage } from './pages/AddPage'
import { VendorsPage } from './pages/VendorsPage'
import { ExpenseSettingsPage } from './pages/SettingsPage'

export default function ExpenseApp() {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="relative min-h-[calc(100vh-56px-env(safe-area-inset-top))] pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <Routes>
        <Route index element={<OverviewPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="add" element={<AddPage />} />
        <Route path="vendors" element={<VendorsPage />} />
        <Route path="settings" element={<ExpenseSettingsPage />} />
      </Routes>
      <BottomTabBar />
    </div>
  )
}
