import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { loadSource } from './load-source.mjs';

const source = 'resources/js/hooks/use-unsaved-changes-guard.ts';

// Deterministic effect/event adapter, not a DOM, Inertia router, or React renderer.
function harness(t) {
    const previousWindow = globalThis.window;
    const unloadListeners = new Set();
    const beforeListeners = new Set();
    const confirmations = [];
    let effect;
    let cleanup;
    let dependencies;
    let confirmResult = true;
    const window = {
        location: new URL('https://example.test/edit#old'),
        confirm(message) {
            confirmations.push(message);

            return confirmResult;
        },
        addEventListener(name, handler) {
            assert.equal(name, 'beforeunload');
            unloadListeners.add(handler);
        },
        removeEventListener(name, handler) {
            assert.equal(name, 'beforeunload');
            unloadListeners.delete(handler);
        },
    };
    globalThis.window = window;
    const { useUnsavedChangesGuard } = loadSource(source, {
        modules: {
            react: {
                useEffect(callback, nextDependencies) {
                    if (
                        !dependencies ||
                        nextDependencies.some(
                            (value, index) =>
                                !Object.is(value, dependencies[index]),
                        )
                    ) {
                        cleanup?.();
                        effect = callback;
                        dependencies = nextDependencies;
                        cleanup = callback();
                    }
                },
            },
            '@inertiajs/react': {
                router: {
                    on(name, callback) {
                        assert.equal(name, 'before');
                        beforeListeners.add(callback);

                        return () => beforeListeners.delete(callback);
                    },
                    visit() {
                        assert.fail('guard must never replay a visit');
                    },
                },
            },
        },
    });
    t.after(() => {
        cleanup?.();

        if (previousWindow === undefined) {
            delete globalThis.window;
        } else {
            globalThis.window = previousWindow;
        }
    });

    return {
        render: useUnsavedChangesGuard,
        confirmations,
        counts: () => [unloadListeners.size, beforeListeners.size],
        setConfirm(result) {
            confirmResult = result;
        },
        replay() {
            cleanup?.();
            cleanup = effect();
        },
        unmount() {
            cleanup?.();
        },
        unload() {
            const event = {
                preventDefault() {
                    this.prevented = true;
                },
                returnValue: undefined,
            };

            for (const listener of unloadListeners) {
                listener(event);
            }

            return event;
        },
        fire(overrides = {}) {
            const event = {
                detail: {
                    visit: {
                        method: 'get',
                        async: false,
                        prefetch: false,
                        url: new URL('https://example.test/next'),
                        ...overrides,
                    },
                },
                prevented: false,
                preventDefault() {
                    this.prevented = true;
                },
            };

            for (const listener of beforeListeners) {
                if (listener(event) === false) {
                    event.preventDefault();
                }
            }

            return event;
        },
    };
}

test('real React SSR is safe with no browser and no router listeners', () => {
    const { useUnsavedChangesGuard } = loadSource(source, {
        modules: {
            '@inertiajs/react': {
                router: {
                    on() {
                        assert.fail('SSR attached listener');
                    },
                },
            },
        },
    });
    function Probe() {
        useUnsavedChangesGuard(true);

        return createElement('span', null, 'editing');
    }
    assert.equal(renderToString(createElement(Probe)), '<span>editing</span>');
});

test('effect adapter: clean/disabled states attach nothing; transitions, latest message and replay clean up', (t) => {
    const h = harness(t);
    h.render(false);
    assert.deepEqual(h.counts(), [0, 0]);
    h.render(true, { enabled: false });
    assert.deepEqual(h.counts(), [0, 0]);
    h.render(true, { message: 'First' });
    assert.deepEqual(h.counts(), [1, 1]);
    h.replay();
    assert.deepEqual(h.counts(), [1, 1]);
    h.render(true, { message: 'Latest' });
    h.fire();
    assert.deepEqual(h.confirmations, ['Latest']);
    h.render(false);
    assert.deepEqual(h.counts(), [0, 0]);
    h.fire();
    assert.deepEqual(h.confirmations, ['Latest']);
    h.render(true);
    h.render(true, { enabled: false });
    assert.deepEqual(h.counts(), [0, 0]);
    h.render(true);
    h.unmount();
    assert.deepEqual(h.counts(), [0, 0]);
});

test('event adapter: each GET confirms exactly once, allows original visit or synchronously cancels without replay', (t) => {
    const h = harness(t);
    h.render(true, { message: 'Unsaved!' });
    assert.equal(h.fire().prevented, false);
    assert.deepEqual(h.confirmations, ['Unsaved!']);
    h.setConfirm(false);
    assert.equal(h.fire().prevented, true);
    assert.deepEqual(h.confirmations, ['Unsaved!', 'Unsaved!']);
    assert.deepEqual(h.counts(), [1, 1]);
});

test('event adapter: prefetch, async reload, non-GET saves and hash-only changes never prompt', (t) => {
    const h = harness(t);
    h.render(true);

    for (const overrides of [
        { prefetch: true },
        { async: true },
        ...['post', 'put', 'patch', 'delete'].map((method) => ({ method })),
        { url: new URL('https://example.test/edit#new') },
        { url: new URL('https://example.test/edit') },
    ]) {
        assert.equal(h.fire(overrides).prevented, false);
    }

    assert.deepEqual(h.confirmations, []);
    // Changed query/document is still a navigation even when a fragment is present.
    h.fire({ url: new URL('https://example.test/edit?other=1#new') });
    assert.equal(h.confirmations.length, 1);
    assert.equal(h.fire({ method: 'post' }).prevented, false);
    assert.equal(h.unload().prevented, true);
});

test('event adapter: beforeunload prevents default with legacy fallback only while dirty', (t) => {
    const h = harness(t);
    h.render(true);
    const event = h.unload();
    assert.equal(event.prevented, true);
    assert.equal(event.returnValue, '');
    h.render(false);
    assert.equal(h.unload().prevented, undefined);
    assert.deepEqual(h.counts(), [0, 0]);
});
