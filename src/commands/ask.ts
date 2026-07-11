import { query, agentOptions, isAuthError, AUTH_HELP } from "../core/agent.js";
import { loadConfig } from "../core/config.js";
import { gold, errorLine, spinner } from "../ui.js";

const ONE_SHOT_MAX_TURNS = 8;

export async function runAsk(question: string): Promise<void> {
  const config = await loadConfig();
  const working = spinner("on it…");
  try {
    for await (const message of query({
      prompt: question,
      options: agentOptions(config, { maxTurns: ONE_SHOT_MAX_TURNS }),
    })) {
      if (message.type === "result" && message.subtype === "success") {
        working.stop();
        process.stdout.write(`${gold("◈")} ${message.result.trim()}\n`);
      }
    }
  } catch (error) {
    working.stop();
    const description = error instanceof Error ? error.message : String(error);
    errorLine(description);
    if (isAuthError(description)) process.stderr.write(AUTH_HELP + "\n");
    process.exitCode = 1;
  } finally {
    working.stop();
  }
}
