import { Navigate, Routes, Route } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { BottomTabBar } from './components/BottomTabBar'
import { TodayPage } from './pages/TodayPage'
import { StatsPage } from './pages/StatsPage'
import { SettingsPage } from './pages/SettingsPage'

export default function TimeApp() {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="relative min-h-[calc(100vh-56px-env(safe-area-inset-top))] pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <Routes>
        <Route index element={<TodayPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Routes>
      <BottomTabBar />
    </div>
  )
}
