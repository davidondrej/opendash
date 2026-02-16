# OpenDash: Key Problems Summary

## Stack Verdict
The current stack is correct: Next.js + Supabase + Vercel is a strong fit for fast setup, simple deployment, and scalable v1 execution.

## Main Architecture Issues

### 1. Projects vs Folders is unresolved
The data model and UI currently use conflicting approaches:
- Database expects `projects` + `project_id` + `prompt_harnesses` tied to projects.
- Frontend uses filename prefixes (like `engineering/plan.md`) and marker files (`.opendash-folder.md`) as a folder system.

Current result:
- `project_id` is effectively unused.
- `projects` has no practical role in runtime behavior.
- Folder logic is mostly frontend string parsing.

A clear decision is needed:
- Either implement real projects end-to-end,
- Or remove project complexity and commit to prefix-based flat filenames (which may be simpler for agent access).

### 2. Agents schema is incomplete vs spec
Before auth work proceeds, the `agents` model needs required spec fields (notably `key_prefix`, proper `status`, `revoked_at`, `last_used_at`) instead of only basic hash/active fields.

## API State
The CRUD API is clean and functional, but currently lacks security and actor-awareness:
- No authentication boundary on requests.
- No shared auth/logging middleware pattern.
- No human-vs-agent request context.

## What is already strong
- Markdown in Postgres text columns is appropriate for v1.
- Supabase admin client integration is minimal and clean.
- Next.js API route structure is straightforward.
- `updated_at` trigger setup is good.
- Activity logging table exists and can be activated quickly.

## Bottom Line
The foundation is solid. To unblock the real roadmap, fix two core issues first:
1. Resolve the projects-vs-folders model.
2. Align the agents schema to spec.

After that, implementation can move directly through auth, agent skill integration, and completion of v1 goals.

## Status Update
- Problem 1 (`projects` vs `folders`) has been fixed.
- Problem 2 (`agents` schema vs spec) has been fixed.
