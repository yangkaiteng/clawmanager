import { useState, type FC } from 'react'
import { Activity, Zap, Edit2, Trash2, Server, ChevronDown } from 'lucide-react'
import type { Claw, Template } from '../api/types'
import StatusBadge from './StatusBadge'
import { clawsApi } from '../api/client'

interface ClawCardProps {
  claw: Claw
  templates: Template[]
  onEdit: (claw: Claw) => void
  onDelete: (id: number) => void
  onUpdated: (claw: Claw) => void
}

const ClawCard: FC<ClawCardProps> = ({ claw, templates, onEdit, onDelete, onUpdated }) => {
  const [checking, setChecking] = useState(false)
  const [applying, setApplying] = useState(false)
  const [showTemplateMenu, setShowTemplateMenu] = useState(false)
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

  const handleApplyTemplate = async (templateId: number) => {
    setApplying(true)
    setShowTemplateMenu(false)
    try {
      const result = await clawsApi.applyTemplate(claw.id, templateId)
      notify('success', result.simulated ? `Template queued: ${result.template}` : `Applied: ${result.template}`)
    } catch {
      notify('error', 'Failed to apply template')
    } finally {
      setApplying(false)
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

        <div className="relative flex-1">
          <button
            onClick={() => setShowTemplateMenu(!showTemplateMenu)}
            disabled={applying}
            className="btn-secondary text-xs py-1.5 w-full"
          >
            <Zap className="w-3.5 h-3.5 text-accent-warning" />
            {applying ? 'Applying…' : 'Template'}
            <ChevronDown className="w-3 h-3 ml-auto" />
          </button>
          {showTemplateMenu && (
            <div className="absolute bottom-full mb-1 left-0 right-0 bg-bg-elevated border border-border rounded-xl shadow-card z-20 overflow-hidden animate-slide-up">
              <div className="p-1 max-h-48 overflow-y-auto">
                {templates.length === 0 ? (
                  <p className="text-xs text-text-muted px-3 py-2">No templates</p>
                ) : (
                  templates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleApplyTemplate(t.id)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-bg-card rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                    >
                      <span className="font-medium">{t.name}</span>
                      <span className="ml-2 text-text-muted">{t.category}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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
