import { type FC } from 'react'

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'unknown' | string
}

const StatusBadge: FC<StatusBadgeProps> = ({ status }) => {
  if (status === 'online') {
    return (
      <span className="badge-online">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-success inline-block neon-dot" />
        Online
      </span>
    )
  }
  if (status === 'offline') {
    return (
      <span className="badge-offline">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-danger inline-block" />
        Offline
      </span>
    )
  }
  return (
    <span className="badge-unknown">
      <span className="w-1.5 h-1.5 rounded-full bg-text-muted inline-block" />
      Unknown
    </span>
  )
}

export default StatusBadge
