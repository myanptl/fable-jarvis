import { createInterface, type Interface } from "node:readline";
import type { SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { query, agentOptions, isAuthError, AUTH_HELP } from "../core/agent.js";
import { loadConfig } from "../core/config.js";
import { banner, gold, dim, errorLine, spinner, type Spinner } from "../ui.js";

const EXIT_WORDS = new Set(["bye", "exit", "quit", "goodbye"]);

/** Push-based async queue so readline input can feed the SDK's streaming-input mode. */
class MessageQueue implements AsyncIterable<SDKUserMessage> {
  private resolvers: Array<(value: IteratorResult<SDKUserMessage>) => void> = [];
  private buffer: SDKUserMessage[] = [];
  private done = false;

  push(text: string): void {
    const message: SDKUserMessage = {
      type: "user",
      session_id: "",
      parent_tool_use_id: null,
      message: { role: "user", content: [{ type: "text", text }] },
    };
    const resolve = this.resolvers.shift();
    if (resolve) resolve({ value: message, done: false });
    else this.buffer.push(message);
  }

  end(): void {
    this.done = true;
    for (const resolve of this.resolvers.splice(0)) {
      resolve({ value: undefined, done: true });
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<SDKUserMessage> {
    return {
      next: () => {
        const buffered = this.buffer.shift();
        if (buffered) return Promise.resolve({ value: buffered, done: false });
        if (this.done) return Promise.resolve({ value: undefined, done: true });
        return new Promise((resolve) => this.resolvers.push(resolve));
      },
    };
  }
}

function ask(rl: Interface): void {
  rl.setPrompt(gold("you › "));
  rl.prompt();
}

export async function runChat(): Promise<void> {
  const config = await loadConfig();
  process.stdout.write(banner());
  if (!config) {
    process.stdout.write(dim("  Tip: run `jarvis init` so I know who you are.\n\n"));
  }

  const queue = new MessageQueue();
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const thinking: { current: Spinner | null } = { current: null };

  rl.on("line", (line) => {
    const text = line.trim();
    if (text.length === 0) {
      ask(rl);
      return;
    }
    if (EXIT_WORDS.has(text.toLowerCase())) {
      queue.end();
      rl.close();
      process.stdout.write(dim("\nUntil next time.\n"));
      return;
    }
    thinking.current = spinner("thinking…");
    queue.push(text);
  });

  rl.on("close", () => queue.end());
  ask(rl);

  try {
    for await (const message of query({ prompt: queue, options: agentOptions(config) })) {
      if (message.type === "assistant") {
        thinking.current?.stop();
        thinking.current = null;
        const text = message.message.content
          .map((block) => (block.type === "text" ? block.text : ""))
          .join("");
        if (text.trim().length > 0) {
          process.stdout.write(`\n${gold("◈")} ${text.trim()}\n\n`);
        }
      }
      if (message.type === "result") {
        thinking.current?.stop();
        thinking.current = null;
        ask(rl);
      }
    }
  } catch (error) {
    thinking.current?.stop();
    const description = error instanceof Error ? error.message : String(error);
    errorLine(description);
    if (isAuthError(description)) process.stderr.write(AUTH_HELP + "\n");
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}
