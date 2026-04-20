import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { ThemeProvider, useTheme } from './components/ThemeProvider'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Spinner } from './components/Spinner'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { SettingsPage } from './pages/SettingsPage'
import { db } from './firebase'
import type { AppDefinition } from './types'

const DashboardApp = lazy(() => import('./apps/wealth/DashboardApp'))
const TimeApp = lazy(() => import('./apps/time/TimeApp'))

const apps: AppDefinition[] = [
  {
    id: 'dashboard',
    name: 'Wealth',
    description: 'Track assets, investments, and net worth. Real estate, crypto, stocks, and your Trading 212 ISA.',
    icon: '📊',
    path: '/wealth',
    requiresAuth: true,
  },
  {
    id: 'time',
    name: 'Time',
    description: 'Chess-clock time tracker with dynamic categories, budgets, and live stats.',
    icon: '⏱️',
    path: '/time',
    requiresAuth: true,
  },
]

function ThemeSync() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const [firestoreLoaded, setFirestoreLoaded] = useState(false)

  useEffect(() => {
    if (!user) {
      setFirestoreLoaded(false)
      return
    }
    setFirestoreLoaded(false)
    getDoc(doc(db, 'users', user.uid, 'prefs', 'p')).then(snap => {
      if (snap.exists() && snap.data().th) {
        setTheme(snap.data().th)
      }
      setFirestoreLoaded(true)
    })
  }, [user?.uid])

  useEffect(() => {
    if (!user || !firestoreLoaded) return
    setDoc(doc(db, 'users', user.uid, 'prefs', 'p'), { th: theme }, { merge: true })
  }, [theme, user?.uid, firestoreLoaded])

  return null
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <ThemeSync />
          <Layout apps={apps}>
            <Suspense fallback={<Spinner text="Loading" />}>
              <Routes>
                <Route path="/" element={<HomePage apps={apps} />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                } />
                <Route path="/wealth/*" element={
                  <ProtectedRoute>
                    <DashboardApp />
                  </ProtectedRoute>
                } />
                <Route path="/time/*" element={
                  <ProtectedRoute>
                    <TimeApp />
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
