import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ClawsPage from './pages/ClawsPage'
import TemplatesPage from './pages/TemplatesPage'
import WorkspacesPage from './pages/WorkspacesPage'
import SettingsPage from './pages/SettingsPage'
import { assistantApi } from './api/client'

const SETUP_DONE_KEY = 'clawmanager_setup_seen'

function FirstLaunchGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [checked, setChecked] = useState(false)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Skip if user already dismissed the banner or is already on settings
    if (localStorage.getItem(SETUP_DONE_KEY) || location.pathname === '/settings') {
      setChecked(true)
      return
    }
    assistantApi.getConfig().then(config => {
      if (!config.claw_id) {
        setShowBanner(true)
      }
    }).catch(() => {
      // Backend unreachable — don't block the UI
    }).finally(() => setChecked(true))
  }, [location.pathname])

  const goToSettings = () => {
    localStorage.setItem(SETUP_DONE_KEY, '1')
    setShowBanner(false)
    navigate('/settings')
  }

  const dismiss = () => {
    localStorage.setItem(SETUP_DONE_KEY, '1')
    setShowBanner(false)
  }

  if (!checked) return null

  return (
    <>
      {showBanner && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
        >
          <div className="card max-w-lg w-full mx-4 p-8 space-y-6 border border-accent-purple/40 shadow-2xl">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                style={{ filter: 'sepia(1) saturate(4) hue-rotate(5deg) brightness(1.15)' }}
              >
                🦞
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary">Welcome to ClawManager!</h2>
                <p className="text-sm text-text-secondary mt-0.5">Setup required before you can start</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-text-secondary">
              <p>
                ClawManager needs an <span className="text-text-primary font-medium">AI Assistant</span> to
                fully work. The assistant powers the floating chat panel and allows you to manage claws,
                workspaces, skills, and memories using natural language.
              </p>
              <div className="bg-bg-elevated rounded-xl border border-border-subtle p-4 space-y-2">
                <p className="text-text-primary font-semibold text-xs uppercase tracking-wide">To get started:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-text-secondary">
                  <li>
                    Go to <span className="text-accent-purple font-medium">Settings</span> and add at least
                    one Claw instance (your OpenClaw gateway URL + token)
                  </li>
                  <li>
                    Appoint one of your claws as the <span className="text-accent-purple font-medium">AI Assistant</span>
                  </li>
                  <li>
                    Click <span className="text-accent-purple font-medium">Save Settings</span> — ClawManager
                    will prime that claw with the ClawManager system prompt
                  </li>
                </ol>
              </div>
              <p className="text-xs text-accent-warning border border-accent-warning/30 bg-accent-warning/5 rounded-xl px-3 py-2">
                ⚠️ Without an appointed AI assistant, the chat panel runs in <strong>Mock Mode</strong> with
                pre-set responses only. Full functionality requires a live OpenClaw connection.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={dismiss}
                className="btn-secondary flex-1"
              >
                Skip for now
              </button>
              <button
                onClick={goToSettings}
                className="btn-primary flex-1"
              >
                Go to Settings →
              </button>
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  )
}

function App() {
  return (
    <Layout>
      <FirstLaunchGuard>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/claws" element={<ClawsPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/workspaces" element={<WorkspacesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </FirstLaunchGuard>
    </Layout>
  )
}

export default App
