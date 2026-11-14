import { randomUUID } from "node:crypto";

const randomString = randomUUID();
const intervalMs = 5_000;

function logLine(): void {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp}: ${randomString}`);
}

logLine();
const timer = setInterval(logLine, intervalMs);

function shutdown(): void {
  clearInterval(timer);
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
