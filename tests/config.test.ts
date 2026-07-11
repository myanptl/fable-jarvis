import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig, saveConfig, jarvisDir } from "../src/core/config.js";

let tempHome: string;

beforeEach(async () => {
  tempHome = await mkdtemp(join(tmpdir(), "jarvis-test-"));
  process.env.JARVIS_HOME = tempHome;
});

afterEach(async () => {
  delete process.env.JARVIS_HOME;
  await rm(tempHome, { recursive: true, force: true });
});

describe("config", () => {
  test("returns null when no config exists", async () => {
    expect(await loadConfig()).toBeNull();
  });

  test("round-trips a valid config", async () => {
    const config = {
      name: "Myan",
      city: "Westford, Massachusetts",
      latitude: 42.58,
      longitude: -71.44,
      projectsDir: "/tmp/projects",
    };
    await saveConfig(config);
    expect(await loadConfig()).toEqual(config);
  });

  test("returns null for corrupted config file", async () => {
    await mkdir(jarvisDir(), { recursive: true });
    await writeFile(join(jarvisDir(), "config.json"), "not json at all", "utf8");
    expect(await loadConfig()).toBeNull();
  });

  test("returns null for config failing schema validation", async () => {
    await mkdir(jarvisDir(), { recursive: true });
    await writeFile(
      join(jarvisDir(), "config.json"),
      JSON.stringify({ name: "", projectsDir: "" }),
      "utf8",
    );
    expect(await loadConfig()).toBeNull();
  });

  test("rejects out-of-range coordinates on save", async () => {
    await expect(
      saveConfig({ name: "Myan", projectsDir: "/tmp", latitude: 999, longitude: 0 }),
    ).rejects.toThrow();
  });
});
