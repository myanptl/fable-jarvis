import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { scanProjects, formatRepoSummary } from "../src/collectors/git.js";

const execFileAsync = promisify(execFile);
let projectsDir: string;

async function git(cwd: string, args: string[]): Promise<void> {
  await execFileAsync("git", ["-C", cwd, ...args]);
}

beforeAll(async () => {
  projectsDir = await mkdtemp(join(tmpdir(), "jarvis-git-test-"));

  const cleanRepo = join(projectsDir, "clean-repo");
  await mkdir(cleanRepo);
  await git(cleanRepo, ["init", "-b", "main"]);
  await git(cleanRepo, ["config", "user.email", "test@test.dev"]);
  await git(cleanRepo, ["config", "user.name", "Test"]);
  await writeFile(join(cleanRepo, "a.txt"), "hello");
  await git(cleanRepo, ["add", "."]);
  await git(cleanRepo, ["commit", "-m", "init"]);

  const dirtyRepo = join(projectsDir, "dirty-repo");
  await mkdir(dirtyRepo);
  await git(dirtyRepo, ["init", "-b", "main"]);
  await git(dirtyRepo, ["config", "user.email", "test@test.dev"]);
  await git(dirtyRepo, ["config", "user.name", "Test"]);
  await writeFile(join(dirtyRepo, "a.txt"), "hello");
  await git(dirtyRepo, ["add", "."]);
  await git(dirtyRepo, ["commit", "-m", "init"]);
  await writeFile(join(dirtyRepo, "b.txt"), "uncommitted");
  await writeFile(join(dirtyRepo, "c.txt"), "also uncommitted");

  await mkdir(join(projectsDir, "not-a-repo"));
});

afterAll(async () => {
  await rm(projectsDir, { recursive: true, force: true });
});

describe("git collector", () => {
  test("finds repos and reports dirty state", async () => {
    const repos = await scanProjects(projectsDir);
    const names = repos.map((repo) => repo.name).sort();
    expect(names).toEqual(["clean-repo", "dirty-repo"]);

    const clean = repos.find((repo) => repo.name === "clean-repo");
    const dirty = repos.find((repo) => repo.name === "dirty-repo");
    expect(clean?.dirtyFiles).toBe(0);
    expect(clean?.branch).toBe("main");
    expect(dirty?.dirtyFiles).toBe(2);
  });

  test("returns empty array for missing directory", async () => {
    expect(await scanProjects("/definitely/not/a/real/path")).toEqual([]);
  });

  test("formats a readable summary", async () => {
    const summary = formatRepoSummary([
      { name: "app", branch: "main", dirtyFiles: 3, lastCommit: "2 hours ago" },
    ]);
    expect(summary).toContain("app");
    expect(summary).toContain("3 uncommitted change(s)");
    expect(formatRepoSummary([])).toBe("No git repositories found.");
  });
});
