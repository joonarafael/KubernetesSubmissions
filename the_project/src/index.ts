import { type CachedImage, imageDirectory, imageMaxAgeMs } from './image-file.js';
import { type IncomingMessage, type Server, type ServerResponse, createServer } from 'node:http';
import { cacheErrorMessage, createImageCache, pictureUrl } from './image-cache.js';

const DEFAULT_PORT = 8080;
const MAX_PORT = 65_535;
const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_SERVER_ERROR = 500;
const IMAGE_PATH = '/image';
const SHUTDOWN_PATH = '/shutdown';
const SHUTDOWN_EXIT_DELAY_MS = 1000;
const TODO_MAX_LENGTH = 140;

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

const INDEX_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Todo App</title>
<style>
  body {
    margin: 2rem;
    background: #ffffff;
    color: #1a1a1a;
    font-family: sans-serif;
    text-align: center;
  }
  img {
    display: block;
    margin: 1.5rem auto;
    width: min(100%, 18rem);
    height: auto;
    border-radius: 0.75rem;
    box-shadow: 0 0.5rem 1.5rem rgb(0 0 0 / 16%);
  }
  .todo-form {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 0.75rem;
    max-width: 36rem;
    margin: 1.75rem auto 0;
  }
  .todo-form input {
    flex: 1 1 16rem;
    min-width: 0;
    padding: 0.65rem 0.8rem;
    border: 2px solid #43a047;
    border-radius: 0.4rem;
    background: #ffffff;
    color: inherit;
    font: inherit;
  }
  .todo-form button {
    padding: 0.65rem 1.3rem;
    border: 0;
    border-radius: 0.4rem;
    background: #43a047;
    color: #ffffff;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
  .todos {
    max-width: 40rem;
    margin: 0.5rem auto 0;
    padding: 0;
    list-style: none;
    text-align: left;
  }
  .todos li {
    margin: 0.75rem 0;
    padding: 1rem 1.1rem;
    background: #f7f7f7;
    border-left: 4px solid #43a047;
    border-radius: 0.35rem;
    box-shadow: 0 1px 2px rgb(0 0 0 / 8%);
  }
  .course {
    margin-top: 2.5rem;
  }
  .shutdown {
    margin-top: 2rem;
  }
</style>
</head>
<body>
<main>
<h1>Todo App</h1>
<img src="/image" alt="Hourly picture" width="288">
<div class="todo-form">
<input id="todo" type="text" maxlength="${TODO_MAX_LENGTH}" placeholder="Enter a new todo (max ${TODO_MAX_LENGTH} characters)" aria-label="New todo" autocomplete="off">
<button type="button">Send</button>
</div>
<h2>Todos</h2>
<ul class="todos">
<li>Learn Kubernetes basics</li>
<li>Deploy application to cluster</li>
<li>Configure persistent volumes</li>
</ul>
<p class="course">DevOps with Kubernetes 2026</p>
<form action="/shutdown" method="post">
<button class="shutdown" type="submit">Shut down</button>
</form>
</main>
</body>
</html>
`;

function sendText(response: ServerResponse, status: number, body: string): void {
    response.writeHead(status, {
        'cache-control': 'no-store',
        'content-type': 'text/plain; charset=utf-8',
    });
    response.end(body);
}

function sendPage(response: ServerResponse): void {
    response.writeHead(HTTP_OK, {
        'cache-control': 'no-store',
        'content-type': 'text/html; charset=utf-8',
    });
    response.end(INDEX_PAGE);
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

function handleGet(response: ServerResponse, pathName: string): boolean {
    if (pathName === '/') {
        sendPage(response);

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
    console.log(`Server started in port ${boundPort}`);
});

process.on('SIGTERM', stopProcess);
process.on('SIGINT', stopProcess);
