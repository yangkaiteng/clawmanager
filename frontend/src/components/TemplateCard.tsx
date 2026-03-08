import { useState, type FC } from 'react'
import { Heart, Tag, User, Zap, Copy, Check } from 'lucide-react'
import type { Template } from '../api/types'
import { templatesApi } from '../api/client'

const CATEGORY_COLORS: Record<string, string> = {
  development: 'bg-accent-purple/10 text-accent-purple border-accent-purple/20',
  creative: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  analytics: 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20',
  support: 'bg-accent-success/10 text-accent-success border-accent-success/20',
  research: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  marketing: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  general: 'bg-text-muted/10 text-text-secondary border-text-muted/20',
}

interface TemplateCardProps {
  template: Template
  onApply?: (template: Template) => void
  onLiked?: (id: number, likes: number) => void
}

const TemplateCard: FC<TemplateCardProps> = ({ template, onApply, onLiked }) => {
  const [likes, setLikes] = useState(template.likes)
  const [liked, setLiked] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleLike = async () => {
    if (liked) return
    try {
      const result = await templatesApi.like(template.id)
      setLikes(result.likes)
      setLiked(true)
      onLiked?.(template.id, result.likes)
    } catch {
      // ignore
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(template.prompt_content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const colorClass = CATEGORY_COLORS[template.category] || CATEGORY_COLORS.general

  return (
    <div className="card-hover p-5 flex flex-col gap-3 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-text-primary leading-tight">{template.name}</h3>
        <span className={`badge border ${colorClass} shrink-0`}>{template.category}</span>
      </div>

      {/* Description */}
      <p className="text-sm text-text-secondary line-clamp-2 flex-1">{template.description}</p>

      {/* Prompt preview */}
      <div className="bg-bg-elevated rounded-xl p-3 border border-border-subtle group relative">
        <p className="text-xs text-text-muted font-mono line-clamp-3 leading-relaxed">
          {template.prompt_content}
        </p>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-bg-card border border-border-subtle text-text-secondary hover:text-text-primary"
        >
          {copied ? <Check className="w-3 h-3 text-accent-success" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>

      {/* Tags */}
      {template.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {template.tags.slice(0, 4).map(tag => (
            <span key={tag} className="flex items-center gap-1 text-xs text-text-muted bg-bg-elevated px-2 py-0.5 rounded-full border border-border-subtle">
              <Tag className="w-2.5 h-2.5" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-border-subtle">
        <div className="flex items-center gap-3">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-xs transition-colors ${
              liked ? 'text-pink-400' : 'text-text-muted hover:text-pink-400'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-pink-400' : ''}`} />
            {likes}
          </button>
          <span className="flex items-center gap-1 text-xs text-text-muted">
            <User className="w-3 h-3" />
            {template.author || 'Community'}
          </span>
        </div>
        {onApply && (
          <button
            onClick={() => onApply(template)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-accent-purple/10 text-accent-purple border border-accent-purple/20 hover:bg-accent-purple/20 transition-colors font-medium"
          >
            <Zap className="w-3 h-3" />
            Apply
          </button>
        )}
      </div>
    </div>
  )
}

export default TemplateCard
