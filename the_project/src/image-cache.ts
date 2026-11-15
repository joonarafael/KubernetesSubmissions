import {
    type CachedImage,
    isImageContentType,
    readCachedImage,
    storeCachedImage,
} from './image-file.js';

const DEFAULT_PICTURE_URL = 'https://picsum.photos/1200';
const FETCH_TIMEOUT_MS = 15_000;
const BYTES_PER_KIBIBYTE = 1024;
const KIBIBYTES_PER_MEBIBYTE = 1024;
const MAX_IMAGE_MEBIBYTES = 15;
const MAX_IMAGE_BYTES = MAX_IMAGE_MEBIBYTES * KIBIBYTES_PER_MEBIBYTE * BYTES_PER_KIBIBYTE;
const EMPTY_BYTE_LENGTH = 0;
const HEADER_START = 0;

function errorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return 'Unknown error';
}

function mediaType(header: string | null): string {
    if (header === null || header === '') {
        throw new Error('Missing picture content type');
    }

    const separatorIndex = header.indexOf(';');
    let raw = header;

    if (separatorIndex >= HEADER_START) {
        raw = header.slice(HEADER_START, separatorIndex);
    }

    const value = raw.trim().toLowerCase();

    if (!isImageContentType(value)) {
        throw new Error(`Unexpected picture content type "${header}"`);
    }

    return value;
}

function pictureFromBuffer(buffer: ArrayBuffer, contentType: string): CachedImage {
    if (buffer.byteLength === EMPTY_BYTE_LENGTH || buffer.byteLength > MAX_IMAGE_BYTES) {
        throw new Error(`Unexpected picture size ${buffer.byteLength}`);
    }

    return {
        body: Buffer.from(buffer),
        contentType,
        fetchedAt: Date.now(),
    };
}

export function pictureUrl(value: string | undefined): string {
    if (typeof value !== 'string' || value === '') {
        return DEFAULT_PICTURE_URL;
    }

    return value;
}

function downloadPicture(source: string): Promise<CachedImage> {
    return fetch(source, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }).then((response) => {
        if (!response.ok) {
            throw new Error(`Picture source responded with status ${response.status}`);
        }

        const contentType = mediaType(response.headers.get('content-type'));

        return response.arrayBuffer().then((buffer) => pictureFromBuffer(buffer, contentType));
    });
}

function rememberPicture(directory: string, picture: CachedImage): Promise<CachedImage> {
    return storeCachedImage(directory, picture).then(() => {
        console.log(`Fetched a new picture (${picture.contentType}, ${picture.body.length} bytes)`);

        return picture;
    });
}

interface ImageFlight {
    current?: Promise<CachedImage>;
}

function storedPicture(directory: string, maxAgeMs: number, error: unknown): Promise<CachedImage> {
    return readCachedImage(directory, maxAgeMs, true).then((cached) => {
        const { image } = cached;

        if (image) {
            console.log(`Keeping the stored picture: ${errorMessage(error)}`);

            return image;
        }

        throw error;
    });
}

function downloadOrStored(
    directory: string,
    maxAgeMs: number,
    source: string,
): Promise<CachedImage> {
    return downloadPicture(source).then(
        (picture) => rememberPicture(directory, picture),
        (error: unknown) => storedPicture(directory, maxAgeMs, error),
    );
}

export function createImageCache(
    directory: string,
    maxAgeMs: number,
    source: string,
): () => Promise<CachedImage> {
    const flight: ImageFlight = {};

    return function loadCachedImage(): Promise<CachedImage> {
        const { current } = flight;

        if (current) {
            return current;
        }

        const loading = readCachedImage(directory, maxAgeMs, false).then((cached) => {
            const { image } = cached;

            if (image) {
                return image;
            }

            return downloadOrStored(directory, maxAgeMs, source);
        });

        const shared = loading.finally(() => {
            delete flight.current;
        });

        flight.current = shared;

        return shared;
    };
}

export function cacheErrorMessage(error: unknown): string {
    return errorMessage(error);
}
