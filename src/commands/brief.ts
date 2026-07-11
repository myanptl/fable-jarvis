import { query, isAuthError, AUTH_HELP } from "../core/agent.js";
import { loadConfig } from "../core/config.js";
import { listMemories } from "../core/memory.js";
import { scanProjects, formatRepoSummary } from "../collectors/git.js";
import { getWeather, formatWeather } from "../collectors/weather.js";
import { buildPersona, buildBriefPrompt } from "../core/persona.js";
import { gold, dim, bold, errorLine, spinner } from "../ui.js";

export async function runBrief(raw: boolean): Promise<void> {
  const config = await loadConfig();
  if (!config) {
    errorLine("Not set up yet. Run `jarvis init` first — it takes 30 seconds.");
    process.exitCode = 1;
    return;
  }

  const working = spinner("gathering intel…");
  const [weather, repos, memories] = await Promise.all([
    config.latitude !== undefined && config.longitude !== undefined
      ? getWeather(config.latitude, config.longitude)
      : Promise.resolve(null),
    scanProjects(config.projectsDir),
    listMemories(),
  ]);
  working.stop();

  const data = {
    weather: weather ? formatWeather(weather, config.city) : null,
    repos: formatRepoSummary(repos),
    memories: memories.map((memory) => memory.text),
  };

  if (raw) {
    process.stdout.write(`${bold("Weather:")} ${data.weather ?? "unavailable"}\n\n`);
    process.stdout.write(`${bold("Projects:")}\n${data.repos}\n\n`);
    process.stdout.write(
      `${bold("Reminders:")}\n${data.memories.length > 0 ? data.memories.map((memory) => `- ${memory}`).join("\n") : "none"}\n`,
    );
    return;
  }

  const composing = spinner("composing your briefing…");
  try {
    for await (const message of query({
      prompt: buildBriefPrompt(config, data),
      options: {
        systemPrompt: buildPersona(config),
        allowedTools: [],
        maxTurns: 1,
        ...(config.model ? { model: config.model } : {}),
      },
    })) {
      if (message.type === "result" && message.subtype === "success") {
        composing.stop();
        process.stdout.write(`\n${gold("◈ Daily Briefing")}\n\n${message.result.trim()}\n\n`);
      }
    }
  } catch (error) {
    composing.stop();
    const description = error instanceof Error ? error.message : String(error);
    errorLine(description);
    if (isAuthError(description)) process.stderr.write(AUTH_HELP + "\n");
    process.stdout.write(dim("\nHere is the raw briefing instead:\n\n"));
    process.stdout.write(`${data.weather ?? "Weather unavailable"}\n\n${data.repos}\n`);
    process.exitCode = 1;
  } finally {
    composing.stop();
  }
}
