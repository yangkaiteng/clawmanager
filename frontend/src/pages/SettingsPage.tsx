import { useState, useEffect, type FC } from 'react'
import { Brain, Save, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { assistantApi } from '../api/client'
import type { AssistantConfig } from '../api/types'

const SettingsPage: FC = () => {
  const [config, setConfig] = useState<AssistantConfig | null>(null)
  const [form, setForm] = useState({ url: '', api_key: '', model: 'gpt-4', name: 'Nano Claw' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    assistantApi.getConfig().then(c => {
      setConfig(c)
      setForm({
        url: c.url ?? '',
        api_key: '',
        model: c.model ?? 'gpt-4',
        name: c.name ?? 'Nano Claw',
      })
    })
  }, [])

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const updated = await assistantApi.updateConfig({
        url: form.url || null,
        api_key: form.api_key || undefined,
        model: form.model,
        name: form.name,
      } as Partial<AssistantConfig>)
      setConfig(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">Configure your Nano Claw assistant and global preferences</p>
      </div>

      {/* Assistant config */}
      <div className="card p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}>
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-text-primary">Nano Claw Assistant</h2>
            <p className="text-sm text-text-secondary">Connect to a live OpenClaw instance for the chat panel</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-accent-danger bg-accent-danger/10 border border-accent-danger/20 rounded-xl px-3 py-2">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}
        {saved && (
          <div className="flex items-center gap-2 text-sm text-accent-success bg-accent-success/10 border border-accent-success/20 rounded-xl px-3 py-2">
            <CheckCircle className="w-4 h-4 shrink-0" />Settings saved successfully!
          </div>
        )}

        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Assistant Name</label>
            <input className="input" value={form.name} onChange={set('name')} placeholder="Nano Claw" />
          </div>
          <div>
            <label className="label">OpenClaw URL</label>
            <input
              className="input font-mono"
              value={form.url}
              onChange={set('url')}
              placeholder="http://your-openclaw-instance:8080"
            />
            <p className="text-xs text-text-muted mt-1">
              Leave blank to use mock responses for demo purposes
            </p>
          </div>
          <div>
            <label className="label">API Key</label>
            <input
              className="input font-mono"
              type="password"
              value={form.api_key}
              onChange={set('api_key')}
              placeholder={config?.api_key ? '••••••••• (leave blank to keep current)' : 'sk-…'}
            />
          </div>
          <div>
            <label className="label">Model</label>
            <select className="input" value={form.model} onChange={set('model')}>
              {['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet', 'llama-3', 'mistral-large'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Current status */}
          <div className="bg-bg-elevated rounded-xl p-4 border border-border-subtle">
            <h3 className="text-sm font-medium text-text-primary mb-3">Current Status</h3>
            <div className="space-y-2">
              {[
                { label: 'Mode', value: config?.url ? '🟢 Live Mode' : '🟡 Mock Mode' },
                { label: 'URL', value: config?.url || 'Not configured' },
                { label: 'Model', value: config?.model || 'gpt-4' },
                { label: 'API Key', value: config?.api_key ? '✓ Configured' : 'Not set' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-xs text-text-muted">{label}</span>
                  <span className="text-xs text-text-secondary font-mono">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full">
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </form>
      </div>

      {/* About */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-text-primary">About ClawManager</h2>
        <div className="space-y-3 text-sm text-text-secondary">
          <p>
            ClawManager is an open-source platform for managing multiple OpenClaw AI agent instances.
            It provides health monitoring, template management, workspace organization, and an AI assistant.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Version', value: '1.0.0' },
              { label: 'Backend', value: 'FastAPI + SQLite' },
              { label: 'Frontend', value: 'React 18 + Vite' },
              { label: 'License', value: 'MIT' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-bg-elevated rounded-lg p-3">
                <p className="text-xs text-text-muted">{label}</p>
                <p className="text-sm font-medium text-text-primary mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>
        <a
          href="https://github.com/clawmanager/clawmanager"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary w-full justify-center"
        >
          <ExternalLink className="w-4 h-4" />
          View on GitHub
        </a>
      </div>
    </div>
  )
}

export default SettingsPage
