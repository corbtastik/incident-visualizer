import fs from "node:fs";
import path from "node:path";

// Temporary diagnostic logging for the OrbitAI tool loop.
//
// start-all.sh runs four services into one terminal, so anything written to
// stdout is interleaved with simulator, visualizer and Vite output and is
// effectively unreadable. Tool traffic goes to its own file instead, where it
// can be tailed on its own.
//
// Remove this once the MCP session behaviour is settled.

const LOG_PATH =
  process.env.ORBIT_LOG_FILE ??
  path.resolve(process.cwd(), "logs", "orbit.log");

let stream = null;

function getStream() {
  if (stream) return stream;
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  stream = fs.createWriteStream(LOG_PATH, { flags: "a" });
  stream.write(`\n===== visualizer started ${new Date().toISOString()} =====\n`);
  return stream;
}

export const orbitLogPath = () => LOG_PATH;

export function orbitLog(...parts) {
  const line = `${new Date().toISOString()} ${parts.join(" ")}\n`;
  try {
    getStream().write(line);
  } catch {
    // A logging failure must never take down a chat turn.
  }
}
