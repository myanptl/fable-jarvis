# hey-jarvis — Design Spec

**Date:** 2026-07-10
**Status:** Approved

## What it is

An open-source terminal AI assistant powered by Claude via the Claude Agent SDK.
Anyone can install it from npm (`npm i -g hey-jarvis`), run `jarvis`, and get a
personal assistant with a JARVIS personality that knows their projects, remembers
what they tell it, and gives them a daily briefing.

## Commands

| Command | Behavior |
|---|---|
| `jarvis` | Live chat session in the terminal. JARVIS persona, streaming replies. Exit with Ctrl+C or "bye". |
| `jarvis brief` | Prints the daily briefing and exits: time-aware greeting, weather, git status across the user's projects folder, saved reminders. `--raw` skips the AI composition and prints collected data directly. |
| `jarvis "question"` / `jarvis ask "question"` | One-shot answer, no session. |
| `jarvis init` | 30-second setup wizard: name, city (geocoded once for weather), projects folder. |
| `jarvis remember "text"` / `jarvis memories` | Save / list memories without opening a chat. |

## Capabilities (tools)

Read-only and safe by default:

- **Git scan** — walks the projects folder one level deep, reports dirty repos, current branch, last-commit age. No writes, no destructive commands.
- **Weather** — Open-Meteo (free, no API key). Geocoding at init, forecast at brief time.
- **Memory** — `~/.jarvis/memory.json`. Jarvis can save and recall things the user tells it.
- **Built-in read-only file tools** — Read, Glob, Grep from the Agent SDK, scoped to allowed tools only. No Bash, no Write, no Edit in v1.

## Auth

The Agent SDK uses the user's existing Claude Code login when available, or
`ANTHROPIC_API_KEY`. No key is ever stored by hey-jarvis. Friendly error message
with both options if neither is present.

## Architecture

```
src/
  cli.ts              arg parsing + dispatch (no framework)
  ui.ts               ANSI styling, spinner, banner (zero deps, amber accent)
  commands/
    chat.ts           multi-turn session: streaming-input query() + readline
    brief.ts          parallel collectors -> single compose query (maxTurns 1)
    ask.ts            one-shot query
    init.ts           setup wizard
  core/
    agent.ts          query() wrapper, SDK MCP server with custom tools
    persona.ts        JARVIS system prompt builder
    config.ts         ~/.jarvis/config.json, zod-validated
    memory.ts         ~/.jarvis/memory.json, immutable ops
  collectors/
    git.ts            repo scan via execFile git (no shell interpolation)
    weather.ts        Open-Meteo geocoding + forecast
```

Runtime deps: `@anthropic-ai/claude-agent-sdk`, `zod`. That's it.

## Error handling

- Missing config → point to `jarvis init`, sensible defaults where possible.
- No auth → clear message: log into Claude Code or set ANTHROPIC_API_KEY.
- Weather/network failure → briefing continues without weather.
- Git errors in individual repos → skipped, never crash the briefing.

## Testing

Vitest unit tests for config, memory, git collector (temp dirs), weather
(mocked fetch). Manual end-to-end run of all commands before publish.

## Distribution

- npm package `hey-jarvis`, bin `jarvis`, Node >= 18, MIT license.
- GitHub `myanptl/hey-jarvis` with README (install, demo GIF placeholder, features, privacy note).
