/**
 * Terminal styling with zero dependencies.
 * Accent color is amber/gold — arc-reactor energy without the cliché blue.
 */

const supportsColor = process.stdout.isTTY && process.env.NO_COLOR === undefined;

const wrap = (open: string, close: string) => (text: string) =>
  supportsColor ? `${open}${text}${close}` : text;

export const gold = wrap("\x1b[38;5;214m", "\x1b[0m");
export const dim = wrap("\x1b[2m", "\x1b[0m");
export const bold = wrap("\x1b[1m", "\x1b[0m");
export const red = wrap("\x1b[31m", "\x1b[0m");
export const green = wrap("\x1b[32m", "\x1b[0m");

export const JARVIS_PREFIX = gold(bold("◈ JARVIS"));

export function banner(): string {
  return [
    gold("     ◈ ◈ ◈"),
    gold(bold("  J A R V I S")),
    dim("  At your service."),
    "",
  ].join("\n");
}

const SPINNER_FRAMES = ["◐", "◓", "◑", "◒"];
const SPINNER_INTERVAL_MS = 120;

export interface Spinner {
  stop: () => void;
}

/** Animated spinner on stderr so piped stdout stays clean. */
export function spinner(label: string): Spinner {
  if (!process.stderr.isTTY) {
    return { stop: () => {} };
  }
  let frame = 0;
  const timer = setInterval(() => {
    const glyph = SPINNER_FRAMES[frame % SPINNER_FRAMES.length];
    process.stderr.write(`\r${gold(glyph ?? "◐")} ${dim(label)}   `);
    frame += 1;
  }, SPINNER_INTERVAL_MS);
  return {
    stop: () => {
      clearInterval(timer);
      process.stderr.write("\r\x1b[2K");
    },
  };
}

export function errorLine(message: string): void {
  process.stderr.write(`${red("✖")} ${message}\n`);
}
