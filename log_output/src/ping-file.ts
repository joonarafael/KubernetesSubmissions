import { readFile } from 'node:fs/promises';

const DEFAULT_PING_FILE = '/usr/src/app/files/pings.txt';
const FILE_NOT_FOUND = 'ENOENT';
const INITIAL_PING_COUNT = 0;

export function pingFilePath(value: string | undefined): string {
    if (typeof value !== 'string' || value === '') {
        return DEFAULT_PING_FILE;
    }

    return value;
}

function isFileNotFound(error: unknown): boolean {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === FILE_NOT_FOUND
    );
}

function parsePingCount(content: string): number {
    const trimmed = content.trim();

    if (trimmed === '') {
        return INITIAL_PING_COUNT;
    }

    if (!/^\d+$/u.test(trimmed)) {
        throw new Error(`Invalid ping count "${trimmed}"`);
    }

    return Number(trimmed);
}

export function readPingCount(filePath: string): Promise<number> {
    return readFile(filePath, 'utf8').then(
        (content) => parsePingCount(content),
        (error: unknown) => {
            if (isFileNotFound(error)) {
                return INITIAL_PING_COUNT;
            }

            throw error;
        },
    );
}
