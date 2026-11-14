import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const intervalMs = 5000;
const randomString = randomUUID();

const DEFAULT_PORT = 8080;
const MAX_PORT = 65_535;
const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;

function statusLine(now = new Date()): string {
    return `${now.toISOString()}: ${randomString}`;
}

function logLine(): void {
    console.log(statusLine());
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

logLine();
const timer = setInterval(logLine, intervalMs);

const port = parsePort(process.env.PORT);

const server = createServer((request, response) => {
    if (request.method === 'GET' && requestPath(request.url) === '/') {
        response.writeHead(HTTP_OK, { 'content-type': 'text/plain; charset=utf-8' });
        response.end(`${statusLine()}\n`);
        return;
    }

    response.writeHead(HTTP_NOT_FOUND, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found\n');
});

server.listen(port, '0.0.0.0', () => {
    const address = server.address();
    let boundPort = port;
    if (typeof address === 'object' && address !== null) {
        boundPort = address.port;
    }
    console.log(`Server started in port ${boundPort}`);
});

function shutdown(): void {
    clearInterval(timer);
    server.close();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
