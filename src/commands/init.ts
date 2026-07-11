import { createInterface } from "node:readline/promises";
import { homedir } from "node:os";
import { stat } from "node:fs/promises";
import { saveConfig, loadConfig, type JarvisConfig } from "../core/config.js";
import { geocodeCity } from "../collectors/weather.js";
import { banner, gold, dim, green, errorLine } from "../ui.js";

export async function runInit(): Promise<void> {
  process.stdout.write(banner());
  process.stdout.write(dim("  Thirty seconds of setup, then I handle the rest.\n\n"));

  const existing = await loadConfig();
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    const namePrompt = existing?.name ? `Your name (${existing.name}): ` : "Your name: ";
    const nameAnswer = (await rl.question(gold(namePrompt))).trim();
    const name = nameAnswer.length > 0 ? nameAnswer : (existing?.name ?? "");
    if (name.length === 0) {
      errorLine("I need a name to work with.");
      process.exitCode = 1;
      return;
    }

    const cityAnswer = (
      await rl.question(gold(`Your city, for weather (${existing?.city ?? "skip with Enter"}): `))
    ).trim();
    let city = existing?.city;
    let latitude = existing?.latitude;
    let longitude = existing?.longitude;
    if (cityAnswer.length > 0) {
      const geo = await geocodeCity(cityAnswer);
      if (geo) {
        city = geo.city;
        latitude = geo.latitude;
        longitude = geo.longitude;
        process.stdout.write(dim(`  Found ${geo.city}.\n`));
      } else {
        process.stdout.write(dim("  Could not find that city — skipping weather.\n"));
      }
    }

    const defaultProjects = existing?.projectsDir ?? `${homedir()}/workspace`;
    const projectsAnswer = (
      await rl.question(gold(`Your projects folder (${defaultProjects}): `))
    ).trim();
    const projectsDir = projectsAnswer.length > 0 ? projectsAnswer : defaultProjects;
    try {
      const dirStat = await stat(projectsDir);
      if (!dirStat.isDirectory()) throw new Error("not a directory");
    } catch {
      process.stdout.write(dim(`  Heads up: ${projectsDir} does not exist yet.\n`));
    }

    const config: JarvisConfig = {
      name,
      projectsDir,
      ...(city ? { city } : {}),
      ...(latitude !== undefined ? { latitude } : {}),
      ...(longitude !== undefined ? { longitude } : {}),
      ...(existing?.model ? { model: existing.model } : {}),
    };
    await saveConfig(config);

    process.stdout.write(`\n${green("✔")} Configured. Stored in ~/.jarvis/config.json\n\n`);
    process.stdout.write(`  ${gold("jarvis")}          start a conversation\n`);
    process.stdout.write(`  ${gold("jarvis brief")}    your daily briefing\n`);
    process.stdout.write(`  ${gold('jarvis "..."')}     quick one-shot question\n\n`);
    process.stdout.write(
      dim("  Jarvis uses your Claude Code login if you have one, or ANTHROPIC_API_KEY.\n"),
    );
  } finally {
    rl.close();
  }
}
