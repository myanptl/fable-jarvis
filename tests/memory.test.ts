import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addMemory, listMemories, forgetMemory } from "../src/core/memory.js";

let tempHome: string;

beforeEach(async () => {
  tempHome = await mkdtemp(join(tmpdir(), "jarvis-test-"));
  process.env.JARVIS_HOME = tempHome;
});

afterEach(async () => {
  delete process.env.JARVIS_HOME;
  await rm(tempHome, { recursive: true, force: true });
});

describe("memory", () => {
  test("starts empty", async () => {
    expect(await listMemories()).toEqual([]);
  });

  test("saves and lists memories in order", async () => {
    await addMemory("demo on Friday");
    await addMemory("prefers dark roast");
    const memories = await listMemories();
    expect(memories.map((memory) => memory.text)).toEqual([
      "demo on Friday",
      "prefers dark roast",
    ]);
    expect(memories[0]?.id).toBeTruthy();
    expect(memories[0]?.createdAt).toBeTruthy();
  });

  test("trims whitespace and rejects empty text", async () => {
    const memory = await addMemory("  spaced out  ");
    expect(memory.text).toBe("spaced out");
    await expect(addMemory("   ")).rejects.toThrow();
  });

  test("forgets a memory by id", async () => {
    const memory = await addMemory("temporary thought");
    expect(await forgetMemory(memory.id)).toBe(true);
    expect(await listMemories()).toEqual([]);
    expect(await forgetMemory("nonexistent-id")).toBe(false);
  });
});
