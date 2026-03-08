import { type FC } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Server, BookTemplate, FolderKanban,
  Settings, Github,
} from 'lucide-react'
import NanoClawAssistant from './NanoClawAssistant'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/claws', icon: Server, label: 'Claws' },
  { to: '/templates', icon: BookTemplate, label: 'Templates' },
  { to: '/workspaces', icon: FolderKanban, label: 'Workspaces' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

interface LayoutProps {
  children: React.ReactNode
}

const Layout: FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 flex flex-col border-r border-border-subtle"
        style={{ background: '#0d0d14' }}>
        {/* Logo */}
        <div className="p-5 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
              style={{ filter: 'sepia(1) saturate(4) hue-rotate(5deg) brightness(1.15)' }}>
              🦞
            </div>
            <div>
              <h1 className="font-bold text-text-primary tracking-tight">ClawManager</h1>
              <p className="text-xs text-text-muted">OpenClaw Control Center</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-accent-purple/10 text-accent-purple border border-accent-purple/20'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-accent-purple' : ''}`} style={{ width: '18px', height: '18px' }} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border-subtle">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            <Github className="w-3.5 h-3.5" />
            ClawManager v1.0
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-bg-primary">
        <div className="min-h-full p-6">
          {children}
        </div>
      </main>

      {/* Floating AI assistant */}
      <NanoClawAssistant />
    </div>
  )
}

export default Layout
