import { useState, useEffect, type FC } from 'react'
import { Brain, Save, CheckCircle, AlertCircle, ExternalLink, ServerCog, Info, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { assistantApi, clawsApi } from '../api/client'
import type { AssistantConfig, Claw } from '../api/types'

const SETUP_DONE_KEY = 'clawmanager_setup_seen'

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
      // Mark setup as seen when a claw is appointed
      if (form.claw_id !== '') {
        localStorage.setItem(SETUP_DONE_KEY, '1')
      }
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

  const isFirstSetup = !config?.claw_id

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">Appoint an OpenClaw instance as the Claw AI Assistant</p>
      </div>

      {/* First-time setup guide */}
      {isFirstSetup && (
        <div className="card p-5 border border-accent-purple/40 space-y-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-accent-purple shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-text-primary">Initial Setup Required</h3>
              <p className="text-sm text-text-secondary mt-1">
                ClawManager requires an appointed AI assistant to function fully.
                Follow these steps to get started:
              </p>
            </div>
          </div>
          <ol className="space-y-3 pl-3">
            {[
              {
                step: 1,
                done: claws.length > 0,
                title: 'Add a Claw',
                desc: 'Register your OpenClaw gateway instance (URL + token).',
                action: claws.length === 0 ? (
                  <Link to="/claws" className="inline-flex items-center gap-1 text-accent-purple text-xs font-medium hover:underline">
                    Go to Claws <ArrowRight className="w-3 h-3" />
                  </Link>
                ) : null,
              },
              {
                step: 2,
                done: !!config?.claw_id,
                title: 'Appoint an AI Assistant',
                desc: 'Select one of your registered claws below to act as the AI assistant.',
                action: null,
              },
              {
                step: 3,
                done: saved,
                title: 'Save Settings',
                desc: 'Click "Save Settings" — ClawManager will send the skill prompt to the selected claw.',
                action: null,
              },
            ].map(({ step, done, title, desc, action }) => (
              <li key={step} className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                  done ? 'bg-accent-success/20 text-accent-success' : 'bg-bg-elevated text-text-muted'
                }`}>
                  {done ? '✓' : step}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${done ? 'text-text-muted line-through' : 'text-text-primary'}`}>{title}</p>
                  <p className="text-xs text-text-muted mt-0.5">{desc}</p>
                  {action && <div className="mt-1">{action}</div>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Assistant config */}
      <div className="card p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}>
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-text-primary">Claw AI Assistant</h2>
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
            {/* Network requirement notice */}
            <div className="mt-2 flex items-start gap-2 rounded-xl border border-accent-warning/30 bg-accent-warning/5 px-3 py-2.5">
              <span className="mt-0.5 text-accent-warning shrink-0">⚠️</span>
              <p className="text-xs text-accent-warning leading-relaxed">
                <span className="font-semibold">Network requirement:</span> The Claw AI Assistant works
                only when ClawManager can reach the appointed claw over the network. Deploy ClawManager
                on the <span className="font-semibold">same device or cloud environment</span> as the
                OpenClaw instance, or ensure the claw's URL is reachable from wherever ClawManager is
                hosted. Without network access the assistant falls back to Mock Mode.
              </p>
            </div>
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
