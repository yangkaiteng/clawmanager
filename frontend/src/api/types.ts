export interface Claw {
  id: number
  name: string
  url: string
  api_key: string | null
  description: string | null
  model: string | null
  status: 'online' | 'offline' | 'unknown'
  last_health_check: string | null
  total_tokens: number
  created_at: string | null
  updated_at: string | null
}

export interface Template {
  id: number
  name: string
  description: string | null
  category: string
  prompt_content: string
  tags: string[]
  likes: number
  author: string | null
  created_at: string | null
}

export interface Workspace {
  id: number
  name: string
  claw_id: number | null
  description: string | null
  created_at: string | null
  claw_name: string | null
  skills: Skill[]
  memories: Memory[]
}

export interface Skill {
  id: number
  name: string
  description: string | null
  prompt: string
  workspace_id: number
  created_at: string | null
}

export interface Memory {
  id: number
  content: string
  claw_id: number | null
  workspace_id: number | null
  importance: number
  created_at: string | null
}

export interface AssistantConfig {
  id: number
  url: string | null
  api_key: string | null
  model: string | null
  name: string | null
}

export interface Stats {
  total_claws: number
  healthy_claws: number
  total_templates: number
  total_workspaces: number
  total_skills: number
  total_memories: number
  total_tokens: number
  claw_health: { id: number; name: string; status: string; total_tokens: number }[]
}

export interface HealthCheckResult {
  claw_id: number
  status: string
  response_time_ms: number | null
  detail: string
  checked_at: string
}

export interface ChatResponse {
  reply: string
  model: string
  source: string
}

export interface ClawCreate {
  name: string
  url: string
  api_key?: string
  description?: string
  model?: string
}

export interface TemplateCreate {
  name: string
  description?: string
  category: string
  prompt_content: string
  tags?: string
  author?: string
}

export interface WorkspaceCreate {
  name: string
  claw_id?: number | null
  description?: string
}

export interface SkillCreate {
  name: string
  description?: string
  prompt: string
  workspace_id: number
}

export interface MemoryCreate {
  content: string
  claw_id?: number | null
  workspace_id?: number | null
  importance?: number
}
