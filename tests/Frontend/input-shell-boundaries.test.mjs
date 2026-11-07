import assert from 'node:assert/strict';
import test from 'node:test';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { loadSource } from './load-source.mjs';

// Only the frame's useState is adapted to inspect event boundaries, not DOM lifecycle.
function frameSnapshot(props) {
    let state = false;
    let tree;
    let shared;
    const { InputFrame } = loadSource(
        'resources/js/components/form-inputs/form-input-frame.tsx',
        {
            modules: {
                react: {
                    ...React,
                    useState: () => [
                        state,
                        (value) => {
                            state =
                                typeof value === 'function'
                                    ? value(state)
                                    : value;
                        },
                    ],
                },
                'lucide-react': loadSource(
                    'node_modules/lucide-react/dist/cjs/lucide-react.js',
                ),
                '@/components/ui/button': { Button: 'button' },
                '@/components/ui/field': {
                    Field: 'section',
                    FieldLabel: 'label',
                    FieldDescription: 'p',
                    FieldError: 'div',
                },
                '@/components/ui/tooltip': {
                    TooltipProvider: 'provider',
                    Tooltip: 'tooltip',
                    TooltipTrigger: 'trigger',
                    TooltipContent: 'content',
                },
                '@/lib/utils': loadSource('resources/js/lib/utils.ts'),
            },
        },
    );
    function Probe() {
        tree = InputFrame({
            ...props,
            children: (control) => {
                shared = control;

                return null;
            },
        });

        return null;
    }
    renderToString(React.createElement(Probe));
    const nodes = [];
    function visit(node) {
        if (!React.isValidElement(node)) {
            return;
        }

        nodes.push(node);
        React.Children.forEach(node.props.children, visit);
    }
    visit(tree);

    return { shared, nodes, state: () => state };
}

test('frame matrix enforces disabled precedence and required in all modes with complete ID associations', () => {
    for (const mode of ['create', 'edit', 'view']) {
        for (const disabled of [false, true]) {
            const { shared, nodes } = frameSnapshot({
                label: 'Value',
                mode,
                disabled,
                required: true,
                id: 'value',
                description: 'Description',
                warning: 'Warning',
                error: 'Error',
                'aria-describedby': 'outside',
            });
            assert.equal(shared.disabled, mode === 'view' || disabled);
            assert.equal(shared.required, mode !== 'view');
            assert.equal(shared['aria-invalid'], true);
            assert.equal(
                shared['aria-describedby'],
                'outside value-description value-warning value-error',
            );
            assert.equal(
                nodes.find((node) => node.type === 'label').props.htmlFor,
                shared.id,
            );

            for (const id of [
                'value-description',
                'value-warning',
                'value-error',
            ]) {
                assert.ok(nodes.some((node) => node.props.id === id));
            }
        }
    }

    assert.equal(
        frameSnapshot({ label: 'Value', mode: 'create' }).shared[
            'aria-describedby'
        ],
        undefined,
    );
});

test('info handler boundary trims text and handles tap/click, Escape and outside dismissal while disabled', () => {
    const { nodes, state } = frameSnapshot({
        label: 'Locked',
        mode: 'view',
        disabled: true,
        info: '  <plain text>  ',
    });
    const button = nodes.find((node) => node.type === 'button');
    const content = nodes.find((node) => node.type === 'content');
    assert.equal(content.props.children, '<plain text>');
    assert.equal(button.props.disabled, undefined);
    assert.equal(button.props.type, 'button');
    assert.equal(button.props['aria-label'], 'Informasi: Locked');
    let prevented = 0;
    button.props.onClick({ preventDefault: () => prevented++ });
    assert.equal(state(), true);
    assert.equal(prevented, 1);
    button.props.onClick({ preventDefault() {} });
    assert.equal(state(), false);
    button.props.onClick({ preventDefault() {} });
    button.props.onKeyDown({ key: 'Escape' });
    assert.equal(state(), false);
    button.props.onClick({ preventDefault() {} });
    content.props.onPointerDownOutside();
    assert.equal(state(), false);

    for (const info of [undefined, '', ' \n ']) {
        assert.equal(
            frameSnapshot({ label: 'Value', mode: 'edit', info }).nodes.some(
                (node) => node.type === 'button',
            ),
            false,
        );
    }
});
