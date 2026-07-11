import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

export const configSchema = z.object({
  name: z.string().min(1),
  city: z.string().min(1).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  projectsDir: z.string().min(1),
  model: z.string().min(1).optional(),
});

export type JarvisConfig = z.infer<typeof configSchema>;

export function jarvisDir(): string {
  return process.env.JARVIS_HOME ?? join(homedir(), ".jarvis");
}

function configPath(): string {
  return join(jarvisDir(), "config.json");
}

/** Returns the validated config, or null when not initialized / invalid. */
export async function loadConfig(): Promise<JarvisConfig | null> {
  try {
    const raw = await readFile(configPath(), "utf8");
    const parsed = configSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function saveConfig(config: JarvisConfig): Promise<void> {
  const validated = configSchema.parse(config);
  await mkdir(jarvisDir(), { recursive: true });
  await writeFile(configPath(), JSON.stringify(validated, null, 2) + "\n", "utf8");
}
