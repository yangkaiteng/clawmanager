import { useState, useEffect, type FC } from 'react'
import { Brain, Save, CheckCircle, AlertCircle, ExternalLink, ServerCog } from 'lucide-react'
import { assistantApi, clawsApi } from '../api/client'
import type { AssistantConfig, Claw } from '../api/types'

const SettingsPage: FC = () => {
  const [config, setConfig] = useState<AssistantConfig | null>(null)
  const [claws, setClaws] = useState<Claw[]>([])
  const [form, setForm] = useState({ claw_id: '', name: 'Nano Claw' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([assistantApi.getConfig(), clawsApi.list()]).then(([c, cs]) => {
      setConfig(c)
      setClaws(cs)
      setForm({
        claw_id: c.claw_id != null ? String(c.claw_id) : '',
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
        claw_id: form.claw_id !== '' ? Number(form.claw_id) : null,
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

  const statusColor = (status: string | null) => {
    if (status === 'online') return 'text-accent-success'
    if (status === 'offline') return 'text-accent-danger'
    return 'text-text-muted'
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">Appoint an OpenClaw instance as the Nano Claw assistant</p>
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
            <p className="text-sm text-text-secondary">
              Appoint one of your registered claws to power the chat assistant.
              ClawManager will send a system prompt guiding it to act as your platform helper.
            </p>
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
            <label className="label flex items-center gap-1.5">
              <ServerCog className="w-3.5 h-3.5" />
              Appointed Claw
            </label>
            <select className="input" value={form.claw_id} onChange={set('claw_id')}>
              <option value="">— None (Mock Mode) —</option>
              {claws.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.url}) — {c.status}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-muted mt-1">
              The selected claw will receive a ClawManager system prompt and serve as the assistant.
            </p>
          </div>

          {/* Current status */}
          <div className="bg-bg-elevated rounded-xl p-4 border border-border-subtle">
            <h3 className="text-sm font-medium text-text-primary mb-3">Current Status</h3>
            <div className="space-y-2">
              {[
                {
                  label: 'Mode',
                  value: config?.claw_id ? '🟢 Live (Appointed Claw)' : '🟡 Mock Mode',
                },
                {
                  label: 'Appointed Claw',
                  value: config?.claw_name ?? 'None',
                  extra: config?.claw_status
                    ? <span className={`ml-1 ${statusColor(config.claw_status)}`}>({config.claw_status})</span>
                    : null,
                },
              ].map(({ label, value, extra }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-xs text-text-muted">{label}</span>
                  <span className="text-xs text-text-secondary font-mono">
                    {value}{extra}
                  </span>
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
