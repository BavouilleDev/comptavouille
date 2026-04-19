import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { firebaseReady, firebaseConfigError } from './firebase'
import { AppDataProvider } from './providers/AppDataProvider'
import { useAppData } from './providers/useAppData'
import { AppShell } from './components/AppShell'
import { AuthScreen } from './components/AuthScreen'
import { ConfigMissing } from './components/ConfigMissing'
import { Dashboard } from './components/Dashboard'
import { LoadingScreen } from './components/LoadingScreen'
import { SettingsView } from './components/SettingsView'
import { StatsView } from './components/StatsView'

/**
 * Connexion Google : lance OAuth depuis `/login` pour que le retour OAuth
 * retombe sur la même URL (évite retour sur `/` sans session).
 */
function LoginPage() {
  const { sessionUser, authLoading } = useAppData()
  if (authLoading) return <LoadingScreen />
  if (sessionUser) return <Navigate to="/" replace />
  return <AuthScreen />
}

function RequireAuth() {
  const { sessionUser, authLoading, profile } = useAppData()
  if (authLoading) return <LoadingScreen />
  if (!sessionUser) return <Navigate to="/login" replace />
  if (profile === undefined) return <LoadingScreen />
  return <Outlet />
}

function MainLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const active = pathname.startsWith('/settings')
    ? 'settings'
    : pathname.startsWith('/stats')
      ? 'stats'
      : 'dashboard'

  function onTabChange(id) {
    if (id === 'dashboard') navigate('/', { replace: false })
    else if (id === 'stats') navigate('/stats', { replace: false })
    else navigate('/settings', { replace: false })
  }

  return (
    <AppShell active={active} onChange={onTabChange}>
      <Outlet />
    </AppShell>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="stats" element={<StatsView />} />
          <Route path="settings" element={<SettingsView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default function App() {
  if (!firebaseReady) {
    return <ConfigMissing message={firebaseConfigError} />
  }

  return (
    <AppDataProvider>
      <AppRoutes />
    </AppDataProvider>
  )
}
