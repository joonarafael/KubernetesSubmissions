import type { IncomingMessage } from 'node:http';
import { todoInputError } from './todos.js';

const BYTES_PER_KIBIBYTE = 1024;
const MAX_BODY_KIBIBYTES = 4;
const MAX_BODY_BYTES = MAX_BODY_KIBIBYTES * BYTES_PER_KIBIBYTE;

interface BodyCollector {
    chunks: Buffer[];
    received: number;
    settled: boolean;
}

interface FailedBody {
    collector: BodyCollector;
    error: Error;
    reject: (error: Error) => void;
    request: IncomingMessage;
}

function chunkBytes(chunk: unknown): Buffer {
    if (typeof chunk === 'string') {
        return Buffer.from(chunk);
    }

    if (Buffer.isBuffer(chunk)) {
        return chunk;
    }

    throw todoInputError('Invalid request body');
}

function pushChunk(collector: BodyCollector, chunk: unknown): void {
    const buffer = chunkBytes(chunk);
    collector.received += buffer.length;

    if (collector.received > MAX_BODY_BYTES) {
        throw todoInputError('Request body is too large');
    }

    collector.chunks.push(buffer);
}

function failureError(error: unknown): Error {
    if (error instanceof Error) {
        return error;
    }

    return todoInputError('Invalid request body');
}

function failBody(failed: FailedBody): void {
    if (failed.collector.settled) {
        return;
    }

    failed.collector.settled = true;
    failed.request.resume();
    failed.reject(failed.error);
}

export function readBody(request: IncomingMessage): Promise<string> {
    const collector: BodyCollector = {
        chunks: [],
        received: 0,
        settled: false,
    };

    return new Promise((resolve, reject) => {
        request.on('data', (chunk: unknown) => {
            if (collector.settled) {
                return;
            }

            try {
                pushChunk(collector, chunk);
            } catch (error: unknown) {
                failBody({
                    collector,
                    error: failureError(error),
                    reject,
                    request,
                });
            }
        });

        request.on('end', () => {
            if (collector.settled) {
                return;
            }

            collector.settled = true;
            resolve(Buffer.concat(collector.chunks).toString('utf8'));
        });

        request.on('error', () => {
            failBody({
                collector,
                error: todoInputError('Invalid request body'),
                reject,
                request,
            });
        });
    });
}
