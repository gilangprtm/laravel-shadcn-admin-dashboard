import assert from 'node:assert/strict';
import test from 'node:test';
import * as React from 'react';
import { shellLoader } from './input-shell-loader.mjs';

// Hook boundary adapter only: no DOM, lifecycle, portal or keyboard simulation.
function probe(name, props) {
    const state = [];
    let index = 0;
    const load = shellLoader({
        react: {
            ...React,
            useState(initial) {
                const slot = index++;

                if (!(slot in state)) {
                    state[slot] = initial;
                }

                return [
                    state[slot],
                    (next) => {
                        state[slot] = next;
                    },
                ];
            },
        },
    });
    const file = name.includes('Combobox')
        ? 'combobox-input-shells'
        : 'choice-input-shells';
    const Shell = load(`resources/js/components/form-inputs/${file}.tsx`)[name];

    return (disabled = false) => {
        index = 0;
        const frame = Shell({ label: 'Value', mode: 'edit', ...props });

        return frame.props.children({ id: 'value', disabled });
    };
}

test('slider boundary adapter preserves numeric values, commits, ref, default min and locks callbacks', () => {
    const values = [];
    const commits = [];
    const ref = { current: null };
    const render = probe('SliderInputShell', {
        ref,
        min: 4,
        onValueChange: (v) => values.push(v),
        onValueCommit: (v) => commits.push(v),
    });
    const slider = render();
    assert.deepEqual(slider.props.defaultValue, [4]);
    assert.equal(slider.props.ref, ref);
    slider.props.onValueChange([8]);
    slider.props.onValueCommit([8]);
    assert.deepEqual(values, [[8]]);
    assert.deepEqual(commits, [[8]]);
    render(true).props.onValueChange([9]);
    render(true).props.onValueCommit([9]);
    assert.equal(values.length, 1);
    assert.equal(commits.length, 1);
});

test('multi adapter preserves selected state through add/remove and rejects disabled item removal and locked clear', () => {
    const updates = [];
    const render = probe('MultiComboboxInputShell', {
        options: [
            { value: 'a', label: 'Alpha' },
            { value: 'b', label: 'Beta', disabled: true },
        ],
        defaultValue: ['b'],
        onValueChange: (v) => updates.push(v),
    });
    render().props.onValueChange(['a', 'b'], {});
    assert.deepEqual(render().props.value, ['a', 'b']);
    render().props.onValueChange(['b'], {});
    assert.deepEqual(render().props.value, ['b']);
    render().props.onValueChange([], {});
    assert.deepEqual(render().props.value, ['b']);
    render(true).props.onValueChange([], {});
    assert.equal(updates.length, 2);
});
