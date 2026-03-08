import { useState, useEffect, type FC } from 'react'
import { Server, BookOpen, FolderKanban, Activity, Zap, TrendingUp, Brain, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { statsApi } from '../api/client'
import type { Stats } from '../api/types'

const StatCard: FC<{
  icon: React.ReactNode
  label: string
  value: number | string
  color: string
  glow: string
  to: string
}> = ({ icon, label, value, color, glow, to }) => (
  <Link to={to} className="stat-card hover:scale-[1.02] transition-transform cursor-pointer group">
    <div className="flex items-center justify-between">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}
        style={{ boxShadow: glow }}>
        {icon}
      </div>
      <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-text-secondary transition-colors" />
    </div>
    <div>
      <p className="text-3xl font-bold text-text-primary">{value}</p>
      <p className="text-sm text-text-secondary mt-0.5">{label}</p>
    </div>
  </Link>
)

const Dashboard: FC = () => {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    statsApi.get().then(setStats).finally(() => setLoading(false))
  }, [])

  const tokenDisplay = stats
    ? stats.total_tokens >= 1_000_000
      ? `${(stats.total_tokens / 1_000_000).toFixed(1)}M`
      : stats.total_tokens >= 1000
        ? `${(stats.total_tokens / 1000).toFixed(1)}k`
        : stats.total_tokens.toString()
    : '0'

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-secondary mt-1">Monitor and manage your OpenClaw AI instances</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          to="/claws"
          icon={<Server className="w-5 h-5 text-accent-purple" />}
          label="Total Claws"
          value={loading ? '…' : stats?.total_claws ?? 0}
          color="bg-accent-purple/10"
          glow="0 0 15px rgba(99,102,241,0.2)"
        />
        <StatCard
          to="/claws"
          icon={<Activity className="w-5 h-5 text-accent-success" />}
          label="Healthy Claws"
          value={loading ? '…' : stats?.healthy_claws ?? 0}
          color="bg-accent-success/10"
          glow="0 0 15px rgba(16,185,129,0.2)"
        />
        <StatCard
          to="/templates"
          icon={<BookOpen className="w-5 h-5 text-accent-cyan" />}
          label="Templates"
          value={loading ? '…' : stats?.total_templates ?? 0}
          color="bg-accent-cyan/10"
          glow="0 0 15px rgba(6,182,212,0.2)"
        />
        <StatCard
          to="/workspaces"
          icon={<FolderKanban className="w-5 h-5 text-accent-warning" />}
          label="Workspaces"
          value={loading ? '…' : stats?.total_workspaces ?? 0}
          color="bg-accent-warning/10"
          glow="0 0 15px rgba(245,158,11,0.2)"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Status */}
        <div className="lg:col-span-2 card p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent-purple" />
            <h2 className="section-title">System Status</h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-bg-elevated rounded-xl animate-pulse" />
              ))}
            </div>
          ) : stats?.claw_health.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <Server className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No claws configured yet</p>
              <Link to="/claws" className="text-accent-purple text-sm hover:underline mt-1 inline-block">
                Add your first claw →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {stats?.claw_health.map(c => {
                const tokenPct = Math.min(100, ((c.total_tokens) / 200_000) * 100)
                return (
                  <div key={c.id} className="flex items-center gap-4 p-3 bg-bg-elevated rounded-xl border border-border-subtle">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      c.status === 'online' ? 'bg-accent-success neon-dot' :
                      c.status === 'offline' ? 'bg-accent-danger' : 'bg-text-muted'
                    }`} style={{ color: c.status === 'online' ? '#10b981' : undefined }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-text-primary truncate">{c.name}</span>
                        <span className="text-xs text-text-muted shrink-0 ml-2">
                          {c.total_tokens.toLocaleString()} tokens
                        </span>
                      </div>
                      <div className="h-1.5 bg-bg-card rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${tokenPct}%`,
                            background: c.status === 'online'
                              ? 'linear-gradient(90deg, #6366f1, #06b6d4)'
                              : '#374151',
                          }}
                        />
                      </div>
                    </div>
                    <span className={`text-xs font-medium shrink-0 ${
                      c.status === 'online' ? 'text-accent-success' :
                      c.status === 'offline' ? 'text-accent-danger' : 'text-text-muted'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick Stats + Actions */}
        <div className="space-y-4">
          {/* Token usage */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4.5 h-4.5 text-accent-cyan" style={{ width: '18px', height: '18px' }} />
              <h2 className="font-semibold text-text-primary text-sm">Token Usage</h2>
            </div>
            <div className="text-center py-2">
              <p className="text-4xl font-bold text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}>
                {tokenDisplay}
              </p>
              <p className="text-xs text-text-muted mt-1">Total tokens consumed</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-bg-elevated rounded-lg p-2.5 text-center">
                <p className="text-lg font-bold text-text-primary">{loading ? '…' : stats?.total_skills ?? 0}</p>
                <p className="text-xs text-text-muted">Skills</p>
              </div>
              <div className="bg-bg-elevated rounded-lg p-2.5 text-center">
                <p className="text-lg font-bold text-text-primary">{loading ? '…' : stats?.total_memories ?? 0}</p>
                <p className="text-xs text-text-muted">Memories</p>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4.5 h-4.5 text-accent-warning" style={{ width: '18px', height: '18px' }} />
              <h2 className="font-semibold text-text-primary text-sm">Quick Actions</h2>
            </div>
            <div className="space-y-2">
              {[
                { to: '/claws', icon: Server, label: 'Manage Claws', color: 'text-accent-purple' },
                { to: '/templates', icon: BookOpen, label: 'Browse Templates', color: 'text-accent-cyan' },
                { to: '/workspaces', icon: FolderKanban, label: 'Open Workspaces', color: 'text-accent-warning' },
                { to: '/settings', icon: Brain, label: 'Configure Assistant', color: 'text-pink-400' },
              ].map(({ to, icon: Icon, label, color }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-bg-elevated transition-colors text-sm text-text-secondary hover:text-text-primary"
                >
                  <Icon className={`w-4 h-4 ${color}`} />
                  {label}
                  <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
