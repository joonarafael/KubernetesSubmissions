import { type IncomingMessage, type ServerResponse, createServer } from 'node:http';
import { type TodoItem, addTodo, isTodoInputError, listTodos, todoInputError } from './todos.js';
import { readBody } from './body.js';

const DEFAULT_PORT = 8080;
const MAX_PORT = 65_535;
const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_SEE_OTHER = 303;
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_SERVER_ERROR = 500;
const TODOS_PATH = '/todos';
const JSON_MEDIA_TYPE = 'application/json';
const FORM_MEDIA_TYPE = 'application/x-www-form-urlencoded';
const HEADER_SEPARATOR = ';';
const HEADER_START = 0;

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

function mediaType(header: string | undefined): string {
    if (typeof header !== 'string' || header === '') {
        return '';
    }

    const separatorIndex = header.indexOf(HEADER_SEPARATOR);
    let raw = header;

    if (separatorIndex >= HEADER_START) {
        raw = header.slice(HEADER_START, separatorIndex);
    }

    return raw.trim().toLowerCase();
}

function errorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return 'Unknown error';
}

function isTodoBody(value: unknown): value is { todo: unknown } {
    return typeof value === 'object' && value !== null && 'todo' in value;
}

function parseJson(body: string): unknown {
    try {
        return JSON.parse(body) as unknown;
    } catch {
        throw todoInputError('Invalid request body');
    }
}

function todoTextFromJson(body: string): string {
    const value = parseJson(body);

    if (!isTodoBody(value) || typeof value.todo !== 'string') {
        throw todoInputError('Invalid request body');
    }

    return value.todo;
}

function todoTextFromForm(body: string): string {
    const todo = new URLSearchParams(body).get('todo');

    if (todo === null) {
        throw todoInputError('Invalid request body');
    }

    return todo;
}

function todoText(contentType: string | undefined, body: string): string {
    const type = mediaType(contentType);

    if (type === JSON_MEDIA_TYPE) {
        return todoTextFromJson(body);
    }

    if (type === FORM_MEDIA_TYPE) {
        return todoTextFromForm(body);
    }

    throw todoInputError('Invalid request body');
}

function sendText(response: ServerResponse, status: number, body: string): void {
    response.writeHead(status, {
        'cache-control': 'no-store',
        'content-type': 'text/plain; charset=utf-8',
    });
    response.end(body);
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
    response.writeHead(status, {
        'cache-control': 'no-store',
        'content-type': 'application/json; charset=utf-8',
    });
    response.end(`${JSON.stringify(body)}\n`);
}

function redirect(response: ServerResponse, location: string): void {
    response.writeHead(HTTP_SEE_OTHER, {
        'cache-control': 'no-store',
        'content-type': 'text/plain; charset=utf-8',
        location,
    });
    response.end('See other\n');
}

function discardBody(request: IncomingMessage): void {
    request.resume();
}

function sendTodoFailure(response: ServerResponse, error: unknown): void {
    if (isTodoInputError(error)) {
        sendText(response, HTTP_BAD_REQUEST, `${error.message}\n`);

        return;
    }

    console.log(`Failed to create todo: ${errorMessage(error)}`);
    sendText(response, HTTP_INTERNAL_SERVER_ERROR, 'Failed to create todo\n');
}

function respondCreated(
    response: ServerResponse,
    created: TodoItem,
    formSubmission: boolean,
): void {
    console.log(`Added todo (${created.todo.length} characters)`);

    if (formSubmission) {
        redirect(response, '/');

        return;
    }

    sendJson(response, HTTP_CREATED, created);
}

function createTodo(request: IncomingMessage, response: ServerResponse): void {
    const contentType = request.headers['content-type'];
    const formSubmission = mediaType(contentType) === FORM_MEDIA_TYPE;

    readBody(request).then(
        (body) => {
            try {
                respondCreated(response, addTodo(todoText(contentType, body)), formSubmission);
            } catch (error: unknown) {
                sendTodoFailure(response, error);
            }
        },
        (error: unknown) => {
            sendTodoFailure(response, error);
        },
    );
}

function handleRequest(request: IncomingMessage, response: ServerResponse): void {
    const pathName = requestPath(request.url);

    if (pathName === TODOS_PATH && request.method === 'GET') {
        discardBody(request);
        sendJson(response, HTTP_OK, listTodos());

        return;
    }

    if (pathName === TODOS_PATH && request.method === 'POST') {
        createTodo(request, response);

        return;
    }

    discardBody(request);
    sendText(response, HTTP_NOT_FOUND, 'Not found\n');
}

const port = parsePort(process.env.PORT);
const server = createServer(handleRequest);

server.listen(port, '0.0.0.0', () => {
    const address = server.address();
    let boundPort = port;

    if (typeof address === 'object' && address !== null) {
        boundPort = address.port;
    }

    console.log('Storing todos in memory');
    console.log(`Server started in port ${boundPort}`);
});

function shutdown(): void {
    server.close();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
