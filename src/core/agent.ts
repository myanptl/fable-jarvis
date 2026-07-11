import { query, tool, createSdkMcpServer, type Options } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import type { JarvisConfig } from "./config.js";
import { addMemory, listMemories } from "./memory.js";
import { scanProjects, formatRepoSummary } from "../collectors/git.js";
import { geocodeCity, getWeather, formatWeather } from "../collectors/weather.js";
import { buildPersona } from "./persona.js";

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function buildJarvisTools(config: JarvisConfig | null) {
  return createSdkMcpServer({
    name: "jarvis",
    version: "1.0.0",
    tools: [
      tool(
        "save_memory",
        "Save something worth remembering about the user (deadlines, preferences, plans).",
        { text: z.string().min(1).describe("The fact or reminder to save") },
        async (args) => {
          const memory = await addMemory(args.text);
          return textResult(`Saved: "${memory.text}"`);
        },
      ),
      tool(
        "list_memories",
        "List everything previously saved about the user.",
        {},
        async () => {
          const memories = await listMemories();
          if (memories.length === 0) return textResult("No memories saved yet.");
          const lines = memories.map(
            (memory) => `- ${memory.text} (saved ${memory.createdAt.slice(0, 10)})`,
          );
          return textResult(lines.join("\n"));
        },
      ),
      tool(
        "scan_projects",
        "Scan the user's projects folder for git repos: branch, uncommitted changes, last commit.",
        {},
        async () => {
          if (!config?.projectsDir) {
            return textResult("No projects folder configured. The user should run `jarvis init`.");
          }
          const repos = await scanProjects(config.projectsDir);
          return textResult(formatRepoSummary(repos));
        },
      ),
      tool(
        "get_weather",
        "Get current weather. Uses the user's configured city unless another city is given.",
        { city: z.string().optional().describe("Optional city, defaults to the user's city") },
        async (args) => {
          let latitude = config?.latitude;
          let longitude = config?.longitude;
          let cityName = config?.city;
          if (args.city) {
            const geo = await geocodeCity(args.city);
            if (!geo) return textResult(`Could not find a city named "${args.city}".`);
            ({ latitude, longitude } = geo);
            cityName = geo.city;
          }
          if (latitude === undefined || longitude === undefined) {
            return textResult("No city configured. The user should run `jarvis init`.");
          }
          const weather = await getWeather(latitude, longitude);
          if (!weather) return textResult("Weather service is unreachable right now.");
          return textResult(formatWeather(weather, cityName));
        },
      ),
    ],
  });
}

const READ_ONLY_TOOLS = ["Read", "Glob", "Grep"];
const JARVIS_TOOLS = [
  "mcp__jarvis__save_memory",
  "mcp__jarvis__list_memories",
  "mcp__jarvis__scan_projects",
  "mcp__jarvis__get_weather",
];

export function agentOptions(config: JarvisConfig | null, overrides: Partial<Options> = {}): Options {
  return {
    systemPrompt: buildPersona(config),
    mcpServers: { jarvis: buildJarvisTools(config) },
    allowedTools: [...READ_ONLY_TOOLS, ...JARVIS_TOOLS],
    disallowedTools: ["Bash", "Write", "Edit", "NotebookEdit", "WebFetch", "WebSearch"],
    ...(config?.model ? { model: config.model } : {}),
    ...overrides,
  };
}

export { query };

export function isAuthError(message: string): boolean {
  const lowered = message.toLowerCase();
  return (
    lowered.includes("api key") ||
    lowered.includes("authentication") ||
    lowered.includes("not logged in") ||
    lowered.includes("login")
  );
}

export const AUTH_HELP = [
  "Jarvis needs a way to reach Claude. Either:",
  "  1. Install Claude Code and log in:  npm i -g @anthropic-ai/claude-code && claude",
  "  2. Or set an API key:               export ANTHROPIC_API_KEY=sk-ant-...",
].join("\n");
