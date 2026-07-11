import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface RepoStatus {
  name: string;
  branch: string;
  dirtyFiles: number;
  lastCommit: string;
}

const MAX_REPOS = 30;
const GIT_TIMEOUT_MS = 5000;

async function git(repoPath: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", ["-C", repoPath, ...args], {
    timeout: GIT_TIMEOUT_MS,
  });
  return stdout.trim();
}

async function inspectRepo(repoPath: string, name: string): Promise<RepoStatus | null> {
  try {
    const [status, branch, lastCommit] = await Promise.all([
      git(repoPath, ["status", "--porcelain"]),
      git(repoPath, ["branch", "--show-current"]),
      git(repoPath, ["log", "-1", "--format=%cr"]),
    ]);
    const dirtyFiles = status.length === 0 ? 0 : status.split("\n").length;
    return {
      name,
      branch: branch.length > 0 ? branch : "(detached)",
      dirtyFiles,
      lastCommit: lastCommit.length > 0 ? lastCommit : "no commits yet",
    };
  } catch {
    return null;
  }
}

/** Scans one level of `projectsDir` for git repos. Broken repos are skipped. */
export async function scanProjects(projectsDir: string): Promise<RepoStatus[]> {
  let entries: string[];
  try {
    entries = await readdir(projectsDir);
  } catch {
    return [];
  }

  const candidates = entries.filter((entry) => !entry.startsWith("."));
  const repoChecks = candidates.map(async (entry) => {
    const repoPath = join(projectsDir, entry);
    try {
      const [dirStat, gitStat] = await Promise.all([
        stat(repoPath),
        stat(join(repoPath, ".git")),
      ]);
      if (!dirStat.isDirectory() || !gitStat.isDirectory()) return null;
    } catch {
      return null;
    }
    return inspectRepo(repoPath, entry);
  });

  const results = await Promise.all(repoChecks);
  return results
    .filter((repo): repo is RepoStatus => repo !== null)
    .slice(0, MAX_REPOS);
}

export function formatRepoSummary(repos: RepoStatus[]): string {
  if (repos.length === 0) {
    return "No git repositories found.";
  }
  const lines = repos.map((repo) => {
    const dirty = repo.dirtyFiles > 0 ? `${repo.dirtyFiles} uncommitted change(s)` : "clean";
    return `- ${repo.name} [${repo.branch}] — ${dirty}, last commit ${repo.lastCommit}`;
  });
  return lines.join("\n");
}
