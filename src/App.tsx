import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from '@/components/ui/Toaster'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { DashboardPage } from '@/pages/Dashboard'
import { InboxPage } from '@/pages/Inbox'
import { AnalystPage } from '@/pages/Analyst'
import { AutomationsPage } from '@/pages/Automations'
import { TasksPage } from '@/pages/Tasks'
import { ActivityLogPage } from '@/pages/ActivityLog'
import { SignInPage } from '@/pages/SignIn'
import { useRelayStore } from '@/store/useRelayStore'

export default function App() {
  const signedIn = useRelayStore((state) => state.signedIn)

  return (
    <ErrorBoundary fallbackTitle="Relay could not start">
      {signedIn ? (
        // HashRouter keeps deep links working on static hosting (GitHub Pages)
        // without any server-side rewrite rules.
        <HashRouter>
          <AppShell>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/inbox" element={<InboxPage />} />
              <Route path="/analyst" element={<AnalystPage />} />
              <Route path="/automations" element={<AutomationsPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/activity" element={<ActivityLogPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
        </HashRouter>
      ) : (
        <SignInPage />
      )}
      <Toaster />
    </ErrorBoundary>
  )
}
