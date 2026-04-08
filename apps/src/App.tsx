import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './components/ThemeProvider'
import { AuthProvider } from './hooks/useAuth'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { SettingsPage } from './pages/SettingsPage'
import type { AppDefinition } from './types'

const DashboardApp = lazy(() => import('./apps/dashboard/DashboardApp'))

const apps: AppDefinition[] = [
  {
    id: 'dashboard',
    name: 'Wealth Dashboard',
    description: 'Track your Trading212 investments. Create groups to share portfolios with friends and family.',
    icon: '📊',
    path: '/dashboard',
    requiresAuth: true,
  },
]

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <svg className="w-8 h-8 animate-spin text-muted" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Layout apps={apps}>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/" element={<HomePage apps={apps} />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/*" element={
                  <ProtectedRoute>
                    <DashboardApp />
                  </ProtectedRoute>
                } />
              </Routes>
            </Suspense>
          </Layout>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
