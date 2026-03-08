import { useState, useEffect, type FC } from 'react'
import {
  Plus, FolderKanban, ChevronDown, ChevronRight, Trash2, Edit2,
  Zap, Brain, X, AlertCircle, Server,
} from 'lucide-react'
import { workspacesApi, skillsApi, memoriesApi, clawsApi } from '../api/client'
import type { Workspace, Skill, Memory, Claw } from '../api/types'

// ── Modal helpers ─────────────────────────────────────────────────────────────

const WorkspaceModal: FC<{
  initial?: { name: string; description: string; claw_id: number | null }
  claws: Claw[]
  title: string
  onClose: () => void
  onSave: (d: { name: string; description: string; claw_id: number | null }) => Promise<void>
}> = ({ initial, claws, title, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    claw_id: initial?.claw_id ?? null as number | null,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    try { await onSave(form); onClose() }
    catch (err) { setError(err instanceof Error ? err.message : 'Save failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-card border border-border rounded-2xl shadow-card w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-border-subtle">
          <h2 className="font-semibold text-text-primary">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-accent-danger bg-accent-danger/10 border border-accent-danger/20 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
          <div>
            <label className="label">Name *</label>
            <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="My Workspace" required />
          </div>
          <div>
            <label className="label">Linked Claw</label>
            <select className="input" value={form.claw_id ?? ''} onChange={e => setForm(p => ({ ...p, claw_id: e.target.value ? Number(e.target.value) : null }))}>
              <option value="">None</option>
              {claws.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Workspace purpose…" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

const SkillModal: FC<{
  workspaceId: number
  initial?: { name: string; description: string; prompt: string }
  title: string
  onClose: () => void
  onSave: (d: { name: string; description: string; prompt: string }) => Promise<void>
}> = ({ title, initial, onClose, onSave }) => {
  const [form, setForm] = useState({ name: initial?.name ?? '', description: initial?.description ?? '', prompt: initial?.prompt ?? '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.prompt.trim()) { setError('Name and prompt are required'); return }
    setSaving(true)
    try { await onSave(form); onClose() }
    catch (err) { setError(err instanceof Error ? err.message : 'Save failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-card border border-border rounded-2xl shadow-card w-full max-w-lg animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-border-subtle">
          <h2 className="font-semibold text-text-primary">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-accent-danger bg-accent-danger/10 border border-accent-danger/20 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
          <div>
            <label className="label">Name *</label>
            <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="My Skill" required />
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What this skill does" />
          </div>
          <div>
            <label className="label">Prompt *</label>
            <textarea className="input resize-none font-mono text-sm" rows={5} value={form.prompt} onChange={e => setForm(p => ({ ...p, prompt: e.target.value }))} placeholder="You are…" required />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Workspace row ─────────────────────────────────────────────────────────────

const WorkspaceRow: FC<{
  workspace: Workspace
  claws: Claw[]
  onDelete: (id: number) => void
  onEdit: (w: Workspace) => void
  onSkillCreated: (s: Skill, wsId: number) => void
  onSkillDeleted: (skillId: number, wsId: number) => void
  onMemoryCreated: (m: Memory, wsId: number) => void
  onMemoryDeleted: (memId: number, wsId: number) => void
}> = ({ workspace, onDelete, onEdit, onSkillCreated, onSkillDeleted, onMemoryCreated, onMemoryDeleted }) => {
  const [expanded, setExpanded] = useState(false)
  const [showAddSkill, setShowAddSkill] = useState(false)
  const [showAddMemory, setShowAddMemory] = useState(false)
  const [memoryForm, setMemoryForm] = useState({ content: '', importance: 3, claw_id: null as number | null })

  const handleAddSkill = async (form: { name: string; description: string; prompt: string }) => {
    const s = await skillsApi.create({ ...form, workspace_id: workspace.id })
    onSkillCreated(s, workspace.id)
  }

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault()
    const m = await memoriesApi.create({
      content: memoryForm.content,
      importance: memoryForm.importance,
      claw_id: memoryForm.claw_id || workspace.claw_id,
      workspace_id: workspace.id,
    })
    onMemoryCreated(m, workspace.id)
    setMemoryForm({ content: '', importance: 3, claw_id: null })
    setShowAddMemory(false)
  }

  const importanceDots = (n: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={`w-1.5 h-1.5 rounded-full ${i < n ? 'bg-accent-warning' : 'bg-bg-elevated'}`} />
    ))

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-3 flex-1 text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-bg-elevated flex items-center justify-center border border-border-subtle">
              <FolderKanban className="w-4.5 h-4.5 text-accent-warning" style={{ width: '18px', height: '18px' }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-text-primary">{workspace.name}</h3>
              <div className="flex items-center gap-3 mt-0.5">
                {workspace.claw_name && (
                  <span className="flex items-center gap-1 text-xs text-text-muted">
                    <Server className="w-3 h-3" />{workspace.claw_name}
                  </span>
                )}
                <span className="text-xs text-text-muted">
                  {workspace.skills.length} skills · {workspace.memories.length} memories
                </span>
              </div>
            </div>
            {expanded
              ? <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
              : <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
            }
          </button>
          <div className="flex items-center gap-1">
            <button onClick={() => onEdit(workspace)} className="btn-ghost p-2"><Edit2 className="w-3.5 h-3.5" /></button>
            <button onClick={() => onDelete(workspace.id)} className="btn-danger p-2"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        {workspace.description && (
          <p className="text-sm text-text-secondary mt-3 pl-12">{workspace.description}</p>
        )}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border-subtle">
          {/* Skills */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent-purple" />
                <h4 className="text-sm font-semibold text-text-primary">Skills ({workspace.skills.length})</h4>
              </div>
              <button onClick={() => setShowAddSkill(true)} className="text-xs btn-secondary py-1 px-2.5">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            {workspace.skills.length === 0 ? (
              <p className="text-xs text-text-muted pl-6">No skills yet</p>
            ) : (
              <div className="space-y-2">
                {workspace.skills.map(s => (
                  <div key={s.id} className="flex items-start justify-between gap-3 p-3 bg-bg-elevated rounded-xl border border-border-subtle">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary">{s.name}</p>
                      {s.description && <p className="text-xs text-text-muted mt-0.5">{s.description}</p>}
                      <p className="text-xs text-text-muted font-mono mt-1 line-clamp-2">{s.prompt}</p>
                    </div>
                    <button
                      onClick={async () => { await skillsApi.delete(s.id); onSkillDeleted(s.id, workspace.id) }}
                      className="btn-danger p-1.5 shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Memories */}
          <div className="p-5 pt-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-accent-cyan" />
                <h4 className="text-sm font-semibold text-text-primary">Memories ({workspace.memories.length})</h4>
              </div>
              <button onClick={() => setShowAddMemory(!showAddMemory)} className="text-xs btn-secondary py-1 px-2.5">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>

            {showAddMemory && (
              <form onSubmit={handleAddMemory} className="p-3 bg-bg-elevated rounded-xl border border-border-subtle space-y-2">
                <textarea
                  className="input resize-none text-sm"
                  rows={2}
                  value={memoryForm.content}
                  onChange={e => setMemoryForm(p => ({ ...p, content: e.target.value }))}
                  placeholder="Memory content…"
                  required
                />
                <div className="flex items-center gap-3">
                  <label className="text-xs text-text-muted">Importance</label>
                  <input
                    type="range" min={1} max={5}
                    value={memoryForm.importance}
                    onChange={e => setMemoryForm(p => ({ ...p, importance: Number(e.target.value) }))}
                    className="flex-1"
                  />
                  <span className="text-xs text-accent-warning font-medium w-4">{memoryForm.importance}</span>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowAddMemory(false)} className="btn-secondary text-xs py-1.5 flex-1">Cancel</button>
                  <button type="submit" className="btn-primary text-xs py-1.5 flex-1">Add Memory</button>
                </div>
              </form>
            )}

            {workspace.memories.length === 0 ? (
              <p className="text-xs text-text-muted pl-6">No memories yet</p>
            ) : (
              <div className="space-y-2">
                {workspace.memories.map(m => (
                  <div key={m.id} className="flex items-start justify-between gap-3 p-3 bg-bg-elevated rounded-xl border border-border-subtle">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary">{m.content}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex items-center gap-0.5">{importanceDots(m.importance)}</div>
                        <span className="text-xs text-text-muted">importance {m.importance}/5</span>
                      </div>
                    </div>
                    <button
                      onClick={async () => { await memoriesApi.delete(m.id); onMemoryDeleted(m.id, workspace.id) }}
                      className="btn-danger p-1.5 shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showAddSkill && (
        <SkillModal
          workspaceId={workspace.id}
          title="Add Skill"
          onClose={() => setShowAddSkill(false)}
          onSave={handleAddSkill}
        />
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const WorkspacesPage: FC = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [claws, setClaws] = useState<Claw[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingWs, setEditingWs] = useState<Workspace | null>(null)

  useEffect(() => {
    Promise.all([workspacesApi.list(), clawsApi.list()])
      .then(([w, c]) => { setWorkspaces(w); setClaws(c) })
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async (form: { name: string; description: string; claw_id: number | null }) => {
    const w = await workspacesApi.create(form)
    setWorkspaces(prev => [...prev, w])
  }

  const handleEdit = async (form: { name: string; description: string; claw_id: number | null }) => {
    if (!editingWs) return
    const w = await workspacesApi.update(editingWs.id, form)
    setWorkspaces(prev => prev.map(ws => ws.id === w.id ? w : ws))
    setEditingWs(null)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete workspace? All skills and memories will be removed.')) return
    await workspacesApi.delete(id)
    setWorkspaces(prev => prev.filter(w => w.id !== id))
  }

  const mutate = (wsId: number, fn: (ws: Workspace) => Workspace) =>
    setWorkspaces(prev => prev.map(w => w.id === wsId ? fn(w) : w))

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Workspaces</h1>
          <p className="text-text-secondary mt-1">Organize skills and memories for each task context</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          New Workspace
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="card h-24 animate-pulse" />)}
        </div>
      ) : workspaces.length === 0 ? (
        <div className="card p-16 text-center">
          <FolderKanban className="w-16 h-16 mx-auto mb-4 text-text-muted opacity-30" />
          <h2 className="text-lg font-semibold text-text-primary mb-2">No workspaces yet</h2>
          <p className="text-text-secondary mb-6">Create a workspace to organize skills and memories</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mx-auto">
            <Plus className="w-4 h-4" />Create Workspace
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {workspaces.map(ws => (
            <WorkspaceRow
              key={ws.id}
              workspace={ws}
              claws={claws}
              onDelete={handleDelete}
              onEdit={w => setEditingWs(w)}
              onSkillCreated={(s, wsId) => mutate(wsId, w => ({ ...w, skills: [...w.skills, s] }))}
              onSkillDeleted={(skillId, wsId) => mutate(wsId, w => ({ ...w, skills: w.skills.filter(s => s.id !== skillId) }))}
              onMemoryCreated={(m, wsId) => mutate(wsId, w => ({ ...w, memories: [...w.memories, m] }))}
              onMemoryDeleted={(memId, wsId) => mutate(wsId, w => ({ ...w, memories: w.memories.filter(m => m.id !== memId) }))}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <WorkspaceModal
          claws={claws}
          title="New Workspace"
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
        />
      )}
      {editingWs && (
        <WorkspaceModal
          claws={claws}
          title="Edit Workspace"
          initial={{ name: editingWs.name, description: editingWs.description ?? '', claw_id: editingWs.claw_id }}
          onClose={() => setEditingWs(null)}
          onSave={handleEdit}
        />
      )}
    </div>
  )
}

export default WorkspacesPage
