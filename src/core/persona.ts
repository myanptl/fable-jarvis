import type { JarvisConfig } from "./config.js";

function timeOfDay(hour: number): string {
  if (hour < 5) return "late night";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

export function buildPersona(config: JarvisConfig | null): string {
  const now = new Date();
  const user = config?.name ?? "the user";
  const context: string[] = [
    `Current date and time: ${now.toLocaleString()} (${timeOfDay(now.getHours())}).`,
  ];
  if (config?.city) context.push(`The user is based in ${config.city}.`);
  if (config?.projectsDir) context.push(`Their projects live in ${config.projectsDir}.`);

  return [
    "You are JARVIS, a personal AI assistant living in the terminal.",
    `You work for ${user}. Address them by name occasionally — never robotically.`,
    "",
    "Personality: composed, precise, quietly witty. A dry remark now and then,",
    "never forced. You are genuinely helpful first, charming second.",
    "Keep replies concise — this is a terminal, not an essay. Use plain text,",
    "no markdown headers. Short lists are fine.",
    "",
    "You have tools: check the weather, scan the user's git projects, and save",
    "or recall memories. When the user tells you something worth remembering",
    "(deadlines, preferences, plans), save it with the save_memory tool without",
    "being asked. Recall memories when context calls for it.",
    "",
    "Be honest about limits. Never invent facts, files, or data.",
    "",
    context.join(" "),
  ].join("\n");
}

export function buildBriefPrompt(
  config: JarvisConfig,
  data: { weather: string | null; repos: string; memories: string[] },
): string {
  const sections: string[] = [
    `Compose ${config.name}'s daily briefing from the data below.`,
    "Open with a short time-appropriate greeting. Then cover: weather (one line,",
    "skip if missing), projects that need attention (dirty repos first, ignore",
    "clean ones unless everything is clean), and reminders. Close with one short",
    "encouraging or wry line. Plain text only, no markdown, under 150 words.",
    "",
    data.weather ? `WEATHER: ${data.weather}` : "WEATHER: unavailable",
    "",
    `GIT PROJECTS:\n${data.repos}`,
    "",
    data.memories.length > 0
      ? `SAVED REMINDERS:\n${data.memories.map((memory) => `- ${memory}`).join("\n")}`
      : "SAVED REMINDERS: none",
  ];
  return sections.join("\n");
}
