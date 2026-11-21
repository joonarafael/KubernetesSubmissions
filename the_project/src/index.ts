import { type CachedImage, imageDirectory, imageMaxAgeMs } from './image-file.js';
import { type IncomingMessage, type Server, type ServerResponse, createServer } from 'node:http';
import { cacheErrorMessage, createImageCache, pictureUrl } from './image-cache.js';
import { readTodos, todoBackendUrl, todoErrorMessage } from './todos.js';
import { renderIndexPage } from './page.js';

const DEFAULT_PORT = 8080;
const MAX_PORT = 65_535;
const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_SERVER_ERROR = 500;
const IMAGE_PATH = '/image';
const SHUTDOWN_PATH = '/shutdown';
const SHUTDOWN_EXIT_DELAY_MS = 1000;

function parsePort(value: string | undefined): number {
    if (typeof value !== 'string' || value === '') {
        return DEFAULT_PORT;
    }

    if (!/^\d{1,5}$/u.test(value)) {
        throw new Error(`Invalid PORT "${value}". Expected an integer from 0 to ${MAX_PORT}.`);
    }

    const parsedPort = Number(value);

    if (parsedPort > MAX_PORT) {
        throw new Error(`Invalid PORT "${value}". Expected an integer from 0 to ${MAX_PORT}.`);
    }

    return parsedPort;
}

function requestPath(url = '/'): string {
    try {
        return new URL(url, 'http://127.0.0.1').pathname;
    } catch {
        return '';
    }
}

function sendText(response: ServerResponse, status: number, body: string): void {
    response.writeHead(status, {
        'cache-control': 'no-store',
        'content-type': 'text/plain; charset=utf-8',
    });
    response.end(body);
}

function sendPage(response: ServerResponse, todos: readonly string[], unavailable: boolean): void {
    response.writeHead(HTTP_OK, {
        'cache-control': 'no-store',
        'content-type': 'text/html; charset=utf-8',
    });
    response.end(renderIndexPage(todos, unavailable));
}

function sendImage(response: ServerResponse, image: CachedImage): void {
    response.writeHead(HTTP_OK, {
        'cache-control': 'no-store',
        'content-type': image.contentType,
    });
    response.end(image.body);
}

function sendImageFailure(response: ServerResponse, error: unknown): void {
    console.log(`Failed to load picture: ${cacheErrorMessage(error)}`);
    sendText(response, HTTP_INTERNAL_SERVER_ERROR, 'Failed to load the picture\n');
}

const port = parsePort(process.env.PORT);
const todoUrl = todoBackendUrl(process.env.TODO_BACKEND_URL);

const imageDir = imageDirectory(process.env.IMAGE_DIR);
const imageMaxAge = imageMaxAgeMs(process.env.IMAGE_MAX_AGE_SECONDS);

const source = pictureUrl(process.env.PICTURE_URL);

const loadCachedImage = createImageCache(imageDir, imageMaxAge, source);

interface Runtime {
    server?: Server;
}

const runtime: Runtime = {};
let stopping = false;

function stopProcess(): void {
    if (stopping) {
        return;
    }

    stopping = true;

    const { server } = runtime;

    if (server) {
        server.close();
        server.closeAllConnections();
    }

    setTimeout(() => {
        throw new Error('Shutting down');
    }, SHUTDOWN_EXIT_DELAY_MS).unref();
}

function discardBody(request: IncomingMessage): void {
    request.resume();
}

function respondWithImage(
    response: ServerResponse,
    send: (response: ServerResponse, image: CachedImage) => void,
): void {
    loadCachedImage().then(
        (image) => {
            send(response, image);
        },
        (error: unknown) => {
            sendImageFailure(response, error);
        },
    );
}

function shutdown(request: IncomingMessage, response: ServerResponse): void {
    discardBody(request);
    sendText(response, HTTP_OK, 'Shutting down\n');
    response.on('finish', () => {
        stopProcess();
    });
}

function sendIndex(response: ServerResponse): void {
    readTodos(todoUrl).then(
        (todos) => {
            sendPage(response, todos, false);
        },
        (error: unknown) => {
            console.log(`Failed to read todos: ${todoErrorMessage(error)}`);
            sendPage(response, [], true);
        },
    );
}

function handleGet(response: ServerResponse, pathName: string): boolean {
    if (pathName === '/') {
        sendIndex(response);

        return true;
    }

    if (pathName === IMAGE_PATH) {
        respondWithImage(response, sendImage);

        return true;
    }

    return false;
}

function handleRequest(request: IncomingMessage, response: ServerResponse): void {
    const pathName = requestPath(request.url);

    if (request.method === 'GET' && handleGet(response, pathName)) {
        return;
    }

    if (request.method === 'POST' && pathName === SHUTDOWN_PATH) {
        shutdown(request, response);
        return;
    }

    sendText(response, HTTP_NOT_FOUND, 'Not found\n');
}

const server = createServer(handleRequest);

runtime.server = server;

server.listen(port, '0.0.0.0', () => {
    const address = server.address();
    let boundPort = port;

    if (typeof address === 'object' && address !== null) {
        boundPort = address.port;
    }

    console.log(`Picture cache ${imageDir}`);
    console.log(`Picture source ${source}`);
    console.log(`Picture max age ${imageMaxAge} ms`);
    console.log(`Todo backend ${todoUrl}`);
    console.log(`Server started in port ${boundPort}`);
});

process.on('SIGTERM', stopProcess);
process.on('SIGINT', stopProcess);
