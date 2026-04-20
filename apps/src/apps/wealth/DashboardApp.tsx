import { Navigate, Routes, Route } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { BottomTabBar } from './components/BottomTabBar'
import { OverviewPage } from './pages/OverviewPage'
import { AssetsPage } from './pages/AssetsPage'
import { Trading212Page } from './pages/Trading212Page'
import { DashboardSettingsPage } from './pages/DashboardSettingsPage'

export default function DashboardApp() {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="relative min-h-[calc(100vh-56px-env(safe-area-inset-top))] pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <Routes>
        <Route index element={<OverviewPage />} />
        <Route path="assets" element={<AssetsPage />} />
        <Route path="trading212" element={<Trading212Page />} />
        <Route path="settings" element={<DashboardSettingsPage />} />
      </Routes>
      <BottomTabBar />
    </div>
  )
}
