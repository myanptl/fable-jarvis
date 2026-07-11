#!/usr/bin/env node
import { createRequire } from "node:module";
import { runChat } from "./commands/chat.js";
import { runBrief } from "./commands/brief.js";
import { runAsk } from "./commands/ask.js";
import { runInit } from "./commands/init.js";
import { addMemory, listMemories } from "./core/memory.js";
import { gold, bold, dim, green, errorLine } from "./ui.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const HELP = `
${gold(bold("◈ fable-jarvis"))} ${dim(`v${version}`)} — your own JARVIS in the terminal

${bold("Usage")}
  jarvis                      start a live chat session
  jarvis brief [--raw]        your daily briefing (weather, projects, reminders)
  jarvis "any question"       quick one-shot answer
  jarvis ask "question"       same as above, explicit
  jarvis remember "text"      save a reminder without opening a chat
  jarvis memories             list saved reminders
  jarvis init                 30-second setup (name, city, projects folder)
  jarvis --help | --version

${bold("Auth")}
  Uses your Claude Code login if you have one, or ANTHROPIC_API_KEY.
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const [command, ...rest] = args;

  if (command === undefined) {
    await runChat();
    return;
  }

  switch (command) {
    case "--help":
    case "-h":
    case "help":
      process.stdout.write(HELP);
      return;
    case "--version":
    case "-v":
      process.stdout.write(`${version}\n`);
      return;
    case "init":
      await runInit();
      return;
    case "brief":
      await runBrief(rest.includes("--raw"));
      return;
    case "remember": {
      const text = rest.join(" ").trim();
      if (text.length === 0) {
        errorLine('Nothing to remember. Try: jarvis remember "demo on Friday"');
        process.exitCode = 1;
        return;
      }
      const memory = await addMemory(text);
      process.stdout.write(`${green("✔")} Noted: "${memory.text}"\n`);
      return;
    }
    case "memories": {
      const memories = await listMemories();
      if (memories.length === 0) {
        process.stdout.write(dim("Nothing saved yet. Try: jarvis remember \"...\"\n"));
        return;
      }
      for (const memory of memories) {
        process.stdout.write(`${gold("◈")} ${memory.text} ${dim(memory.createdAt.slice(0, 10))}\n`);
      }
      return;
    }
    case "ask": {
      const question = rest.join(" ").trim();
      if (question.length === 0) {
        errorLine('Ask me something. Try: jarvis ask "what needs my attention?"');
        process.exitCode = 1;
        return;
      }
      await runAsk(question);
      return;
    }
    default:
      await runAsk(args.join(" "));
  }
}

main().catch((error: unknown) => {
  errorLine(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
