import { useState, useEffect, type FC } from 'react'
import { Plus, Server, X, AlertCircle } from 'lucide-react'
import { clawsApi, templatesApi } from '../api/client'
import type { Claw, Template } from '../api/types'
import ClawCard from '../components/ClawCard'

interface ClawForm {
  name: string
  url: string
  api_key: string
  description: string
  model: string
}

const DEFAULT_FORM: ClawForm = { name: '', url: '', api_key: '', description: '', model: 'gpt-4' }

const ClawModal: FC<{
  initial?: Partial<ClawForm>
  onClose: () => void
  onSave: (data: ClawForm) => Promise<void>
  title: string
}> = ({ initial, onClose, onSave, title }) => {
  const [form, setForm] = useState<ClawForm>({ ...DEFAULT_FORM, ...initial })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof ClawForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.url.trim()) {
      setError('Name and URL are required')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(form)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-card border border-border rounded-2xl shadow-card w-full max-w-lg animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-border-subtle">
          <h2 className="font-semibold text-text-primary">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-accent-danger bg-accent-danger/10 border border-accent-danger/20 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name *</label>
              <input className="input" value={form.name} onChange={set('name')} placeholder="Alpha Claw" required />
            </div>
            <div>
              <label className="label">Model</label>
              <select className="input" value={form.model} onChange={set('model')}>
                {['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet', 'llama-3', 'mistral-large'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">URL *</label>
            <input className="input font-mono" value={form.url} onChange={set('url')} placeholder="http://openclaw:8080" required />
          </div>
          <div>
            <label className="label">API Key</label>
            <input className="input font-mono" type="password" value={form.api_key} onChange={set('api_key')} placeholder="sk-…" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={2} value={form.description} onChange={set('description')} placeholder="What does this claw do?" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : 'Save Claw'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const ClawsPage: FC = () => {
  const [claws, setClaws] = useState<Claw[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingClaw, setEditingClaw] = useState<Claw | null>(null)

  useEffect(() => {
    Promise.all([clawsApi.list(), templatesApi.list()])
      .then(([c, t]) => { setClaws(c); setTemplates(t) })
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async (form: ClawForm) => {
    const claw = await clawsApi.create(form)
    setClaws(prev => [...prev, claw])
  }

  const handleUpdate = async (form: ClawForm) => {
    if (!editingClaw) return
    const claw = await clawsApi.update(editingClaw.id, form)
    setClaws(prev => prev.map(c => c.id === claw.id ? claw : c))
    setEditingClaw(null)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this claw? This will also remove its workspaces and memories.')) return
    await clawsApi.delete(id)
    setClaws(prev => prev.filter(c => c.id !== id))
  }

  const handleUpdated = (updated: Claw) => {
    setClaws(prev => prev.map(c => c.id === updated.id ? updated : c))
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Claws</h1>
          <p className="text-text-secondary mt-1">Manage your OpenClaw AI agent instances</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Claw
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card h-56 animate-pulse" />
          ))}
        </div>
      ) : claws.length === 0 ? (
        <div className="card p-16 text-center">
          <Server className="w-16 h-16 mx-auto mb-4 text-text-muted opacity-30" />
          <h2 className="text-lg font-semibold text-text-primary mb-2">No claws yet</h2>
          <p className="text-text-secondary mb-6">Add your first OpenClaw AI instance to get started</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mx-auto">
            <Plus className="w-4 h-4" />
            Add First Claw
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {claws.map(claw => (
            <ClawCard
              key={claw.id}
              claw={claw}
              templates={templates}
              onEdit={c => setEditingClaw(c)}
              onDelete={handleDelete}
              onUpdated={handleUpdated}
            />
          ))}
        </div>
      )}

      {showModal && (
        <ClawModal
          title="Add New Claw"
          onClose={() => setShowModal(false)}
          onSave={handleCreate}
        />
      )}

      {editingClaw && (
        <ClawModal
          title="Edit Claw"
          initial={{
            name: editingClaw.name,
            url: editingClaw.url,
            api_key: '',
            description: editingClaw.description || '',
            model: editingClaw.model || 'gpt-4',
          }}
          onClose={() => setEditingClaw(null)}
          onSave={handleUpdate}
        />
      )}
    </div>
  )
}

export default ClawsPage
