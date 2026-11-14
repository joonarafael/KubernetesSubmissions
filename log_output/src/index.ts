import { randomUUID } from "node:crypto";

const intervalMs = 5000;
const randomString = randomUUID();

function logLine(): void {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp}: ${randomString}`);
}

logLine();
const timer = setInterval(logLine, intervalMs);

function shutdown(): void {
  clearInterval(timer);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
