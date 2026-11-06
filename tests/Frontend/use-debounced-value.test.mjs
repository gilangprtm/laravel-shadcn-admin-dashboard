import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { loadSource } from './load-source.mjs';

// A deterministic boundary adapter, not a React renderer or browser integration.
function lifecycleAdapter() {
    let state;
    let initialized = false;
    let previousDependencies;
    let effect;
    let cleanup;
    let now = 0;
    let nextId = 0;
    let updates = 0;
    const timers = new Map();
    const react = {
        useState(initial) {
            if (!initialized) {
                state = typeof initial === 'function' ? initial() : initial;
                initialized = true;
            }

            return [
                state,
                (value) => {
                    updates += 1;
                    state = typeof value === 'function' ? value(state) : value;
                },
            ];
        },
        useEffect(callback, dependencies) {
            if (
                !previousDependencies ||
                dependencies.some(
                    (value, index) =>
                        !Object.is(value, previousDependencies[index]),
                )
            ) {
                cleanup?.();
                effect = callback;
                previousDependencies = dependencies;
                cleanup = callback();
            }
        },
    };
    const { useDebouncedValue } = loadSource(
        'resources/js/hooks/use-debounced-value.ts',
        {
            modules: { react },
            setTimeout(callback, delay) {
                const id = ++nextId;
                timers.set(id, { callback, at: now + delay });

                return id;
            },
            clearTimeout(id) {
                timers.delete(id);
            },
        },
    );

    return {
        render: useDebouncedValue,
        advance(milliseconds) {
            now += milliseconds;

            for (const [id, timer] of timers) {
                if (timer.at <= now) {
                    timers.delete(id);
                    timer.callback();
                }
            }
        },
        replayEffect() {
            cleanup?.();
            cleanup = effect();
        },
        unmount() {
            cleanup?.();
        },
        pending: () => timers.size,
        updates: () => updates,
    };
}

test('real React SSR returns the initial value without scheduling effects', () => {
    const { useDebouncedValue } = loadSource(
        'resources/js/hooks/use-debounced-value.ts',
    );
    function Probe() {
        return createElement('span', null, useDebouncedValue('awal'));
    }

    assert.equal(renderToString(createElement(Probe)), '<span>awal</span>');
});

test('lifecycle adapter: trailing value replaces earlier timers and honors default delay', () => {
    const hook = lifecycleAdapter();
    assert.equal(hook.render('a'), 'a');
    hook.advance(100);
    assert.equal(hook.render('b'), 'a');
    assert.equal(hook.pending(), 1);
    hook.advance(299);
    assert.equal(hook.render('b'), 'a');
    hook.advance(1);
    assert.equal(hook.render('b'), 'b');
});

test('lifecycle adapter: delay changes replace timers and unmount removes stale callbacks', () => {
    const hook = lifecycleAdapter();
    hook.render('a', 100);
    hook.render('b', 100);
    hook.advance(50);
    hook.render('b', 200);
    hook.advance(199);
    assert.equal(hook.render('b', 200), 'a');
    hook.advance(1);
    assert.equal(hook.render('b', 200), 'b');
    hook.render('c', 200);
    const updates = hook.updates();
    hook.unmount();
    hook.advance(1000);
    assert.equal(hook.pending(), 0);
    assert.equal(hook.updates(), updates);
});

test('lifecycle adapter: invalid delay is zero, effect replay cleans up, function values stay values', () => {
    for (const delay of [-1, NaN, Infinity, -Infinity]) {
        const hook = lifecycleAdapter();
        const initial = () => 'not invoked';
        const next = () => 'also not invoked';
        assert.equal(hook.render(initial, delay), initial);
        hook.render(next, delay);
        hook.replayEffect();
        assert.equal(hook.pending(), 1);
        hook.advance(0);
        assert.equal(hook.render(next, delay), next);
        hook.unmount();
    }
});
