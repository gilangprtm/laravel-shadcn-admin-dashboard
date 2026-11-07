import assert from 'node:assert/strict';
import test from 'node:test';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { loadShellSource, shellLoader } from './input-shell-loader.mjs';

const shells = loadShellSource('resources/js/components/form-inputs/index.ts');
const options = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta', disabled: true },
    { value: '', label: 'Pilih' },
];
const names = [
    'CheckboxGroupInputShell',
    'RadioGroupInputShell',
    'SelectInputShell',
    'ComboboxInputShell',
    'MultiComboboxInputShell',
    'SliderInputShell',
];
const render = (name, props = {}) =>
    renderToString(
        React.createElement(shells[name], {
            label: 'Pilihan',
            mode: 'edit',
            options,
            ...props,
        }),
    );

test('catalog exports exactly 15 public components', () => {
    assert.equal(Object.keys(shells).length, 15);

    for (const name of names) {
        assert.equal(typeof shells[name], 'function');
    }
});

for (const name of names) {
    test(`${name}: actual SSR mode matrix, explicit disabled, ID descriptions and enabled info`, () => {
        for (const mode of ['create', 'edit', 'view']) {
            for (const disabled of [false, true]) {
                const html = render(name, {
                    mode,
                    disabled,
                    required: true,
                    id: 'choice',
                    description: 'Description',
                    warning: 'Warning',
                    error: 'Error',
                    info: 'Guide',
                    'aria-describedby': 'outside',
                });
                assert.match(
                    html,
                    /aria-describedby="outside choice-description choice-warning choice-error"/,
                );
                assert.match(html, /aria-invalid="true"/);
                assert.match(html, /aria-label="Informasi: Pilihan"/);
                assert.match(html, /id="choice-description"/);

                if (mode === 'view' || disabled) {
                    assert.match(html, /(?:disabled=""|data-disabled="")/);
                }

                if (name.includes('Group')) {
                    assert.match(html, /<fieldset/);
                    assert.match(html, /<legend[^>]*id="choice-label"/);
                    assert.doesNotMatch(html, /<label[^>]*for="choice"/);
                }
            }
        }
    });
}

test('checkbox group uses actual native item values, item labels, and group-only required', () => {
    const html = render('CheckboxGroupInputShell', {
        name: 'choices',
        defaultValue: ['a'],
        required: true,
    });
    assert.match(html, /aria-required="true"/);
    assert.match(html, /name="choices"/);
    assert.match(html, /value="a"/);
    assert.match(html, /aria-checked="true"/);
    assert.doesNotMatch(html, / required=""/);
    assert.match(html, /for="[^"]+-b"/);
});

test('selected labels and unset/empty values render using actual controls, not IDs', () => {
    for (const name of [
        'SelectInputShell',
        'ComboboxInputShell',
        'MultiComboboxInputShell',
    ]) {
        const selected = render(name, {
            defaultValue: name.startsWith('Multi') ? ['a', 'b'] : 'a',
            name: 'pick',
        });
        assert.match(selected, /Alpha/);
        assert.doesNotMatch(selected, />a</);
        const empty = render(name, {
            placeholder: 'Pilih',
            defaultValue: name.startsWith('Multi') ? [] : '',
        });
        assert.match(empty, /Pilih/);
    }

    const multi = render('MultiComboboxInputShell', {
        defaultValue: ['a', 'b'],
        mode: 'view',
    });
    assert.match(multi, /Alpha/);
    assert.match(multi, /Beta/);
    assert.doesNotMatch(multi, /data-slot="combobox-chip-remove"/);
    assert.match(
        multi,
        /disabled=""[^>]*id="[^"]+" data-slot="combobox-chip-input"/,
    );
});

test('slider defaults to one thumb and honors explicit multiple values; exposes actual naming limitation', () => {
    const one = render('SliderInputShell', { min: 7 });
    assert.equal((one.match(/role="slider"/g) ?? []).length, 1);
    assert.match(one, /aria-valuemin="7"/);
    assert.doesNotMatch(one, /aria-valuenow=/); // SSR thumbs are hidden until mount.
    const two = render('SliderInputShell', { defaultValue: [10, 50] });
    assert.equal((two.match(/role="slider"/g) ?? []).length, 2);
    // SSR renders Radix's actual hidden thumb scaffold; per-thumb labels are unavailable.
    // Installed wrapper does not forward root label/description to thumbs.
    assert.doesNotMatch(one, /role="slider"[^>]*aria-label=/);
});

test('multi combobox selected chips have distinct accessible remove names only when removable', () => {
    const html = render('MultiComboboxInputShell', {
        options: [
            { value: 'a', label: 'Alpha' },
            { value: 'c', label: 'Gamma' },
            { value: 'b', label: 'Beta', disabled: true },
        ],
        defaultValue: ['a', 'c', 'b'],
    });
    const buttons =
        html.match(
            /<button\b[^>]*data-slot="combobox-chip-remove"[^>]*>[\s\S]*?<\/button>/g,
        ) ?? [];

    assert.match(buttons[0] ?? '', /aria-label="Hapus pilihan: Alpha"/);
    assert.match(buttons[1] ?? '', /aria-label="Hapus pilihan: Gamma"/);
    assert.equal(buttons.length, 2);
    assert.doesNotMatch(html, /aria-label="Hapus pilihan: Beta"/);
    assert.doesNotMatch(html, /removeLabel=/i);
    assert.match(html, /<button[^>]*data-slot="combobox-trigger"/);

    for (const button of buttons) {
        assert.match(button, /data-variant="ghost"/);
        assert.match(button, /data-size="icon-xs"/);
        assert.match(button, /<svg[^>]*aria-hidden="true"/);
        assert.doesNotMatch(
            button,
            /<title\b|<svg[^>]*(?:aria-label=|role="img")/,
        );
    }

    for (const props of [
        { mode: 'view' },
        { disabled: true },
        { defaultValue: ['b'] },
    ]) {
        const lockedHtml = render('MultiComboboxInputShell', {
            defaultValue: ['a'],
            ...props,
        });
        assert.doesNotMatch(lockedHtml, /data-slot="combobox-chip-remove"/);
    }
});

test('multi controlled null clears default chips in actual SSR', () => {
    const html = render('MultiComboboxInputShell', {
        value: null,
        defaultValue: ['a'],
    });
    assert.doesNotMatch(html, /Alpha/);
    assert.doesNotMatch(html, /data-slot="combobox-chip"/);
});

for (const name of ['CheckboxGroupInputShell', 'RadioGroupInputShell']) {
    test(`${name}: item FieldLabels retain control association and group chrome`, () => {
        const html = render(name, {
            id: 'choices',
            disabled: true,
            error: 'Invalid',
        });

        for (const option of options) {
            assert.match(
                html,
                new RegExp(
                    `<label[^>]*data-slot="field-label"[^>]*for="choices-${option.value}"`,
                ),
            );
            assert.match(html, new RegExp(`id="choices-${option.value}"`));
        }

        assert.match(html, /<legend[^>]*id="choices-label"/);
        assert.match(html, /data-disabled="true"/);
        assert.match(html, /aria-invalid="true"/);
    });
}

/** Hook adapter: handler boundaries + rerender only; NOT DOM or hydration. */
function adapter(name, props) {
    const slots = [];
    let cursor = 0;
    let tree;
    const load = shellLoader({
        react: {
            ...React,
            useState(initial) {
                const index = cursor++;

                if (!(index in slots)) {
                    slots[index] = initial;
                }

                return [
                    slots[index],
                    (next) => {
                        slots[index] =
                            typeof next === 'function'
                                ? next(slots[index])
                                : next;
                    },
                ];
            },
        },
    });
    const source = name.includes('Combobox')
        ? 'combobox-input-shells'
        : 'choice-input-shells';
    const Shell = load(`resources/js/components/form-inputs/${source}.tsx`)[
        name
    ];
    function rerender(extra = {}) {
        cursor = 0;
        const frame = Shell({
            label: 'Choice',
            mode: 'edit',
            options,
            ...props,
            ...extra,
        });
        tree = frame.props.children({
            id: 'choice',
            required: true,
            disabled: (extra.mode ?? props.mode) === 'view' || props.disabled,
            'aria-describedby': 'outside',
            'aria-labelledby': 'choice-label',
        });

        return tree;
    }

    return {
        rerender,
        nodes() {
            const result = [];
            function visit(node) {
                if (!React.isValidElement(node)) {
                    return;
                }

                result.push(node);
                React.Children.forEach(node.props.children, visit);
            }
            visit(tree);

            return result;
        },
    };
}

test('multi adapter clears controlled selection on null and accepts subsequent valid callbacks', () => {
    const changes = [];
    const a = adapter('MultiComboboxInputShell', {
        value: ['a'],
        defaultValue: ['a'],
        onValueChange: (...args) => changes.push(args),
    });
    assert.deepEqual(a.rerender().props.value, ['a']);
    const empty = a.rerender({ value: null });
    assert.deepEqual(empty.props.value, []);
    const details = { reason: 'item-press' };
    empty.props.onValueChange(['a'], details);
    assert.deepEqual(changes, [[['a'], details]]);
    assert.deepEqual(a.rerender({ value: null }).props.value, []);
    assert.deepEqual(a.rerender({ value: ['a'] }).props.value, ['a']);
});

test('checkbox adapter accumulates uncontrolled selection, controlled source stays owner, locked items never mutate', () => {
    const changes = [];
    const a = adapter('CheckboxGroupInputShell', {
        defaultValue: [],
        onValueChange: (next) => changes.push(next),
    });
    a.rerender();
    const checkbox = () => a.nodes().filter((n) => n.props.onCheckedChange);
    checkbox()[0].props.onCheckedChange(true);
    a.rerender();
    assert.equal(checkbox()[0].props.checked, true);
    checkbox()[1].props.onCheckedChange(true);
    assert.equal(changes.length, 1);
    a.rerender({ mode: 'view' });
    checkbox()[0].props.onCheckedChange(false);
    assert.equal(changes.length, 1);
    const controlled = adapter('CheckboxGroupInputShell', {
        value: [],
        onValueChange: (next) => changes.push(next),
    });
    controlled.rerender();
    controlled
        .nodes()
        .find((n) => n.props.onCheckedChange)
        .props.onCheckedChange(true);
    controlled.rerender();
    assert.equal(
        controlled.nodes().find((n) => n.props.onCheckedChange).props.checked,
        false,
    );
});

test('select/radio/combobox adapters preserve callbacks and ref targets and suppress locked mutations', () => {
    for (const name of [
        'RadioGroupInputShell',
        'SelectInputShell',
        'ComboboxInputShell',
        'MultiComboboxInputShell',
    ]) {
        const changes = [];
        const ref = { current: null };
        const multi = name.startsWith('Multi');
        const a = adapter(name, {
            defaultValue: multi ? [] : '',
            triggerRef: ref,
            inputRef: ref,
            onValueChange: (...args) => changes.push(args),
        });
        const root = a.rerender();
        const next = multi ? ['a'] : 'a';
        const details = { reason: 'item-press' };
        root.props.onValueChange(next, details);
        assert.deepEqual(changes[0][0], next);

        if (name.includes('Combobox')) {
            assert.equal(changes[0][1], details);
        }

        const disabledNext = multi ? ['b'] : 'b';
        root.props.onValueChange(disabledNext, details);
        assert.equal(changes.length, 1);
        a.rerender({ mode: 'view' }).props.onValueChange(next, details);
        assert.equal(changes.length, 1);

        if (name !== 'RadioGroupInputShell') {
            assert.ok(a.nodes().some((n) => n.props.ref === ref));
        }
    }
});

test('actual ModalShell and Dialog open SSR compose without portal interaction claim', () => {
    const { default: ModalShell } = loadShellSource(
        'resources/js/components/ui/modal-shell.tsx',
    );
    const { Dialog } = loadShellSource('resources/js/components/ui/dialog.tsx');
    assert.doesNotThrow(() =>
        renderToString(
            React.createElement(
                Dialog,
                { open: true },
                React.createElement(
                    ModalShell,
                    { title: 'Editor' },
                    ...names.map((name) =>
                        React.createElement(shells[name], {
                            key: name,
                            label: name,
                            mode: 'edit',
                            options,
                        }),
                    ),
                ),
            ),
        ),
    );
});
