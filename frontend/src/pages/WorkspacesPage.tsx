import { useState, useEffect, type FC } from 'react'
import {
  Plus, FolderKanban, ChevronDown, ChevronRight, Trash2, Edit2,
  Zap, Brain, X, AlertCircle, Server, History, Camera, RotateCcw, Bot,
} from 'lucide-react'
import { workspacesApi, skillsApi, memoriesApi, clawsApi } from '../api/client'
import type { Workspace, Skill, Memory, Claw, SkillVersion, WorkspaceSnapshot } from '../api/types'

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

// ── AI badge ──────────────────────────────────────────────────────────────────

const AIBadge: FC = () => (
  <span
    className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-medium shrink-0"
    style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }}
  >
    <Bot className="w-3 h-3" />AI Added
  </span>
)

// ── Skill history panel ───────────────────────────────────────────────────────

const SkillHistoryPanel: FC<{
  skill: Skill
  onClose: () => void
  onRestored: (s: Skill) => void
}> = ({ skill, onClose, onRestored }) => {
  const [versions, setVersions] = useState<SkillVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<number | null>(null)

  useEffect(() => {
    skillsApi.getVersions(skill.id)
      .then(setVersions)
      .finally(() => setLoading(false))
  }, [skill.id])

  const handleRestore = async (vid: number) => {
    setRestoring(vid)
    try {
      const updated = await skillsApi.restoreVersion(skill.id, vid)
      onRestored(updated)
      onClose()
    } finally {
      setRestoring(null)
    }
  }

  return (
    <div className="mt-2 p-3 bg-bg-elevated rounded-xl border border-border-subtle space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-accent-purple" />Version History
        </span>
        <button onClick={onClose} className="btn-ghost p-1"><X className="w-3 h-3" /></button>
      </div>
      {loading ? (
        <p className="text-xs text-text-muted">Loading…</p>
      ) : versions.length === 0 ? (
        <p className="text-xs text-text-muted">No versions saved yet. Edit the skill to create the first version.</p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {versions.map(v => (
            <div key={v.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-bg-primary border border-border-subtle">
              <div className="flex-1 min-w-0">
                <span className="text-xs text-text-secondary">
                  v{v.version_number} — {v.name}
                </span>
                {v.created_at && (
                  <span className="text-xs text-text-muted ml-2">
                    {new Date(v.created_at).toLocaleString()}
                  </span>
                )}
              </div>
              <button
                onClick={() => handleRestore(v.id)}
                disabled={restoring === v.id}
                className="text-xs btn-secondary py-1 px-2 shrink-0 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                {restoring === v.id ? '…' : 'Restore'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Snapshots panel ───────────────────────────────────────────────────────────

const SnapshotsPanel: FC<{
  workspace: Workspace
  onClose: () => void
  onRestored: (w: Workspace) => void
}> = ({ workspace, onClose, onRestored }) => {
  const [snapshots, setSnapshots] = useState<WorkspaceSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [restoring, setRestoring] = useState<number | null>(null)

  useEffect(() => {
    setLoading(true)
    workspacesApi.getSnapshots(workspace.id)
      .then(setSnapshots)
      .finally(() => setLoading(false))
  }, [workspace.id])

  const handleSave = async () => {
    setSaving(true)
    try {
      const snap = await workspacesApi.saveSnapshot(workspace.id)
      setSnapshots(prev => [snap, ...prev])
    } finally {
      setSaving(false)
    }
  }

  const handleRestore = async (sid: number) => {
    setRestoring(sid)
    try {
      const updated = await workspacesApi.restoreSnapshot(workspace.id, sid)
      onRestored(updated)
      onClose()
    } finally {
      setRestoring(null)
    }
  }

  return (
    <div className="mt-3 p-3 bg-bg-elevated rounded-xl border border-border-subtle space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-accent-warning" />Snapshots
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs btn-primary py-1 px-2.5 flex items-center gap-1"
          >
            <Camera className="w-3 h-3" />
            {saving ? 'Saving…' : 'Save Snapshot'}
          </button>
          <button onClick={onClose} className="btn-ghost p-1"><X className="w-3 h-3" /></button>
        </div>
      </div>
      {loading ? (
        <p className="text-xs text-text-muted">Loading…</p>
      ) : snapshots.length === 0 ? (
        <p className="text-xs text-text-muted">No snapshots yet. Click "Save Snapshot" to capture the current workspace config.</p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {snapshots.map(s => (
            <div key={s.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-bg-primary border border-border-subtle">
              <div className="flex-1 min-w-0">
                <span className="text-xs text-text-secondary">v{s.version_number} — {s.name}</span>
                {s.snapshot_at && (
                  <span className="text-xs text-text-muted ml-2">
                    {new Date(s.snapshot_at).toLocaleString()}
                  </span>
                )}
              </div>
              <button
                onClick={() => handleRestore(s.id)}
                disabled={restoring === s.id}
                className="text-xs btn-secondary py-1 px-2 shrink-0 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                {restoring === s.id ? '…' : 'Restore'}
              </button>
            </div>
          ))}
        </div>
      )}
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
  onSkillUpdated: (s: Skill, wsId: number) => void
  onMemoryCreated: (m: Memory, wsId: number) => void
  onMemoryDeleted: (memId: number, wsId: number) => void
  onMemoryUpdated: (m: Memory, wsId: number) => void
  onWorkspaceUpdated: (w: Workspace) => void
}> = ({ workspace, onDelete, onEdit, onSkillCreated, onSkillDeleted, onSkillUpdated, onMemoryCreated, onMemoryDeleted, onMemoryUpdated, onWorkspaceUpdated }) => {
  const [expanded, setExpanded] = useState(false)
  const [showAddSkill, setShowAddSkill] = useState(false)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [showAddMemory, setShowAddMemory] = useState(false)
  const [memoryForm, setMemoryForm] = useState({ content: '', importance: 3, claw_id: null as number | null })
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null)
  const [editMemoryForm, setEditMemoryForm] = useState({ content: '', importance: 3 })
  const [skillHistoryId, setSkillHistoryId] = useState<number | null>(null)
  const [showSnapshots, setShowSnapshots] = useState(false)

  const handleAddSkill = async (form: { name: string; description: string; prompt: string }) => {
    const s = await skillsApi.create({ ...form, workspace_id: workspace.id })
    onSkillCreated(s, workspace.id)
  }

  const handleEditSkill = async (form: { name: string; description: string; prompt: string }) => {
    if (!editingSkill) return
    const s = await skillsApi.update(editingSkill.id, form)
    onSkillUpdated(s, workspace.id)
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

  const startEditMemory = (m: Memory) => {
    setEditingMemory(m)
    setEditMemoryForm({ content: m.content, importance: m.importance })
  }

  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMemory) return
    const updated = await memoriesApi.update(editingMemory.id, editMemoryForm)
    onMemoryUpdated(updated, workspace.id)
    setEditingMemory(null)
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
            <button
              onClick={() => setShowSnapshots(s => !s)}
              className="btn-ghost p-2"
              title="Snapshots"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onEdit(workspace)} className="btn-ghost p-2"><Edit2 className="w-3.5 h-3.5" /></button>
            <button onClick={() => onDelete(workspace.id)} className="btn-danger p-2"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        {workspace.description && (
          <p className="text-sm text-text-secondary mt-3 pl-12">{workspace.description}</p>
        )}
        {showSnapshots && (
          <div className="pl-12 mt-2">
            <SnapshotsPanel
              workspace={workspace}
              onClose={() => setShowSnapshots(false)}
              onRestored={onWorkspaceUpdated}
            />
          </div>
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
                  <div key={s.id} className="p-3 bg-bg-elevated rounded-xl border border-border-subtle">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-text-primary">{s.name}</p>
                          {s.added_by_ai && <AIBadge />}
                        </div>
                        {s.description && <p className="text-xs text-text-muted mt-0.5">{s.description}</p>}
                        <p className="text-xs text-text-muted font-mono mt-1 line-clamp-2">{s.prompt}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setSkillHistoryId(prev => prev === s.id ? null : s.id)}
                          className="btn-ghost p-1.5"
                          title="Version history"
                        >
                          <History className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setEditingSkill(s)}
                          className="btn-ghost p-1.5"
                          title="Edit skill"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await skillsApi.delete(s.id)
                              onSkillDeleted(s.id, workspace.id)
                            } catch (err) {
                              alert(err instanceof Error ? err.message : 'Failed to delete skill')
                            }
                          }}
                          className="btn-danger p-1.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    {skillHistoryId === s.id && (
                      <SkillHistoryPanel
                        skill={s}
                        onClose={() => setSkillHistoryId(null)}
                        onRestored={updated => { onSkillUpdated(updated, workspace.id); setSkillHistoryId(null) }}
                      />
                    )}
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
                  <div key={m.id} className="p-3 bg-bg-elevated rounded-xl border border-border-subtle">
                    {editingMemory?.id === m.id ? (
                      <form onSubmit={handleSaveMemory} className="space-y-2">
                        <textarea
                          className="input resize-none text-sm"
                          rows={2}
                          value={editMemoryForm.content}
                          onChange={e => setEditMemoryForm(p => ({ ...p, content: e.target.value }))}
                          required
                        />
                        <div className="flex items-center gap-3">
                          <label className="text-xs text-text-muted">Importance</label>
                          <input
                            type="range" min={1} max={5}
                            value={editMemoryForm.importance}
                            onChange={e => setEditMemoryForm(p => ({ ...p, importance: Number(e.target.value) }))}
                            className="flex-1"
                          />
                          <span className="text-xs text-accent-warning font-medium w-4">{editMemoryForm.importance}</span>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setEditingMemory(null)} className="btn-secondary text-xs py-1.5 flex-1">Cancel</button>
                          <button type="submit" className="btn-primary text-xs py-1.5 flex-1">Save</button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 flex-wrap">
                            <p className="text-sm text-text-primary flex-1">{m.content}</p>
                            {m.added_by_ai && <AIBadge />}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex items-center gap-0.5">{importanceDots(m.importance)}</div>
                            <span className="text-xs text-text-muted">importance {m.importance}/5</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => startEditMemory(m)}
                            className="btn-ghost p-1.5"
                            title="Edit memory"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await memoriesApi.delete(m.id)
                                onMemoryDeleted(m.id, workspace.id)
                              } catch (err) {
                                alert(err instanceof Error ? err.message : 'Failed to delete memory')
                              }
                            }}
                            className="btn-danger p-1.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
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
      {editingSkill && (
        <SkillModal
          workspaceId={workspace.id}
          title="Edit Skill"
          initial={{ name: editingSkill.name, description: editingSkill.description ?? '', prompt: editingSkill.prompt }}
          onClose={() => setEditingSkill(null)}
          onSave={handleEditSkill}
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
              onSkillUpdated={(s, wsId) => mutate(wsId, w => ({ ...w, skills: w.skills.map(sk => sk.id === s.id ? s : sk) }))}
              onMemoryCreated={(m, wsId) => mutate(wsId, w => ({ ...w, memories: [...w.memories, m] }))}
              onMemoryDeleted={(memId, wsId) => mutate(wsId, w => ({ ...w, memories: w.memories.filter(m => m.id !== memId) }))}
              onMemoryUpdated={(m, wsId) => mutate(wsId, w => ({ ...w, memories: w.memories.map(me => me.id === m.id ? m : me) }))}
              onWorkspaceUpdated={updated => setWorkspaces(prev => prev.map(w => w.id === updated.id ? updated : w))}
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
