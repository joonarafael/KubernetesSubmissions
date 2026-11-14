import { createServer } from 'node:http';

const DEFAULT_PORT = 8080;
const MAX_PORT = 65_535;
const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;
const PINGPONG_PATH = '/pingpong';
const REQUEST_INCREMENT = 1;

let requestCount = 0;

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

function nextPong(): string {
    const count = requestCount;
    requestCount += REQUEST_INCREMENT;
    return `pong ${count}`;
}

const port = parsePort(process.env.PORT);

const server = createServer((request, response) => {
    if (request.method === 'GET' && requestPath(request.url) === PINGPONG_PATH) {
        response.writeHead(HTTP_OK, { 'content-type': 'text/plain; charset=utf-8' });
        response.end(`${nextPong()}\n`);
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
    server.close();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
