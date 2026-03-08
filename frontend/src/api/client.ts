import type {
  Claw, Template, Workspace, Skill, Memory,
  AssistantConfig, Stats, HealthCheckResult, ChatResponse,
  ClawCreate, TemplateCreate, WorkspaceCreate, SkillCreate, MemoryCreate,
} from './types'

const API_BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

// ── Claws ──────────────────────────────────────────────────────────────────

export const clawsApi = {
  list: () => request<Claw[]>('/claws'),
  get: (id: number) => request<Claw>(`/claws/${id}`),
  create: (data: ClawCreate) =>
    request<Claw>('/claws', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<ClawCreate>) =>
    request<Claw>(`/claws/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<{ message: string }>(`/claws/${id}`, { method: 'DELETE' }),
  healthCheck: (id: number) =>
    request<HealthCheckResult>(`/claws/${id}/health-check`, { method: 'POST' }),
  applyTemplate: (id: number, templateId: number) =>
    request<{ success: boolean; template: string; message?: string; simulated?: boolean }>(
      `/claws/${id}/apply-template`,
      { method: 'POST', body: JSON.stringify({ template_id: templateId }) }
    ),
  stats: (id: number) => request<Record<string, unknown>>(`/claws/${id}/stats`),
}

// ── Templates ──────────────────────────────────────────────────────────────

export const templatesApi = {
  list: (category?: string) =>
    request<Template[]>(`/templates${category && category !== 'all' ? `?category=${category}` : ''}`),
  get: (id: number) => request<Template>(`/templates/${id}`),
  create: (data: TemplateCreate) =>
    request<Template>('/templates', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<TemplateCreate>) =>
    request<Template>(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<{ message: string }>(`/templates/${id}`, { method: 'DELETE' }),
  like: (id: number) => request<{ likes: number }>(`/templates/${id}/like`, { method: 'POST' }),
}

// ── Workspaces ─────────────────────────────────────────────────────────────

export const workspacesApi = {
  list: () => request<Workspace[]>('/workspaces'),
  get: (id: number) => request<Workspace>(`/workspaces/${id}`),
  create: (data: WorkspaceCreate) =>
    request<Workspace>('/workspaces', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<WorkspaceCreate>) =>
    request<Workspace>(`/workspaces/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<{ message: string }>(`/workspaces/${id}`, { method: 'DELETE' }),
}

// ── Skills ─────────────────────────────────────────────────────────────────

export const skillsApi = {
  list: (workspaceId?: number) =>
    request<Skill[]>(`/skills${workspaceId ? `?workspace_id=${workspaceId}` : ''}`),
  create: (data: SkillCreate) =>
    request<Skill>('/skills', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<SkillCreate>) =>
    request<Skill>(`/skills/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<{ message: string }>(`/skills/${id}`, { method: 'DELETE' }),
}

// ── Memories ───────────────────────────────────────────────────────────────

export const memoriesApi = {
  list: (params?: { claw_id?: number; workspace_id?: number }) => {
    const q = new URLSearchParams()
    if (params?.claw_id) q.set('claw_id', String(params.claw_id))
    if (params?.workspace_id) q.set('workspace_id', String(params.workspace_id))
    return request<Memory[]>(`/memories${q.toString() ? `?${q}` : ''}`)
  },
  create: (data: MemoryCreate) =>
    request<Memory>('/memories', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: number) => request<{ message: string }>(`/memories/${id}`, { method: 'DELETE' }),
}

// ── Assistant ──────────────────────────────────────────────────────────────

export const assistantApi = {
  chat: (message: string, history: { role: string; content: string }[]) =>
    request<ChatResponse>('/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    }),
  getConfig: () => request<AssistantConfig>('/assistant/config'),
  updateConfig: (data: Partial<AssistantConfig>) =>
    request<AssistantConfig>('/assistant/config', { method: 'PUT', body: JSON.stringify(data) }),
}

// ── Stats ──────────────────────────────────────────────────────────────────

export const statsApi = {
  get: () => request<Stats>('/stats'),
}
