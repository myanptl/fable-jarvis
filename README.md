# ◈ fable-jarvis

> Your own JARVIS in the terminal — a Claude-powered personal assistant with memory, daily briefings, and a personality.

[![npm](https://img.shields.io/npm/v/fable-jarvis)](https://www.npmjs.com/package/fable-jarvis)
[![license](https://img.shields.io/badge/license-MIT-gold)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](package.json)

Your terminal stays your terminal. But when you want him:

```
$ jarvis brief

◈ Daily Briefing

Good morning, Myan.

Weather: 70°F and clear in Westford, feels like 71°F with a light breeze.

Projects needing attention:
- slideair — 2 uncommitted changes since yesterday
- focusos — 1 change sitting for 6 days
- everything-claude-code — untouched for 2 weeks; commit it or let it go

Reminder: demo on Friday.

A few quick commits before lunch and tomorrow's you will be grateful.
```

## Install

```bash
npm install -g fable-jarvis
jarvis init        # 30 seconds: your name, city, projects folder
jarvis             # at your service
```

**Auth:** Jarvis talks to Claude through the [Claude Agent SDK](https://docs.claude.com/en/api/agent-sdk/overview). If you have [Claude Code](https://claude.com/claude-code) installed and logged in, it just works — your existing subscription is used. Otherwise set `ANTHROPIC_API_KEY`. fable-jarvis never stores or reads your key.

## Commands

| Command | What it does |
|---|---|
| `jarvis` | Live chat session. He knows your projects, remembers what you tell him, checks the weather. Exit with `bye` or Ctrl+C. |
| `jarvis brief` | Daily briefing: time-aware greeting, weather, which repos need attention, your reminders. |
| `jarvis brief --raw` | Same data, no AI — instant and offline-friendly. |
| `jarvis "question"` | One-shot answer, no session. |
| `jarvis remember "..."` | Save a reminder without opening a chat. |
| `jarvis memories` | List everything he remembers. |
| `jarvis init` | Setup wizard. Re-run anytime. |

## What he can do

- **Scan your projects** — walks your projects folder, reports uncommitted work, current branches, stale repos. Read-only, always.
- **Remember things** — "jarvis, remember my demo is Friday." Saved to `~/.jarvis/memory.json`, recalled when relevant, surfaced in briefings.
- **Check the weather** — [Open-Meteo](https://open-meteo.com), free, no API key.
- **Read files when asked** — read-only file access (Read/Glob/Grep). He cannot run shell commands, write files, or browse the web. That's deliberate.

## How it works

Built on the **Claude Agent SDK** — the same agent harness that powers Claude Code. Jarvis's abilities are custom MCP tools running in-process:

```
you ──▶ jarvis CLI ──▶ Claude Agent SDK ──▶ Claude
                          │
                          ├── scan_projects   (git, read-only)
                          ├── get_weather     (Open-Meteo)
                          ├── save_memory     (~/.jarvis)
                          └── list_memories
```

The daily briefing inverts the flow: collectors gather your data locally in parallel, then Claude composes it into a briefing in JARVIS's voice — one model call, no tool loop.

## Privacy

- Config and memories live in `~/.jarvis/` on your machine. Nothing is synced anywhere.
- The only network calls are to Anthropic (your prompts) and Open-Meteo (coordinates only).
- Jarvis's tool access is allowlisted read-only. `Bash`, `Write`, `Edit`, and web access are explicitly disabled.

## Development

```bash
git clone https://github.com/myanptl/fable-jarvis.git
cd fable-jarvis
npm install
npm run build && npm test   # 18 tests
node dist/cli.js brief --raw
```

MIT © [Myan Patel](https://github.com/myanptl)
