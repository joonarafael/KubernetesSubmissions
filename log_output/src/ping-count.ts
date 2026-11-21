const DEFAULT_PING_PONG_URL = 'http://ping-pong:8080/pings';
const FETCH_TIMEOUT_MS = 2000;
const PING_COUNT_ERROR = 'PingCountError';

export function pingPongUrl(value: string | undefined): string {
    if (typeof value !== 'string' || value === '') {
        return DEFAULT_PING_PONG_URL;
    }

    return value;
}

function parsePingCount(content: string): number {
    const trimmed = content.trim();

    if (!/^\d+$/u.test(trimmed)) {
        throw new Error(`Invalid ping count "${trimmed}"`);
    }

    return Number(trimmed);
}

function errorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return 'Unknown error';
}

export function isPingCountError(error: unknown): error is Error {
    return error instanceof Error && error.name === PING_COUNT_ERROR;
}

function asPingCountError(error: unknown): Error {
    const wrapped = new Error(errorMessage(error));
    wrapped.name = PING_COUNT_ERROR;

    return wrapped;
}

export function readPingCount(url: string): Promise<number> {
    return fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Ping pong responded with status ${response.status}`);
            }

            return response.text().then((body) => parsePingCount(body));
        })
        .catch((error: unknown) => {
            throw asPingCountError(error);
        });
}
