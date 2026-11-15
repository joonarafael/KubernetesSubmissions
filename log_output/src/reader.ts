import { pingFilePath, readPingCount } from './ping-file.js';
import { createServer } from 'node:http';
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
const pingPath = pingFilePath(process.env.PING_FILE);

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

const server = createServer((request, response) => {
    if (request.method !== 'GET' || requestPath(request.url) !== '/') {
        response.writeHead(HTTP_NOT_FOUND, { 'content-type': 'text/plain; charset=utf-8' });
        response.end('Not found\n');

        return;
    }

    readFile(filePath, 'utf8')
        .then((content) =>
            readPingCount(pingPath).then((pingCount) => {
                response.writeHead(HTTP_OK, { 'content-type': 'text/plain; charset=utf-8' });
                response.end(statusResponse(content, pingCount));
            }),
        )
        .catch((error: unknown) => {
            if (isFileNotFound(error)) {
                response.writeHead(HTTP_SERVICE_UNAVAILABLE, {
                    'content-type': 'text/plain; charset=utf-8',
                });
                response.end('Log file is not available yet\n');
                return;
            }

            response.writeHead(HTTP_INTERNAL_SERVER_ERROR, {
                'content-type': 'text/plain; charset=utf-8',
            });
            response.end('Failed to read log file\n');
        });
});

server.listen(port, '0.0.0.0', () => {
    const address = server.address();
    let boundPort = port;

    if (typeof address === 'object' && address !== null) {
        boundPort = address.port;
    }

    console.log(`Reading log file ${filePath}`);
    console.log(`Reading ping count ${pingPath}`);
    console.log(`Server started in port ${boundPort}`);
});

function shutdown(): void {
    server.close();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
