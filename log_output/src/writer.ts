import { mkdir, rename, writeFile } from 'node:fs/promises';
import { logFilePath } from './log-file.js';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const intervalMs = 5000;
const temporarySuffix = '.tmp';
const randomString = randomUUID();
const filePath = logFilePath(process.env.LOG_FILE);

function statusLine(now = new Date()): string {
    return `${now.toISOString()}: ${randomString}`;
}

function errorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return 'Unknown error';
}

function writeLog(): Promise<void> {
    const line = statusLine();
    const temporaryPath = `${filePath}${temporarySuffix}`;

    return writeFile(temporaryPath, `${line}\n`, 'utf8')
        .then(() => rename(temporaryPath, filePath))
        .then(() => {
            console.log(line);
        });
}

function scheduleWrite(): void {
    writeLog().catch((error: unknown) => {
        console.log(`Failed to write log file: ${errorMessage(error)}`);
    });
}

await mkdir(path.dirname(filePath), { recursive: true });
await writeLog();

const timer = setInterval(scheduleWrite, intervalMs);

function shutdown(): void {
    clearInterval(timer);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
