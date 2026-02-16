# OpenDash

Right now, every team using AI agents has the same problem. You've got people using Claude Code, Codex, AgentZero, OpenClaw - but there's no central place where all these agents and humans connect. Your best prompts live in someone's local folder. Your configs are scattered across machines. And if an agent goes rogue or leaks data, there's nothing protecting you.

OpenDash is a dashboard for the future of work - where your team is a mix of humans and AI agents. It's a shared file system that both people and agents can access, with a security layer called a prompt harness that protects against prompt injections and data leaks. Any agent can plug in through a simple skill - drop it in, and it knows how to talk to your team's dashboard.

We're making it open source because this should be infrastructure, not a product you're locked into. Every company is going to need something like this. The way we see it, the sooner this exists as a standard, the better it is for everyone building with AI agents. So we're going to build it live, right here, and put it on GitHub for anyone to use.

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

## Founder Accelerator
If you're reading this and already run an AI business doing at least `$1,000/month`, consider applying to my accelerator.

I work closely with a few selected founders and help them scale to `$200,000 ARR` (annual recurring revenue) and beyond.

We reject `98%` of candidates, so selection is strict:
- You must already have a business.
- You must already be making at least `$1,000/month`.

If you qualify, apply at [scalesoftware.ai/start](https://www.scalesoftware.ai/start).

## License
MIT (`LICENSE`).
