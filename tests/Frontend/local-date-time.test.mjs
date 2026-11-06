import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import test from 'node:test';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { loadSource } from './load-source.mjs';

const source = 'resources/js/components/local-date-time.tsx';
const helpers = loadSource('resources/js/lib/date-time.ts');
const modules = { '@/lib/date-time': helpers };

// Minimal snapshot boundary, NOT hydrateRoot, a DOM, or a React lifecycle renderer.
function renderSnapshot(value, props = {}, client = false) {
    const { LocalDateTime } = loadSource(source, {
        modules: {
            ...modules,
            react: {
                useSyncExternalStore(
                    subscribe,
                    getSnapshot,
                    getServerSnapshot,
                ) {
                    assert.equal(typeof subscribe(), 'function');

                    return client ? getSnapshot() : getServerSnapshot();
                },
            },
        },
    });

    return renderToString(createElement(LocalDateTime, { value, ...props }));
}

function withBrowser(callback) {
    const previous = globalThis.window;
    globalThis.window = {};

    try {
        return callback();
    } finally {
        if (previous === undefined) {
            delete globalThis.window;
        } else {
            globalThis.window = previous;
        }
    }
}

test('real React SSR renders placeholder; hydration snapshot adapter remains identical even with a browser', () => {
    const { LocalDateTime } = loadSource(source, { modules });
    const value = '2026-03-01T00:30:00Z';
    const server = renderToString(createElement(LocalDateTime, { value }));
    assert.equal(server, '<time>—</time>');
    withBrowser(() => assert.equal(renderSnapshot(value), server));
    assert.equal(
        renderSnapshot(value, { placeholder: '<script>' }),
        '<time>&lt;script&gt;</time>',
    );
});

test('real SSR is identical across server zones while client snapshot zones differ and date-only stays stable', () => {
    const script = `import { createElement } from 'react'; import { renderToString } from 'react-dom/server'; import { loadSource } from './tests/Frontend/load-source.mjs'; const helpers=loadSource('resources/js/lib/date-time.ts'); const modules={'@/lib/date-time':helpers}; const {LocalDateTime}=loadSource('${source}',{modules}); const ssr=renderToString(createElement(LocalDateTime,{value:'2026-03-01T00:30:00Z'})); globalThis.window={}; const {LocalDateTime:Client}=loadSource('${source}',{modules:{...modules,react:{useSyncExternalStore:(s,g)=>g()}}}); const render=(value)=>renderToString(createElement(Client,{value})); console.log(JSON.stringify([ssr,render('2026-03-01T00:30:00Z'),render('2026-03-01')]));`;
    const run = (TZ) =>
        JSON.parse(
            execFileSync(
                process.execPath,
                ['--input-type=module', '-e', script],
                { encoding: 'utf8', env: { ...process.env, TZ } },
            ),
        );
    const jakarta = run('Asia/Jakarta');
    const la = run('America/Los_Angeles');
    assert.equal(jakarta[0], '<time>—</time>');
    assert.equal(la[0], jakarta[0]);
    assert.equal(
        jakarta[1],
        '<time dateTime="2026-03-01T00:30:00Z">1 Mar 2026, 07.30</time>',
    );
    assert.equal(
        la[1],
        '<time dateTime="2026-03-01T00:30:00Z">28 Feb 2026, 16.30</time>',
    );
    assert.equal(jakarta[2], '<time dateTime="2026-03-01">1 Mar 2026</time>');
    assert.equal(la[2], jakarta[2]);
});

test('client snapshot adapter handles invalid dates and reflects value/mode/DOM prop updates', () => {
    withBrowser(() => {
        assert.equal(
            renderSnapshot(new Date(NaN), { placeholder: 'n/a' }, true),
            '<time>n/a</time>',
        );
        assert.equal(renderSnapshot('2026-02-30', {}, true), '<time>—</time>');
        assert.equal(
            renderSnapshot('invalid', { placeholder: 'none' }, true),
            '<time>none</time>',
        );
        assert.equal(
            renderSnapshot(
                '2026-03-02',
                { mode: 'date', className: 'stamp' },
                true,
            ),
            '<time class="stamp" dateTime="2026-03-02">2 Maret 2026</time>',
        );
        assert.equal(
            renderSnapshot('2026-03-03', { mode: 'date' }, true),
            '<time dateTime="2026-03-03">3 Maret 2026</time>',
        );
        assert.match(
            renderSnapshot(new Date('2026-03-01T00:30:00Z'), {}, true),
            /dateTime="2026-03-01T00:30:00.000Z"/,
        );
    });
});
