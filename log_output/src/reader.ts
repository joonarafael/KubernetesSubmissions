import { type IncomingMessage, type ServerResponse, createServer } from 'node:http';
import { isPingCountError, pingPongUrl, readPingCount } from './ping-count.js';
import { logFilePath } from './log-file.js';
import { readFile } from 'node:fs/promises';

const DEFAULT_PORT = 8080;
const MAX_PORT = 65_535;
const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_SERVER_ERROR = 500;
const HTTP_SERVICE_UNAVAILABLE = 503;
const FILE_NOT_FOUND = 'ENOENT';

const filePath = logFilePath(process.env.LOG_FILE);
const pingUrl = pingPongUrl(process.env.PING_PONG_URL);

function statusResponse(logContent: string, pingCount: number): string {
    return `${logContent.trim()}.\nPing / Pongs: ${pingCount}\n`;
}

function parsePort(value: string | undefined): number {
    if (typeof value !== 'string' || value === '') {
        return DEFAULT_PORT;
    }

    if (!/^\d{1,5}$/u.test(value)) {
        throw new Error(`Invalid PORT "${value}". Expected an integer from 0 to ${MAX_PORT}.`);
    }

    const port = Number(value);

    if (port > MAX_PORT) {
        throw new Error(`Invalid PORT "${value}". Expected an integer from 0 to ${MAX_PORT}.`);
    }

    return port;
}

function requestPath(url = '/'): string {
    try {
        return new URL(url, 'http://127.0.0.1').pathname;
    } catch {
        return '';
    }
}

function isFileNotFound(error: unknown): boolean {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === FILE_NOT_FOUND
    );
}

const port = parsePort(process.env.PORT);

function sendText(response: ServerResponse, status: number, body: string): void {
    response.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(body);
}

function sendReadError(response: ServerResponse, error: unknown): void {
    if (isFileNotFound(error)) {
        sendText(response, HTTP_SERVICE_UNAVAILABLE, 'Log file is not available yet\n');

        return;
    }

    if (isPingCountError(error)) {
        console.log(`Failed to read ping count: ${error.message}`);
        sendText(response, HTTP_SERVICE_UNAVAILABLE, 'Ping count is not available\n');

        return;
    }

    sendText(response, HTTP_INTERNAL_SERVER_ERROR, 'Failed to read log file\n');
}

function sendStatus(response: ServerResponse): void {
    readFile(filePath, 'utf8')
        .then((content) =>
            readPingCount(pingUrl).then((pingCount) => {
                sendText(response, HTTP_OK, statusResponse(content, pingCount));
            }),
        )
        .catch((error: unknown) => {
            sendReadError(response, error);
        });
}

function handleRequest(request: IncomingMessage, response: ServerResponse): void {
    if (request.method !== 'GET' || requestPath(request.url) !== '/') {
        sendText(response, HTTP_NOT_FOUND, 'Not found\n');

        return;
    }

    sendStatus(response);
}

const server = createServer(handleRequest);

server.listen(port, '0.0.0.0', () => {
    const address = server.address();
    let boundPort = port;

    if (typeof address === 'object' && address !== null) {
        boundPort = address.port;
    }

    console.log(`Reading log file ${filePath}`);
    console.log(`Reading ping count ${pingUrl}`);
    console.log(`Server started in port ${boundPort}`);
});

function shutdown(): void {
    server.close();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
