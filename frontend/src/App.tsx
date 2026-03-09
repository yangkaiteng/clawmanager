import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ClawsPage from './pages/ClawsPage'
import TemplatesPage from './pages/TemplatesPage'
import WorkspacesPage from './pages/WorkspacesPage'
import SettingsPage from './pages/SettingsPage'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/claws" element={<ClawsPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/workspaces" element={<WorkspacesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Layout>
  )
}

export default App
