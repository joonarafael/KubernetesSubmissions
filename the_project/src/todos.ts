const FETCH_TIMEOUT_MS = 2000;
const TODO_READ_ERROR = 'TodoReadError';
const TODO_MIN_LENGTH = 1;
const TODO_MAX_LENGTH = 140;

export function todoBackendUrl(value: string | undefined): string {
    if (typeof value !== 'string' || value === '') {
        throw new Error('TODO_BACKEND_URL is not configured');
    }

    return value;
}

interface TodoItem {
    todo: string;
}

function isTodoItem(value: unknown): value is TodoItem {
    if (typeof value !== 'object' || value === null || !('todo' in value)) {
        return false;
    }

    const { todo } = value;

    return (
        typeof todo === 'string' && todo.length >= TODO_MIN_LENGTH && todo.length <= TODO_MAX_LENGTH
    );
}

function parseJson(content: string): unknown {
    try {
        return JSON.parse(content) as unknown;
    } catch {
        throw new Error('Invalid todo list');
    }
}

function parseTodos(content: string): string[] {
    const value = parseJson(content);

    if (!Array.isArray(value) || !value.every((item) => isTodoItem(item))) {
        throw new Error('Invalid todo list');
    }

    return value.map((item) => item.todo);
}

function errorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return 'Unknown error';
}

export function todoErrorMessage(error: unknown): string {
    return errorMessage(error);
}

function asTodoReadError(error: unknown): Error {
    const wrapped = new Error(errorMessage(error));
    wrapped.name = TODO_READ_ERROR;

    return wrapped;
}

export function readTodos(url: string): Promise<string[]> {
    return fetch(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Todo backend responded with status ${response.status}`);
            }

            return response.text().then((body) => parseTodos(body));
        })
        .catch((error: unknown) => {
            throw asTodoReadError(error);
        });
}
