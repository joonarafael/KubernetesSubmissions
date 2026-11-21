const TODO_MAX_LENGTH = 140;
const EMPTY_LENGTH = 0;
const HTML_ESCAPE = /[&<>"']/gu;

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
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }
  .todo-status {
    max-width: 40rem;
    margin: 1rem auto 0;
    color: #555555;
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
<form class="todo-form" action="/todos" method="post">
<input id="todo" name="todo" type="text" maxlength="${TODO_MAX_LENGTH}" placeholder="Enter a new todo (max ${TODO_MAX_LENGTH} characters)" aria-label="New todo" autocomplete="off" required>
<button type="submit">Send</button>
</form>
<h2>Todos</h2>
__TODOS__
<p class="course">DevOps with Kubernetes 2026</p>
<form action="/shutdown" method="post">
<button class="shutdown" type="submit">Shut down</button>
</form>
</main>
</body>
</html>
`;

const HTML_ESCAPES: Record<string, string> = {
    '"': '&quot;',
    '&': '&amp;',
    "'": '&#39;',
    '<': '&lt;',
    '>': '&gt;',
};

function escapeHtml(value: string): string {
    return value.replaceAll(HTML_ESCAPE, (character) => HTML_ESCAPES[character] ?? character);
}

function todoSection(todos: readonly string[], unavailable: boolean): string {
    if (unavailable) {
        return '<p class="todo-status">Todos are not available</p>';
    }

    if (todos.length === EMPTY_LENGTH) {
        return '<p class="todo-status">No todos yet</p>';
    }

    const items = todos.map((todo) => `<li>${escapeHtml(todo)}</li>`).join('\n');

    return `<ul class="todos">\n${items}\n</ul>`;
}

export function renderIndexPage(todos: readonly string[], unavailable: boolean): string {
    return INDEX_PAGE.replace('__TODOS__', () => todoSection(todos, unavailable));
}
