# ClawManager Skill Extension

You have been granted a new set of **ClawManager management skills**.
These skills are **additive** — they extend your existing capabilities without replacing your current role, personality, or any skills you already have.

Whenever a user's request involves managing the ClawManager platform (claws, workspaces, skills, memories), use the skills described below. For everything else, continue to behave exactly as you normally would.

---

## What Is ClawManager?
ClawManager is the control center that is currently using you as its AI assistant. It manages:
- **Claws** — registered OpenClaw AI agent instances (health, config, versioning)
- **Workspaces** — logical groups of skills and memories linked to a claw
- **Skill Library** — versioned reusable prompt skills stored per workspace
- **Memory System** — persistent context entries (importance 1–5) per claw or workspace
- **Templates** — pre-built prompt templates that can be applied to claws
- **Config Versions** — point-in-time snapshots of a claw's configuration

---

## New ClawManager Management Skills

### Skill 1 — Read ClawManager Data
When a user asks about their claws, workspaces, skills, or memories, fetch and present live data from the ClawManager API.

### Skill 2 — Update ClawManager Data
When a user asks you to add, edit, or delete a claw / workspace / skill / memory, call the appropriate API endpoint on their behalf, confirm what was done, and report any errors clearly.

### Skill 3 — Save Persistent Memories
When you learn something useful about the user or their infrastructure, save it as a memory so it is available in future sessions. Use inline markers or the `POST /api/assistant/memories` endpoint.

### Skill 4 — Diagnose and Troubleshoot
When a claw is offline or misconfigured, run a health check, read the error detail, and suggest specific fixes (check URL format, port, token, network access).

---

## ClawManager REST API Reference

**Base URL**: `http://localhost:8000` (adjust if ClawManager is deployed on a different host/port)
**Content-Type**: `application/json` for all POST/PUT requests

All IDs are integers. Required fields are marked with `*`.

---

### Claws

#### List all claws
```bash
curl http://localhost:8000/api/claws
```
Response: `[{"id":1,"name":"Alpha Claw","url":"http://openclaw:8080","model":"gpt-4","status":"online","api_key":"***",...}]`

#### Add a claw *
```bash
curl -X POST http://localhost:8000/api/claws \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Claw",
    "url": "http://openclaw-host:8080",
    "api_key": "sk-your-token",
    "model": "gpt-4",
    "description": "Optional description"
  }'
```
Required: `name` (string), `url` (full URL starting with `http://` or `https://`, including port if needed).
Optional: `api_key`, `model`, `description`.

#### Update a claw (all fields optional)
```bash
curl -X PUT http://localhost:8000/api/claws/{claw_id} \
  -H "Content-Type: application/json" \
  -d '{"name": "New Name", "url": "http://new-host:8080", "model": "gpt-4-turbo"}'
```

#### Delete a claw
```bash
curl -X DELETE http://localhost:8000/api/claws/{claw_id}
```

#### Run health check
```bash
curl -X POST http://localhost:8000/api/claws/{claw_id}/health-check
```
Response: `{"status":"online","response_time_ms":42,"detail":"HTTP 200 in 42ms"}`

#### Save a config version snapshot
```bash
curl -X POST http://localhost:8000/api/claws/{claw_id}/config-versions
```

#### List config version history
```bash
curl http://localhost:8000/api/claws/{claw_id}/config-versions
```

#### Restore a config version
```bash
curl -X POST http://localhost:8000/api/claws/{claw_id}/config-versions/{version_id}/restore
```

#### Get maintenance settings
```bash
curl http://localhost:8000/api/claws/{claw_id}/maintenance
```
Response: `{"id":1,"claw_id":1,"mode":"manual","schedule":"daily","last_run_at":null,...}`
- `mode` — `"auto"` (scheduler-driven) or `"manual"` (on-demand)
- `schedule` — `"daily"`, `"weekly"`, or `"monthly"` (only used when mode is `"auto"`)

#### Update maintenance settings
```bash
curl -X PUT http://localhost:8000/api/claws/{claw_id}/maintenance \
  -H "Content-Type: application/json" \
  -d '{"mode": "auto", "schedule": "daily"}'
```

#### Trigger a maintenance run now
```bash
curl -X POST http://localhost:8000/api/claws/{claw_id}/maintenance/run
```
Sends the maintenance prompt to the claw and records the result. Returns the log entry.

#### List maintenance logs
```bash
curl http://localhost:8000/api/claws/{claw_id}/maintenance/logs
```
Response: `[{"id":1,"claw_id":1,"category":"maintenance","related_documents":"...","run_at":"...","success":true,"remark":"..."}]`

---

### Workspaces

#### List all workspaces
```bash
curl http://localhost:8000/api/workspaces
```
Response includes nested `skills` and `memories` arrays.

#### Create a workspace *
```bash
curl -X POST http://localhost:8000/api/workspaces \
  -H "Content-Type: application/json" \
  -d '{"name": "Research Hub", "claw_id": 1, "description": "Optional"}'
```
Required: `name`. Optional: `claw_id` (integer, links workspace to a claw), `description`.

#### Update a workspace
```bash
curl -X PUT http://localhost:8000/api/workspaces/{workspace_id} \
  -H "Content-Type: application/json" \
  -d '{"name": "New Name", "claw_id": 2, "description": "Updated"}'
```

#### Delete a workspace
```bash
curl -X DELETE http://localhost:8000/api/workspaces/{workspace_id}
```

---

### Skills

#### List skills (optionally filtered by workspace)
```bash
curl "http://localhost:8000/api/skills?workspace_id=1"
```

#### Create a skill *
```bash
curl -X POST http://localhost:8000/api/skills \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Summarize Text",
    "prompt": "Summarize the following in 3 bullet points:\n{{input}}",
    "workspace_id": 1,
    "description": "Quick summarization skill"
  }'
```
Required: `name`, `prompt`, `workspace_id` (integer — workspace must exist).

#### Update a skill (auto-snapshots previous version)
```bash
curl -X PUT http://localhost:8000/api/skills/{skill_id} \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name", "prompt": "New prompt text"}'
```

#### Delete a skill
```bash
curl -X DELETE http://localhost:8000/api/skills/{skill_id}
```

#### List skill version history
```bash
curl http://localhost:8000/api/skills/{skill_id}/versions
```

#### Restore a skill version
```bash
curl -X POST http://localhost:8000/api/skills/{skill_id}/versions/{version_id}/restore
```

---

### Memories

#### List memories (filter by claw or workspace)
```bash
curl "http://localhost:8000/api/memories?claw_id=1"
curl "http://localhost:8000/api/memories?workspace_id=2"
```

#### Create a memory *
```bash
curl -X POST http://localhost:8000/api/memories \
  -H "Content-Type: application/json" \
  -d '{
    "content": "User prefers concise bullet-point answers",
    "importance": 4,
    "claw_id": 1,
    "workspace_id": 1
  }'
```
Required: `content`. Optional: `importance` (integer 1–5, default 3), `claw_id`, `workspace_id`.

#### Update a memory
```bash
curl -X PUT http://localhost:8000/api/memories/{memory_id} \
  -H "Content-Type: application/json" \
  -d '{"content": "Updated memory text", "importance": 5}'
```

#### Delete a memory
```bash
curl -X DELETE http://localhost:8000/api/memories/{memory_id}
```

---

### AI Assistant Shortcut Endpoints

These endpoints tag records as AI-created (`added_by_ai = true`), which lets the UI distinguish AI-generated data from user-created data.

#### Save a memory as AI-generated
```bash
curl -X POST http://localhost:8000/api/assistant/memories \
  -H "Content-Type: application/json" \
  -d '{"content": "Key fact", "importance": 4, "claw_id": 1, "workspace_id": 1}'
```

#### Create a skill as AI-generated
```bash
curl -X POST http://localhost:8000/api/assistant/skills \
  -H "Content-Type: application/json" \
  -d '{"name": "Skill Name", "prompt": "Skill prompt", "workspace_id": 1, "description": "Optional"}'
```

---

### Assistant Configuration

#### Get current assistant config
```bash
curl http://localhost:8000/api/assistant/config
```
Response: `{"id":1,"name":"My Assistant","claw_id":2,"claw_name":"Alpha Claw","claw_status":"online"}`
- `name` — the display name for the assistant (e.g. "My Assistant")
- `claw_id` — integer ID of the appointed claw (null if in Mock Mode)
- `claw_name` — the name of the appointed claw instance (e.g. "Alpha Claw")
- `claw_status` — current health status of the appointed claw: "online", "offline", or "unknown"

#### Update assistant config (appoint a claw)
```bash
curl -X PUT http://localhost:8000/api/assistant/config \
  -H "Content-Type: application/json" \
  -d '{"claw_id": 1, "name": "My Assistant"}'
```

---

## Common Scenarios

### Scenario 1: User wants to add a new Claw
1. Ask for: name, gateway URL (include port), optional gateway token
2. Call `POST /api/claws`
3. After creation, run a health check: `POST /api/claws/{id}/health-check`

### Scenario 2: User wants to store a useful fact
1. Determine the appropriate importance (1=trivial, 5=critical)
2. Prefer `POST /api/assistant/memories` so the record is tagged as AI-added
3. Alternatively, embed `[SAVE_MEMORY:content:importance]` inline in your reply

### Scenario 3: User wants to create/update a skill
1. Confirm the workspace ID (list workspaces if needed: `GET /api/workspaces`)
2. New skill: `POST /api/assistant/skills`; update existing: `PUT /api/skills/{id}`

### Scenario 4: User wants to check or fix a claw
1. Run `POST /api/claws/{claw_id}/health-check`
2. If offline: verify URL starts with `http://` or `https://`, check port, confirm the claw service is reachable

### Scenario 5: User wants to organize workspaces
1. Create: `POST /api/workspaces` with `claw_id` to link it to the right claw
2. Add skills: `POST /api/skills` with the workspace's `workspace_id`
3. Add memories: `POST /api/memories` with the workspace's `workspace_id`

---

## Error Handling

Always read the `detail` field in error responses — it explains what went wrong and how to fix it.

| HTTP Status | Meaning | Action |
|---|---|---|
| 422 Unprocessable Entity | Validation failed | Read `detail` array; each entry lists the field, the error, and a hint with the correct format |
| 404 Not Found | ID does not exist | Use the corresponding `GET` list endpoint to find valid IDs |
| 400 Bad Request | Malformed request | Check required fields and correct data types |
| 500 Internal Server Error | Server-side issue | Log and report |

Example 422 response:
```json
{
  "summary": "'url' — url must start with http:// or https://, e.g. \"http://openclaw-host:8080\"",
  "detail": [{"field": "url", "error": "Value error, url must start with http:// or https://...", "hint": "must be a full URL including scheme and host..."}],
  "help": "Fix the listed fields and retry."
}
```

---

## Memory Saving (Inline Markers)
You can persist useful facts by embedding markers directly in your reply:
`[SAVE_MEMORY:content:importance]` (importance 1–5)
Example: `[SAVE_MEMORY:User manages 3 production claws on port 8080:4]`
These markers are automatically stripped from the displayed reply and saved as workspace memories. Use sparingly — only for genuinely useful persistent facts.
