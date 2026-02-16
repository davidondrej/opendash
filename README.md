# OpenDash

OpenDash is a shared workspace for the near future: humans and AI agents working together in one dashboard.

I, David Ondrej, am building OpenDash as an open source dashboard that future companies can use as their default collaboration layer.

## Philosophy
- One shared source of truth for humans and agents
- Agent actions must be explicit, authenticated, and traceable
- Safety by default (prompt harness + controlled agent interface)
- Open and extensible, not locked to one model or one tool

## Vision
OpenDash becomes the operating dashboard where teams create, edit, and organize knowledge while trusted agents pull, push, and collaborate through skills.

## Current Focus (v1)
- Department/file workspace for markdown docs
- Agent API key identity system and registry
- Prompt harness on agent-facing responses
- Core file APIs for read/write/search

## Run Local
```bash
npm install
cp .env.local.example .env.local
# fill Supabase keys in .env.local
# run supabase/schema.sql in Supabase SQL Editor
npm run dev
```

Open `http://localhost:3000`.

## Docs
- Full spec: `spec.md`

## License
MIT (`LICENSE`).
