import { useState, useEffect, type FC } from 'react'
import { Search, Plus, BookOpen, X, AlertCircle, Filter } from 'lucide-react'
import { templatesApi, clawsApi } from '../api/client'
import type { Template, Claw } from '../api/types'
import TemplateCard from '../components/TemplateCard'

const CATEGORIES = ['all', 'development', 'creative', 'analytics', 'support', 'research', 'marketing', 'general']

interface CreateTemplateForm {
  name: string
  description: string
  category: string
  prompt_content: string
  tags: string
  author: string
}

const DEFAULT_FORM: CreateTemplateForm = {
  name: '', description: '', category: 'general', prompt_content: '', tags: '', author: '',
}

const CreateTemplateModal: FC<{
  onClose: () => void
  onCreated: (t: Template) => void
}> = ({ onClose, onCreated }) => {
  const [form, setForm] = useState<CreateTemplateForm>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof CreateTemplateForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.prompt_content.trim()) {
      setError('Name and prompt content are required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const t = await templatesApi.create(form)
      onCreated(t)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-card border border-border rounded-2xl shadow-card w-full max-w-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border-subtle sticky top-0 bg-bg-card z-10">
          <h2 className="font-semibold text-text-primary">Create Template</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-accent-danger bg-accent-danger/10 border border-accent-danger/20 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Name *</label>
              <input className="input" value={form.name} onChange={set('name')} placeholder="My Awesome Template" required />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={set('category')}>
                {CATEGORIES.filter(c => c !== 'all').map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" value={form.description} onChange={set('description')} placeholder="What does this template do?" />
          </div>
          <div>
            <label className="label">Prompt Content *</label>
            <textarea
              className="input resize-none font-mono text-sm"
              rows={6}
              value={form.prompt_content}
              onChange={set('prompt_content')}
              placeholder="You are an expert in..."
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tags (comma-separated)</label>
              <input className="input" value={form.tags} onChange={set('tags')} placeholder="ai,coding,analysis" />
            </div>
            <div>
              <label className="label">Author</label>
              <input className="input" value={form.author} onChange={set('author')} placeholder="Your name" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Creating…' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Apply template modal
const ApplyModal: FC<{
  template: Template
  claws: Claw[]
  onClose: () => void
}> = ({ template, claws, onClose }) => {
  const [selectedClaw, setSelectedClaw] = useState<number | null>(null)
  const [applying, setApplying] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const apply = async () => {
    if (!selectedClaw) return
    setApplying(true)
    try {
      const res = await clawsApi.applyTemplate(selectedClaw, template.id)
      setResult(res.simulated ? `Template queued! (Claw unreachable: ${res.message})` : `Successfully applied "${template.name}"!`)
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : 'Failed'}`)
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-card border border-border rounded-2xl shadow-card w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-border-subtle">
          <h2 className="font-semibold text-text-primary">Apply Template</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-bg-elevated rounded-xl p-4 border border-border-subtle">
            <h3 className="font-medium text-text-primary">{template.name}</h3>
            <p className="text-sm text-text-secondary mt-1">{template.description}</p>
          </div>

          {result ? (
            <div className={`text-sm px-4 py-3 rounded-xl border ${
              result.startsWith('Error')
                ? 'bg-accent-danger/10 text-accent-danger border-accent-danger/20'
                : 'bg-accent-success/10 text-accent-success border-accent-success/20'
            }`}>
              {result}
            </div>
          ) : (
            <>
              <div>
                <label className="label">Select Claw</label>
                {claws.length === 0 ? (
                  <p className="text-sm text-text-muted">No claws available. Add a claw first.</p>
                ) : (
                  <div className="space-y-2">
                    {claws.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedClaw(c.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${
                          selectedClaw === c.id
                            ? 'border-accent-purple bg-accent-purple/10'
                            : 'border-border-subtle bg-bg-elevated hover:border-border'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-text-primary">{c.name}</span>
                          <span className={`text-xs ${
                            c.status === 'online' ? 'text-accent-success' :
                            c.status === 'offline' ? 'text-accent-danger' : 'text-text-muted'
                          }`}>{c.status}</span>
                        </div>
                        <span className="text-xs text-text-muted font-mono">{c.url}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                <button
                  onClick={apply}
                  disabled={!selectedClaw || applying}
                  className="btn-primary flex-1"
                >
                  {applying ? 'Applying…' : 'Apply Template'}
                </button>
              </div>
            </>
          )}
          {result && (
            <button onClick={onClose} className="btn-secondary w-full">Close</button>
          )}
        </div>
      </div>
    </div>
  )
}

const TemplatesPage: FC = () => {
  const [templates, setTemplates] = useState<Template[]>([])
  const [claws, setClaws] = useState<Claw[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [applyTarget, setApplyTarget] = useState<Template | null>(null)

  useEffect(() => {
    Promise.all([templatesApi.list(), clawsApi.list()])
      .then(([t, c]) => { setTemplates(t); setClaws(c) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    templatesApi.list(category).then(setTemplates)
  }, [category])

  const filtered = templates.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase()) ||
    t.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Template Marketplace</h1>
          <p className="text-text-secondary mt-1">Discover and apply prompt templates to your claws</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Create Template
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            className="input pl-9"
            placeholder="Search templates…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="w-4 h-4 text-text-muted shrink-0" />
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                category === cat
                  ? 'bg-accent-purple text-white'
                  : 'bg-bg-elevated text-text-secondary hover:text-text-primary border border-border-subtle'
              }`}
            >
              {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="card h-64 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-text-muted opacity-30" />
          <h2 className="text-lg font-semibold text-text-primary mb-2">No templates found</h2>
          <p className="text-text-secondary">Try adjusting your search or create a new template</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(t => (
            <TemplateCard
              key={t.id}
              template={t}
              onApply={tmpl => setApplyTarget(tmpl)}
              onLiked={(id, likes) =>
                setTemplates(prev => prev.map(tmpl => tmpl.id === id ? { ...tmpl, likes } : tmpl))
              }
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateTemplateModal
          onClose={() => setShowCreate(false)}
          onCreated={t => setTemplates(prev => [t, ...prev])}
        />
      )}

      {applyTarget && (
        <ApplyModal
          template={applyTarget}
          claws={claws}
          onClose={() => setApplyTarget(null)}
        />
      )}
    </div>
  )
}

export default TemplatesPage
