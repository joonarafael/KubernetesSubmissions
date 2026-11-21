const TODO_INPUT_ERROR = 'TodoInputError';
const TODO_MIN_LENGTH = 1;
const TODO_MAX_LENGTH = 140;

export interface TodoItem {
    todo: string;
}

const storedTodos: string[] = [];

export function listTodos(): TodoItem[] {
    return storedTodos.map((todo) => ({ todo }));
}

export function todoInputError(message: string): Error {
    const error = new Error(message);
    error.name = TODO_INPUT_ERROR;

    return error;
}

export function isTodoInputError(error: unknown): error is Error {
    return error instanceof Error && error.name === TODO_INPUT_ERROR;
}

export function addTodo(value: string): TodoItem {
    const todo = value.trim();

    if (todo.length < TODO_MIN_LENGTH || todo.length > TODO_MAX_LENGTH) {
        throw todoInputError(`Todo must be ${TODO_MIN_LENGTH} to ${TODO_MAX_LENGTH} characters`);
    }

    storedTodos.push(todo);

    return { todo };
}
