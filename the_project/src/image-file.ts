import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_IMAGE_DIR = '/usr/src/app/files';
const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const CACHED_MINUTES = 10;
const DEFAULT_MAX_AGE_SECONDS = CACHED_MINUTES * SECONDS_PER_MINUTE;
const MAX_MAX_AGE_SECONDS = HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE;
const MIN_FETCHED_AT = 0;
const IMAGE_FILE_NAME = 'image';
const META_FILE_NAME = 'image-meta.json';
const FILE_NOT_FOUND = 'ENOENT';
const temporarySuffix = '.tmp';

export interface CachedImage {
    body: Buffer;
    contentType: string;
    fetchedAt: number;
}

interface ImageMeta {
    contentType: string;
    fetchedAt: number;
}

export function imageDirectory(value: string | undefined): string {
    if (typeof value !== 'string' || value === '') {
        return DEFAULT_IMAGE_DIR;
    }

    return value;
}

export function imageMaxAgeMs(value: string | undefined): number {
    if (typeof value !== 'string' || value === '') {
        return DEFAULT_MAX_AGE_SECONDS * MILLISECONDS_PER_SECOND;
    }

    if (!/^\d{1,5}$/u.test(value)) {
        throw new Error(
            `Invalid IMAGE_MAX_AGE_SECONDS "${value}". Expected an integer from 0 to ${MAX_MAX_AGE_SECONDS}.`,
        );
    }

    const seconds = Number(value);

    if (seconds > MAX_MAX_AGE_SECONDS) {
        throw new Error(
            `Invalid IMAGE_MAX_AGE_SECONDS "${value}". Expected an integer from 0 to ${MAX_MAX_AGE_SECONDS}.`,
        );
    }

    return seconds * MILLISECONDS_PER_SECOND;
}

export function isImageContentType(value: string): boolean {
    return /^image\/[a-z0-9.+-]+$/u.test(value);
}

function imageFilePath(directory: string): string {
    return path.join(directory, IMAGE_FILE_NAME);
}

function metaFilePath(directory: string): string {
    return path.join(directory, META_FILE_NAME);
}

function isFileNotFound(error: unknown): boolean {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === FILE_NOT_FOUND
    );
}

function isImageMeta(value: unknown): value is ImageMeta {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    if (!('fetchedAt' in value) || !('contentType' in value)) {
        return false;
    }

    const { fetchedAt, contentType } = value;

    return (
        typeof fetchedAt === 'number' &&
        Number.isFinite(fetchedAt) &&
        fetchedAt >= MIN_FETCHED_AT &&
        typeof contentType === 'string' &&
        isImageContentType(contentType)
    );
}

function parseMeta(content: string): ImageMeta | undefined {
    try {
        const value: unknown = JSON.parse(content) as unknown;

        if (isImageMeta(value)) {
            return value;
        }
    } catch {
        // Unreadable metadata is a cache miss.
    }
}

function isFresh(fetchedAt: number, maxAgeMs: number, now: number): boolean {
    return now - fetchedAt < maxAgeMs;
}

function canUse(
    meta: ImageMeta | undefined,
    maxAgeMs: number,
    allowStale: boolean,
): meta is ImageMeta {
    if (!meta) {
        return false;
    }

    if (allowStale) {
        return true;
    }

    return isFresh(meta.fetchedAt, maxAgeMs, Date.now());
}

function cachedImage(meta: ImageMeta, body: Buffer): CachedImage {
    return {
        body,
        contentType: meta.contentType,
        fetchedAt: meta.fetchedAt,
    };
}

export interface PictureRead {
    image?: CachedImage;
}

function missedPicture(): PictureRead {
    return {};
}

function foundPicture(image: CachedImage): PictureRead {
    return { image };
}

export function readCachedImage(
    directory: string,
    maxAgeMs: number,
    allowStale: boolean,
): Promise<PictureRead> {
    return readFile(metaFilePath(directory), 'utf8').then(
        (content) => {
            const meta = parseMeta(content);

            if (canUse(meta, maxAgeMs, allowStale)) {
                return readFile(imageFilePath(directory)).then(
                    (body) => foundPicture(cachedImage(meta, body)),
                    (error: unknown) => {
                        if (isFileNotFound(error)) {
                            return missedPicture();
                        }

                        throw error;
                    },
                );
            }

            return missedPicture();
        },
        (error: unknown) => {
            if (isFileNotFound(error)) {
                return missedPicture();
            }

            throw error;
        },
    );
}

export function storeCachedImage(directory: string, image: CachedImage): Promise<void> {
    const storedImagePath = imageFilePath(directory);
    const storedMetaPath = metaFilePath(directory);

    const imageTempPath = `${storedImagePath}${temporarySuffix}`;
    const metaTempPath = `${storedMetaPath}${temporarySuffix}`;

    const meta = `${JSON.stringify({
        contentType: image.contentType,
        fetchedAt: image.fetchedAt,
    })}\n`;

    return mkdir(directory, { recursive: true })
        .then(() => writeFile(imageTempPath, image.body))
        .then(() => writeFile(metaTempPath, meta, 'utf8'))
        .then(() => rename(imageTempPath, storedImagePath))
        .then(() => rename(metaTempPath, storedMetaPath))
        .catch((error: unknown) =>
            rm(imageTempPath, { force: true }).then(() =>
                rm(metaTempPath, { force: true }).then(() => {
                    throw error;
                }),
            ),
        );
}
