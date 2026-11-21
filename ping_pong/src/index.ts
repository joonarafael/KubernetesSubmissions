import { type IncomingMessage, type ServerResponse, createServer } from 'node:http';

const DEFAULT_PORT = 8080;
const MAX_PORT = 65_535;
const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;
const PINGPONG_PATH = '/pingpong';
const PINGS_PATH = '/pings';
const INITIAL_PING_COUNT = 0;
const REQUEST_INCREMENT = 1;

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

const port = parsePort(process.env.PORT);

let requestCount = INITIAL_PING_COUNT;

function recordPing(): string {
    const responseCount = requestCount;
    requestCount += REQUEST_INCREMENT;

    return `pong ${responseCount}`;
}

function sendText(response: ServerResponse, status: number, body: string): void {
    response.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(body);
}

function handleGet(response: ServerResponse, pathName: string): void {
    if (pathName === PINGS_PATH) {
        sendText(response, HTTP_OK, `${requestCount}\n`);

        return;
    }

    if (pathName === PINGPONG_PATH) {
        sendText(response, HTTP_OK, `${recordPing()}\n`);

        return;
    }

    sendText(response, HTTP_NOT_FOUND, 'Not found\n');
}

function handleRequest(request: IncomingMessage, response: ServerResponse): void {
    if (request.method !== 'GET') {
        sendText(response, HTTP_NOT_FOUND, 'Not found\n');

        return;
    }

    handleGet(response, requestPath(request.url));
}

const server = createServer(handleRequest);

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
