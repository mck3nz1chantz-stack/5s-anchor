import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { RoleSelectPage } from './pages/RoleSelectPage'
import { HomePage } from './pages/HomePage'
import { RedTagListPage } from './pages/RedTagListPage'
import { RedTagCreatePage } from './pages/RedTagCreatePage'
import { AuditListPage } from './pages/AuditListPage'
import { AuditRunPage } from './pages/AuditRunPage'
import { DashboardPage } from './pages/DashboardPage'
import { ActionsPage } from './pages/ActionsPage'
import { StandardsPage } from './pages/StandardsPage'
import { SettingsPage } from './pages/SettingsPage'
import { useAuthStore } from './store/authStore'
import type { ReactNode } from 'react'

function RequireSession({ children }: { children: ReactNode }) {
  const session = useAuthStore((s) => s.session)
  if (!session) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RoleSelectPage />} />
      <Route
        path="/app"
        element={
          <RequireSession>
            <AppShell />
          </RequireSession>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="tags" element={<RedTagListPage />} />
        <Route path="tags/new" element={<RedTagCreatePage />} />
        <Route path="audits" element={<AuditListPage />} />
        <Route path="audits/run" element={<AuditRunPage />} />
        <Route path="actions" element={<ActionsPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="standards" element={<StandardsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
