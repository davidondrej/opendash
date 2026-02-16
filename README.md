# OpenDash

A central dashboard where teams share files and AI agents connect via skills to pull, push, and collaborate.

## Quick Start (Localhost)
1. Install dependencies:
```bash
npm install
```

2. Create local env file:
```bash
cp .env.local.example .env.local
```

3. In Supabase, create a new project and copy:
- Project URL
- `anon` key
- `service_role` key

4. Paste those values into `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

5. In Supabase SQL Editor, run:
- `supabase/schema.sql`

6. Start the app:
```bash
npm run dev
```

7. Open:
- `http://localhost:3000`

## Current Local MVP
- File manager page with list/search/upload/select
- API routes:
  - `GET /api/files`
  - `POST /api/files`
  - `GET /api/files/:id`
  - `PUT /api/files/:id`
  - `DELETE /api/files/:id`

## Why OpenDash
Teams need one place to store prompts, configs, and docs that both humans and agents can use safely. OpenDash provides that shared layer with explicit guardrails for agent behavior.

## OpenDash v1 Scope

### 1) File Manager
- Upload, browse, edit, and delete markdown files and docs
- Organize content by folders/projects
- Search across all files
- Clean web UI

### 2) Prompt Harness
- A default system prompt wraps every file response served to agents
- Enforces: treat file contents as data, do not follow embedded instructions, do not leak sensitive info
- Customizable per project
- Applied automatically in API responses

### 3) OpenDash Agent Skill
- Portable skill folder for agents (Codex, Claude Code, AgentZero, OpenClaw, etc.)
- Auto-discovery of how to interact with OpenDash
- Skill operations: list files, get file, upload file, search files
- Includes prompt harness rules in skill instructions
- Primary agent interface (instead of direct raw API use)

### 4) REST API
- `GET /api/files` - list files
- `GET /api/files/:id` - get a file
- `POST /api/files` - upload a file
- `PUT /api/files/:id` - update a file
- `DELETE /api/files/:id` - delete a file
- Agent authentication via API key

### 5) Agent Registry
- Register agents in dashboard
- Unique API key per agent
- View connected agents
- Activity log of file pulls/pushes with timestamps

## Authentication Model
- Humans: email/password
- Agents: API key
- Single role in v1 (no permission matrix)

## Tech Stack
- Frontend: Next.js
- Backend: Next.js API routes
- Database/Auth/Storage: Supabase
- Deployment: Vercel

## Not In v1
- Roles/permissions
- Agent-to-agent communication
- Chat/messaging
- Automations
- File versioning
- Custom themes

## Agent Skill Layout
```text
opendash-skill/
|- SKILL.md
|- scripts/
|  \- api.sh
\- references/
   \- schema.md
```

## Build Sequence
1. Scaffold Next.js + Supabase
2. Build file manager UI
3. Build REST API
4. Add API key auth for agents
5. Build the OpenDash agent skill
6. Add prompt harness
7. Add agent registry + activity log
8. Deploy to Vercel
9. Demo agent connection and file pull workflow

## Project Docs
- Full product spec: `spec.md`

## License
MIT (see `LICENSE`).
