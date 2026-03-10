import { useState, useEffect, type FC } from 'react'
import { Activity, Edit2, Trash2, Server, Settings, History, RotateCcw, X, Camera, RefreshCw, Clock, ChevronDown, ChevronRight, CheckCircle2, XCircle } from 'lucide-react'
import type { Claw, Template, ClawConfigVersion, ClawMaintenance, ClawMaintenanceLog } from '../api/types'
import StatusBadge from './StatusBadge'
import { clawsApi } from '../api/client'

interface ClawCardProps {
  claw: Claw
  templates: Template[]
  onEdit: (claw: Claw) => void
  onDelete: (id: number) => void
  onUpdated: (claw: Claw) => void
}

// ── Config versions panel ─────────────────────────────────────────────────────

const ConfigVersionsPanel: FC<{
  claw: Claw
  onClose: () => void
  onRestored: (c: Claw) => void
}> = ({ claw, onClose, onRestored }) => {
  const [versions, setVersions] = useState<ClawConfigVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [restoring, setRestoring] = useState<number | null>(null)

  useEffect(() => {
    clawsApi.listConfigVersions(claw.id)
      .then(setVersions)
      .finally(() => setLoading(false))
  }, [claw.id])

  const handleSave = async () => {
    setSaving(true)
    try {
      const cv = await clawsApi.saveConfigVersion(claw.id)
      setVersions(prev => [cv, ...prev])
    } finally {
      setSaving(false)
    }
  }

  const handleRestore = async (vid: number) => {
    setRestoring(vid)
    try {
      const updated = await clawsApi.restoreConfigVersion(claw.id, vid)
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
          <History className="w-3.5 h-3.5 text-accent-purple" />Config Versions
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs btn-primary py-1 px-2.5 flex items-center gap-1"
          >
            <Camera className="w-3 h-3" />
            {saving ? 'Saving…' : 'Save Version'}
          </button>
          <button onClick={onClose} className="btn-ghost p-1"><X className="w-3 h-3" /></button>
        </div>
      </div>
      {loading ? (
        <p className="text-xs text-text-muted">Loading…</p>
      ) : versions.length === 0 ? (
        <p className="text-xs text-text-muted">No versions saved yet. Click "Save Version" to snapshot the current config.</p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {versions.map(v => (
            <div key={v.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-bg-primary border border-border-subtle">
              <div className="flex-1 min-w-0">
                <span className="text-xs text-text-secondary">
                  v{v.version_number} — {v.name}
                </span>
                <span className="text-xs text-text-muted font-mono ml-2 truncate">{v.url}</span>
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
                {restoring === v.id ? '…' : 'Apply'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Maintenance panel ─────────────────────────────────────────────────────────

const MaintenancePanel: FC<{ claw: Claw; onClose: () => void }> = ({ claw, onClose }) => {
  const [settings, setSettings] = useState<ClawMaintenance | null>(null)
  const [logs, setLogs] = useState<ClawMaintenanceLog[]>([])
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [running, setRunning] = useState(false)
  const [showLogs, setShowLogs] = useState(false)

  useEffect(() => {
    clawsApi.getMaintenance(claw.id)
      .then(setSettings)
      .finally(() => setLoadingSettings(false))
    clawsApi.listMaintenanceLogs(claw.id)
      .then(setLogs)
      .finally(() => setLoadingLogs(false))
  }, [claw.id])

  const updateMode = async (mode: 'auto' | 'manual') => {
    if (!settings) return
    const updated = await clawsApi.updateMaintenance(claw.id, { mode })
    setSettings(updated)
  }

  const updateSchedule = async (schedule: 'daily' | 'weekly' | 'monthly') => {
    if (!settings) return
    const updated = await clawsApi.updateMaintenance(claw.id, { schedule })
    setSettings(updated)
  }

  const handleRunNow = async () => {
    setRunning(true)
    try {
      const log = await clawsApi.runMaintenance(claw.id)
      setLogs(prev => [log, ...prev])
      if (settings) setSettings({ ...settings, last_run_at: log.run_at })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="mt-2 p-3 bg-bg-elevated rounded-xl border border-border-subtle space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5 text-accent-cyan" />Maintenance
        </span>
        <button onClick={onClose} className="btn-ghost p-1"><X className="w-3 h-3" /></button>
      </div>

      {loadingSettings ? (
        <p className="text-xs text-text-muted">Loading…</p>
      ) : settings ? (
        <>
          {/* Mode toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted w-14 shrink-0">Mode</span>
            <div className="flex rounded-lg overflow-hidden border border-border-subtle text-xs">
              {(['auto', 'manual'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => updateMode(m)}
                  className={`px-3 py-1 capitalize transition-colors ${
                    settings.mode === m
                      ? 'bg-accent-purple text-white'
                      : 'bg-bg-primary text-text-secondary hover:bg-bg-elevated'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule (auto only) */}
          {settings.mode === 'auto' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted w-14 shrink-0">Schedule</span>
              <div className="flex rounded-lg overflow-hidden border border-border-subtle text-xs">
                {(['daily', 'weekly', 'monthly'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => updateSchedule(s)}
                    className={`px-3 py-1 capitalize transition-colors ${
                      settings.schedule === s
                        ? 'bg-accent-cyan text-bg-primary'
                        : 'bg-bg-primary text-text-secondary hover:bg-bg-elevated'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Manual: Backup Now button */}
          {settings.mode === 'manual' && (
            <button
              onClick={handleRunNow}
              disabled={running}
              className="btn-secondary text-xs py-1.5 w-full flex items-center justify-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} />
              {running ? 'Running…' : 'Backup Now'}
            </button>
          )}

          {/* Last run */}
          {settings.last_run_at && (
            <p className="text-xs text-text-muted flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last run: {new Date(settings.last_run_at).toLocaleString()}
            </p>
          )}
        </>
      ) : null}

      {/* Logs toggle */}
      <button
        onClick={() => setShowLogs(v => !v)}
        className="w-full flex items-center justify-between text-xs text-text-secondary hover:text-text-primary transition-colors"
      >
        <span className="flex items-center gap-1">
          {showLogs ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          Maintenance Records ({loadingLogs ? '…' : logs.length})
        </span>
      </button>

      {showLogs && (
        <div className="space-y-1.5 max-h-56 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-xs text-text-muted">No maintenance records yet.</p>
          ) : (
            logs.map(log => (
              <div
                key={log.id}
                className="p-2 rounded-lg bg-bg-primary border border-border-subtle space-y-0.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {log.success
                      ? <CheckCircle2 className="w-3 h-3 text-accent-success shrink-0" />
                      : <XCircle className="w-3 h-3 text-accent-danger shrink-0" />}
                    <span className="text-xs font-medium text-text-primary capitalize">{log.category}</span>
                  </div>
                  <span className="text-xs text-text-muted">
                    {log.run_at ? new Date(log.run_at).toLocaleString() : '—'}
                  </span>
                </div>
                {log.related_documents && (
                  <p className="text-xs text-text-muted pl-5">Docs: {log.related_documents}</p>
                )}
                {log.remark && (
                  <p className="text-xs text-text-secondary pl-5 line-clamp-2">{log.remark}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Claw card ─────────────────────────────────────────────────────────────────

const ClawCard: FC<ClawCardProps> = ({ claw, onEdit, onDelete, onUpdated }) => {
  const [checking, setChecking] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [showMaintenance, setShowMaintenance] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const notify = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg })
    setTimeout(() => setNotification(null), 3000)
  }

  const handleHealthCheck = async () => {
    setChecking(true)
    try {
      const result = await clawsApi.healthCheck(claw.id)
      onUpdated({ ...claw, status: result.status as Claw['status'], last_health_check: result.checked_at })
      notify(
        result.status === 'online' ? 'success' : 'error',
        result.status === 'online'
          ? `Online · ${result.response_time_ms}ms`
          : `Offline · ${result.detail}`
      )
    } catch {
      notify('error', 'Health check failed')
    } finally {
      setChecking(false)
    }
  }

  const tokenDisplay = claw.total_tokens > 1000
    ? `${(claw.total_tokens / 1000).toFixed(1)}k`
    : claw.total_tokens.toString()

  const lastCheck = claw.last_health_check
    ? new Date(claw.last_health_check).toLocaleTimeString()
    : 'Never'

  return (
    <div className="card-hover p-5 flex flex-col gap-4 animate-fade-in relative overflow-hidden">
      {/* Background accent */}
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-5 blur-2xl"
        style={{
          background: claw.status === 'online' ? '#10b981' : claw.status === 'offline' ? '#ef4444' : '#8b8ba7',
        }}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-bg-elevated flex items-center justify-center border border-border-subtle">
            <Server className="w-5 h-5 text-accent-purple" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">{claw.name}</h3>
            <p className="text-xs text-text-muted font-mono truncate max-w-[180px]">{claw.url}</p>
          </div>
        </div>
        <StatusBadge status={claw.status} />
      </div>

      {/* Description */}
      {claw.description && (
        <p className="text-sm text-text-secondary line-clamp-2">{claw.description}</p>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-bg-elevated rounded-lg p-2.5 text-center">
          <p className="text-xs text-text-muted mb-0.5">Model</p>
          <p className="text-xs font-medium text-text-primary truncate">{claw.model || 'N/A'}</p>
        </div>
        <div className="bg-bg-elevated rounded-lg p-2.5 text-center">
          <p className="text-xs text-text-muted mb-0.5">Tokens</p>
          <p className="text-xs font-medium text-accent-cyan">{tokenDisplay}</p>
        </div>
        <div className="bg-bg-elevated rounded-lg p-2.5 text-center">
          <p className="text-xs text-text-muted mb-0.5">Last Check</p>
          <p className="text-xs font-medium text-text-primary">{lastCheck}</p>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`text-xs px-3 py-2 rounded-lg animate-fade-in ${
            notification.type === 'success'
              ? 'bg-accent-success/10 text-accent-success border border-accent-success/20'
              : 'bg-accent-danger/10 text-accent-danger border border-accent-danger/20'
          }`}
        >
          {notification.msg}
        </div>
      )}

      {/* Config versions panel */}
      {showConfig && (
        <ConfigVersionsPanel
          claw={claw}
          onClose={() => setShowConfig(false)}
          onRestored={updated => { onUpdated(updated); setShowConfig(false) }}
        />
      )}

      {/* Maintenance panel */}
      {showMaintenance && (
        <MaintenancePanel claw={claw} onClose={() => setShowMaintenance(false)} />
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleHealthCheck}
          disabled={checking}
          className="btn-secondary text-xs py-1.5 flex-1"
        >
          <Activity className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Checking…' : 'Health'}
        </button>

        <button
          onClick={() => { setShowConfig(v => !v); setShowMaintenance(false) }}
          className="btn-secondary text-xs py-1.5 flex-1"
        >
          <Settings className="w-3.5 h-3.5 text-accent-purple" />
          Config
        </button>

        <button
          onClick={() => { setShowMaintenance(v => !v); setShowConfig(false) }}
          className="btn-secondary text-xs py-1.5 flex-1"
        >
          <RefreshCw className="w-3.5 h-3.5 text-accent-cyan" />
          Maintain
        </button>

        <button onClick={() => onEdit(claw)} className="btn-ghost text-xs py-1.5 px-2.5">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onDelete(claw.id)} className="btn-danger text-xs py-1.5 px-2.5">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export default ClawCard
