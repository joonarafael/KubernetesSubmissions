const DEFAULT_LOG_FILE = '/usr/src/app/files/log.txt';

export function logFilePath(value: string | undefined): string {
    if (typeof value !== 'string' || value === '') {
        return DEFAULT_LOG_FILE;
    }

    return value;
}
