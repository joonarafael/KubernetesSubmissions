import { createServer } from 'node:http';

const DEFAULT_PORT = 8080;
const MAX_PORT = 65_535;
const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;

const INDEX_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Todo</title>
<style>
  body {
    margin: 2rem;
    background: #ffffff;
    color: #1a1a1a;
    font-family: sans-serif;
  }
</style>
</head>
<body>
<main>
<h1>Todo</h1>
<p>Hello there!</p>
</main>
</body>
</html>
`;

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

const server = createServer((request, response) => {
    if (request.method === 'GET' && requestPath(request.url) === '/') {
        response.writeHead(HTTP_OK, { 'content-type': 'text/html; charset=utf-8' });
        response.end(INDEX_PAGE);
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
