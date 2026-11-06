/**
 * Client-side convenience validation only; callers must repeat validation on the server.
 * Browser MIME values may be blank or unreliable, and the server must inspect contents.
 */
export type UploadFileLike = Pick<File, 'name' | 'size' | 'type'>;

export type UploadValidationErrorCode =
    'file-too-large' | 'file-type-not-allowed' | 'invalid-options';

export type UploadValidationResult =
    { valid: true } | { valid: false; error: UploadValidationErrorCode };

export interface UploadValidationOptions {
    maxSizeBytes: number;
    allowedMimeTypes?: readonly string[];
    allowedExtensions?: readonly string[];
}

/**
 * Validate size and optional type allowlists. When both allowlists are provided,
 * either a MIME type or the final filename extension may match. Explicit empty
 * allowlists reject all types. Invalid file metadata uses `invalid-options`.
 */
export function validateUploadFile(
    file: UploadFileLike,
    options: UploadValidationOptions,
): UploadValidationResult {
    if (
        !options ||
        !Number.isFinite(options.maxSizeBytes) ||
        options.maxSizeBytes < 0 ||
        !Array.isArray(options.allowedMimeTypes ?? []) ||
        !Array.isArray(options.allowedExtensions ?? [])
    ) {
        return { valid: false, error: 'invalid-options' };
    }

    if (
        !file ||
        !Number.isFinite(file.size) ||
        file.size < 0 ||
        typeof file.name !== 'string' ||
        file.name.trim() === '' ||
        typeof file.type !== 'string'
    ) {
        return { valid: false, error: 'invalid-options' };
    }

    if (file.size > options.maxSizeBytes) {
        return { valid: false, error: 'file-too-large' };
    }

    const allowedMimeTypes = options.allowedMimeTypes ?? [];
    const allowedExtensions = options.allowedExtensions ?? [];

    if (
        !allowedMimeTypes.every((value) => typeof value === 'string') ||
        !allowedExtensions.every((value) => typeof value === 'string')
    ) {
        return { valid: false, error: 'invalid-options' };
    }

    const mimeTypes = allowedMimeTypes
        .map((mimeType) => mimeType.trim().toLowerCase())
        .filter(Boolean);
    const extensions = allowedExtensions
        .map((extension) => {
            const normalized = extension.trim().toLowerCase();

            return normalized.startsWith('.') ? normalized : `.${normalized}`;
        })
        .filter((extension) => extension.length > 1);

    if (
        options.allowedMimeTypes === undefined &&
        options.allowedExtensions === undefined
    ) {
        return { valid: true };
    }

    const mimeMatches = mimeTypes.includes(file.type.trim().toLowerCase());
    const basename = file.name.replaceAll('\\', '/').split('/').pop() ?? '';
    const dot = basename.lastIndexOf('.');
    const extension = dot > 0 ? basename.slice(dot).toLowerCase() : '';

    return mimeMatches || extensions.includes(extension)
        ? { valid: true }
        : { valid: false, error: 'file-type-not-allowed' };
}

/**
 * Trigger a browser Blob download. Empty names are rejected. The temporary URL
 * is revoked on a zero-delay timer after the browser can initiate the download.
 */
export function downloadBlob(blob: Blob, filename: string): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('downloadBlob requires a browser environment.');
    }

    if (typeof window.Blob !== 'function') {
        throw new Error('Required browser download APIs are unavailable.');
    }

    if (
        !(blob instanceof window.Blob) ||
        typeof filename !== 'string' ||
        filename.trim() === ''
    ) {
        throw new Error(
            'downloadBlob requires a Blob and a non-empty filename.',
        );
    }

    const { URL } = window;

    if (
        typeof URL?.createObjectURL !== 'function' ||
        typeof URL.revokeObjectURL !== 'function' ||
        typeof document.createElement !== 'function' ||
        typeof document.body?.appendChild !== 'function' ||
        typeof document.body.removeChild !== 'function' ||
        typeof setTimeout !== 'function'
    ) {
        throw new Error('Required browser download APIs are unavailable.');
    }

    const objectUrl = URL.createObjectURL(blob);
    let initiated = false;

    try {
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = filename;
        anchor.hidden = true;
        document.body.appendChild(anchor);

        try {
            anchor.click();
            initiated = true;
        } finally {
            document.body.removeChild(anchor);
        }
    } finally {
        if (initiated) {
            setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
        } else {
            URL.revokeObjectURL(objectUrl);
        }
    }
}
