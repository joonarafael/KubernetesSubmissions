import { createServer } from 'node:http';

const DEFAULT_PORT = 8080;
const MAX_PORT = 65_535;
const HTTP_OK = 200;

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

const port = parsePort(process.env.PORT);

const server = createServer((_request, response) => {
    response.writeHead(HTTP_OK, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('todo app\n');
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
