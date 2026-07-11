import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { jarvisDir } from "./config.js";

const memorySchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  createdAt: z.string(),
});

export type Memory = z.infer<typeof memorySchema>;

const MAX_MEMORIES = 200;

function memoryPath(): string {
  return join(jarvisDir(), "memory.json");
}

export async function listMemories(): Promise<Memory[]> {
  try {
    const raw = await readFile(memoryPath(), "utf8");
    const parsed = z.array(memorySchema).safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export async function addMemory(text: string): Promise<Memory> {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    throw new Error("Cannot save an empty memory.");
  }
  const memory: Memory = {
    id: randomUUID(),
    text: trimmed,
    createdAt: new Date().toISOString(),
  };
  const existing = await listMemories();
  const next = [...existing, memory].slice(-MAX_MEMORIES);
  await mkdir(jarvisDir(), { recursive: true });
  await writeFile(memoryPath(), JSON.stringify(next, null, 2) + "\n", "utf8");
  return memory;
}

export async function forgetMemory(id: string): Promise<boolean> {
  const existing = await listMemories();
  const next = existing.filter((memory) => memory.id !== id);
  if (next.length === existing.length) {
    return false;
  }
  await writeFile(memoryPath(), JSON.stringify(next, null, 2) + "\n", "utf8");
  return true;
}
