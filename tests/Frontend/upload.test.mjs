import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSource } from './load-source.mjs';

const loadUpload = (boundaries) =>
    loadSource('resources/js/lib/upload.ts', boundaries);
const { validateUploadFile } = loadUpload();
const file = (overrides = {}) => ({
    name: 'report.PDF',
    size: 10,
    type: 'application/pdf',
    ...overrides,
});

test('upload validation checks limits, invalid values, allowlists and basename extensions', () => {
    assert.deepEqual(validateUploadFile(file(), { maxSizeBytes: 10 }), {
        valid: true,
    });
    assert.deepEqual(
        validateUploadFile(file({ size: 0 }), { maxSizeBytes: 0 }),
        { valid: true },
    );
    assert.deepEqual(
        validateUploadFile(file({ size: 11 }), { maxSizeBytes: 10 }),
        { valid: false, error: 'file-too-large' },
    );

    for (const size of [-1, NaN, Infinity]) {
        assert.deepEqual(
            validateUploadFile(file({ size }), { maxSizeBytes: 10 }),
            { valid: false, error: 'invalid-options' },
        );
    }

    for (const maxSizeBytes of [-1, NaN, Infinity]) {
        assert.deepEqual(validateUploadFile(file(), { maxSizeBytes }), {
            valid: false,
            error: 'invalid-options',
        });
    }

    assert.deepEqual(
        validateUploadFile(file({ name: '  ' }), { maxSizeBytes: 10 }),
        { valid: false, error: 'invalid-options' },
    );
    assert.deepEqual(validateUploadFile(null, { maxSizeBytes: 10 }), {
        valid: false,
        error: 'invalid-options',
    });
    assert.deepEqual(validateUploadFile(file(), null), {
        valid: false,
        error: 'invalid-options',
    });
    assert.deepEqual(
        validateUploadFile(file(), {
            maxSizeBytes: 10,
            allowedMimeTypes: [' IMAGE/PNG '],
            allowedExtensions: [' .pdf '],
        }),
        { valid: true },
    );
    assert.deepEqual(
        validateUploadFile(file({ type: '' }), {
            maxSizeBytes: 10,
            allowedMimeTypes: ['application/pdf'],
        }),
        { valid: false, error: 'file-type-not-allowed' },
    );
    assert.deepEqual(
        validateUploadFile(file({ name: '../../x.exe' }), {
            maxSizeBytes: 10,
            allowedExtensions: ['pdf'],
        }),
        { valid: false, error: 'file-type-not-allowed' },
    );
    assert.deepEqual(
        validateUploadFile(file({ name: 'archive.tar.PDF' }), {
            maxSizeBytes: 10,
            allowedExtensions: ['.pdf'],
        }),
        { valid: true },
    );
    assert.deepEqual(
        validateUploadFile(file({ name: '.pdf' }), {
            maxSizeBytes: 10,
            allowedExtensions: ['pdf'],
        }),
        { valid: false, error: 'file-type-not-allowed' },
    );
    assert.deepEqual(
        validateUploadFile(file(), {
            maxSizeBytes: 10,
            allowedMimeTypes: ['  '],
            allowedExtensions: [''],
        }),
        { valid: false, error: 'file-type-not-allowed' },
    );

    for (const options of [
        { allowedMimeTypes: [] },
        { allowedExtensions: [] },
        { allowedMimeTypes: ['image/png'] },
        { allowedExtensions: ['exe'] },
    ]) {
        assert.deepEqual(
            validateUploadFile(file(), { maxSizeBytes: 10, ...options }),
            { valid: false, error: 'file-type-not-allowed' },
        );
    }

    assert.deepEqual(
        validateUploadFile(file({ type: ' APPLICATION/PDF ' }), {
            maxSizeBytes: 10,
            allowedMimeTypes: ['application/pdf'],
        }),
        { valid: true },
    );
    assert.deepEqual(
        validateUploadFile(file({ name: 'C:\\folder.pdf\\file', type: '' }), {
            maxSizeBytes: 10,
            allowedExtensions: ['pdf'],
        }),
        { valid: false, error: 'file-type-not-allowed' },
    );

    for (const options of [
        { allowedMimeTypes: [null] },
        { allowedExtensions: [7] },
        { allowedExtensions: 'pdf' },
    ]) {
        assert.deepEqual(
            validateUploadFile(file(), { maxSizeBytes: 10, ...options }),
            { valid: false, error: 'invalid-options' },
        );
    }
});

function browserHarness({ clickThrows = false } = {}) {
    const events = [];
    const objectUrl = 'blob:test-url';
    const callbacks = [];
    const anchor = {
        hidden: false,
        click() {
            events.push('click');

            if (clickThrows) {
                throw new Error('click failed');
            }
        },
    };
    const body = {
        appendChild(value) {
            assert.equal(value, anchor);
            events.push('append');
        },
        removeChild(value) {
            assert.equal(value, anchor);
            events.push('remove');
        },
    };
    const old = { window: globalThis.window, document: globalThis.document };
    globalThis.window = {
        Blob,
        URL: {
            createObjectURL(value) {
                assert.ok(value instanceof Blob);
                events.push('create');

                return objectUrl;
            },
            revokeObjectURL(value) {
                assert.equal(value, objectUrl);
                events.push('revoke');
            },
        },
    };
    globalThis.document = {
        body,
        createElement(tag) {
            assert.equal(tag, 'a');
            events.push('anchor');

            return anchor;
        },
    };

    return {
        events,
        anchor,
        callbacks,
        restore() {
            if (old.window === undefined) {
                delete globalThis.window;
            } else {
                globalThis.window = old.window;
            }

            if (old.document === undefined) {
                delete globalThis.document;
            } else {
                globalThis.document = old.document;
            }
        },
    };
}

test('download creates and removes one hidden anchor, then revokes URL after the queued timer', () => {
    const harness = browserHarness();

    try {
        loadUpload({
            setTimeout(callback, delay) {
                assert.equal(delay, 0);
                harness.events.push('timer');
                harness.callbacks.push(callback);
            },
        }).downloadBlob(new Blob(['payload']), 'report.pdf');
        assert.equal(harness.anchor.download, 'report.pdf');
        assert.equal(harness.anchor.href, 'blob:test-url');
        assert.equal(harness.anchor.hidden, true);
        assert.deepEqual(harness.events, [
            'create',
            'anchor',
            'append',
            'click',
            'remove',
            'timer',
        ]);
        assert.equal(harness.callbacks.length, 1);
        harness.callbacks[0]();
        assert.deepEqual(harness.events.at(-1), 'revoke');
    } finally {
        harness.restore();
    }
});

test('download cleans anchor and URL when click throws', () => {
    const harness = browserHarness({ clickThrows: true });

    try {
        assert.throws(
            () =>
                loadUpload({
                    setTimeout(callback) {
                        harness.callbacks.push(callback);
                    },
                }).downloadBlob(new Blob(), 'x.bin'),
            /click failed/,
        );
        assert.deepEqual(harness.events, [
            'create',
            'anchor',
            'append',
            'click',
            'remove',
            'revoke',
        ]);
        assert.equal(harness.callbacks.length, 0);
    } finally {
        harness.restore();
    }
});

test('download rejects SSR, invalid blob/name, and unavailable APIs', () => {
    const oldWindow = globalThis.window;
    const oldDocument = globalThis.document;

    try {
        delete globalThis.window;
        delete globalThis.document;
        assert.throws(
            () => loadUpload().downloadBlob(new Blob(), 'a'),
            /browser environment/,
        );
        globalThis.window = { Blob };
        globalThis.document = {};
        const { downloadBlob } = loadUpload();
        assert.throws(
            () => downloadBlob({}, 'a'),
            /Blob and a non-empty filename/,
        );
        assert.throws(
            () => downloadBlob(new Blob(), '  '),
            /Blob and a non-empty filename/,
        );
        assert.throws(
            () => downloadBlob(new Blob(), 'a'),
            /browser download APIs/,
        );
    } finally {
        if (oldWindow === undefined) {
            delete globalThis.window;
        } else {
            globalThis.window = oldWindow;
        }

        if (oldDocument === undefined) {
            delete globalThis.document;
        } else {
            globalThis.document = oldDocument;
        }
    }
});
