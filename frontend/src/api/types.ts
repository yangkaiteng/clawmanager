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
  updated_at: string | null
  added_by_ai: boolean
}

export interface Memory {
  id: number
  content: string
  claw_id: number | null
  workspace_id: number | null
  importance: number
  created_at: string | null
  updated_at: string | null
  added_by_ai: boolean
}

export interface AssistantConfig {
  id: number
  name: string | null
  claw_id: number | null
  claw_name: string | null
  claw_status: string | null
  mock_enabled: boolean
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

export interface SkillUpdate {
  name?: string
  description?: string
  prompt?: string
}

export interface MemoryCreate {
  content: string
  claw_id?: number | null
  workspace_id?: number | null
  importance?: number
}

export interface MemoryUpdate {
  content?: string
  importance?: number
}

export interface ClawConfigVersion {
  id: number
  claw_id: number
  version_number: number
  name: string
  url: string
  model: string | null
  description: string | null
  created_at: string | null
}

export interface ClawMaintenance {
  id: number
  claw_id: number
  mode: 'auto' | 'manual'
  schedule: 'daily' | 'weekly' | 'monthly'
  last_run_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface ClawMaintenanceLog {
  id: number
  claw_id: number
  category: string
  related_documents: string | null
  run_at: string | null
  success: boolean
  remark: string | null
}

export interface SkillVersion {
  id: number
  skill_id: number
  version_number: number
  name: string
  description: string | null
  prompt: string
  created_at: string | null
}

export interface WorkspaceSnapshot {
  id: number
  workspace_id: number
  version_number: number
  name: string
  description: string | null
  claw_id: number | null
  snapshot_at: string | null
}
