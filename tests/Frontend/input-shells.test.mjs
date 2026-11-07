import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { loadSource } from './load-source.mjs';

const utils = loadSource('resources/js/lib/utils.ts');
// Installed lucide's CJS entry is marked type:module; evaluate its actual CJS source.
const lucide = loadSource('node_modules/lucide-react/dist/cjs/lucide-react.js');
const component = (path, imports = {}) =>
    loadSource(path, {
        modules: { '@/lib/utils': utils, 'lucide-react': lucide, ...imports },
    });
const field = component('resources/js/components/ui/field.tsx', {
    '@/components/ui/label': component('resources/js/components/ui/label.tsx'),
    '@/components/ui/separator': component(
        'resources/js/components/ui/separator.tsx',
    ),
});
const button = component('resources/js/components/ui/button.tsx');
const tooltip = component('resources/js/components/ui/tooltip.tsx');
const input = component('resources/js/components/ui/input.tsx');
const textarea = component('resources/js/components/ui/textarea.tsx');
const checkbox = component('resources/js/components/ui/checkbox.tsx');
const toggle = component('resources/js/components/ui/switch.tsx');
const nativeSelect = component('resources/js/components/ui/native-select.tsx');
const otp = component('resources/js/components/ui/input-otp.tsx');
const {
    TextInputShell,
    DateInputShell,
    TextareaInputShell,
    CheckboxInputShell,
    SwitchInputShell,
    NativeSelectInputShell,
    FileInputShell,
    ColorInputShell,
    OtpInputShell,
} = component('resources/js/components/form-inputs/input-shells.tsx', {
    '@/components/form-inputs/form-input-frame': component(
        'resources/js/components/form-inputs/form-input-frame.tsx',
        {
            '@/components/ui/button': button,
            '@/components/ui/field': field,
            '@/components/ui/tooltip': tooltip,
        },
    ),
    '@/components/ui/input': input,
    '@/components/ui/textarea': textarea,
    '@/components/ui/checkbox': checkbox,
    '@/components/ui/switch': toggle,
    '@/components/ui/native-select': nativeSelect,
    '@/components/ui/input-otp': otp,
});

test('caller-owned values, refs and original event contracts cross shell boundary unchanged', () => {
    const ref = { current: null };
    const onChange = () => {};
    const onCheckedChange = () => {};
    const cases = [
        [TextInputShell, { value: 'x', onChange }],
        [DateInputShell, { defaultValue: '2026-03-01', onChange }],
        [TextareaInputShell, { defaultValue: 'notes', onChange }],
        [CheckboxInputShell, { checked: 'indeterminate', onCheckedChange }],
        [SwitchInputShell, { defaultChecked: true, onCheckedChange }],
        [NativeSelectInputShell, { options: [], value: 'x', onChange }],
        [FileInputShell, { multiple: true, onChange }],
        [ColorInputShell, { value: '#123456', onChange }],
        [
            OtpInputShell,
            { maxLength: 5, value: '12', onChange, pattern: '[0-9]*' },
        ],
    ];

    for (const [Shell, props] of cases) {
        const frame = Shell({
            label: 'Value',
            mode: 'edit',
            name: 'value',
            ref,
            ...props,
        });
        const control = frame.props.children({
            id: 'value',
            disabled: true,
            required: false,
        });
        assert.equal(control.props.ref, ref);
        assert.equal(control.props.name, 'value');
        assert.equal(control.props.disabled, true);

        for (const key of [
            'value',
            'defaultValue',
            'checked',
            'defaultChecked',
            'onChange',
            'onCheckedChange',
            'multiple',
            'pattern',
        ]) {
            assert.equal(control.props[key], props[key]);
        }
    }
});

function render(Component, props) {
    return renderToString(createElement(Component, props));
}

test('text and date inputs preserve caller props, native type and mode disabled semantics in actual SSR', () => {
    const text = render(TextInputShell, {
        label: 'Email',
        mode: 'edit',
        type: 'email',
        name: 'email',
        defaultValue: 'a@b.test',
        required: true,
        description: 'Public address',
        error: 'Invalid address',
        'aria-describedby': 'external',
    });
    assert.match(
        text,
        /<input[^>]*type="email"[^>]*name="email"[^>]*value="a@b.test"/,
    );
    assert.match(text, /id="[^"]+"/);
    assert.match(text, /for="[^"]+"/);
    assert.match(text, /aria-invalid="true"/);
    assert.match(
        text,
        /aria-describedby="external [^"]+-description [^"]+-error"/,
    );
    assert.match(text, /role="alert"/);
    const view = render(DateInputShell, {
        label: 'Date',
        mode: 'view',
        type: 'datetime-local',
        value: '2026-05-02T09:30',
        onChange: () => {},
    });
    assert.match(view, /type="datetime-local"/);
    assert.match(view, /value="2026-05-02T09:30"/);
    assert.match(view, /disabled=""/);
    assert.doesNotMatch(view, /required=""/);
    assert.match(
        render(DateInputShell, {
            label: 'Time',
            mode: 'create',
            type: 'time',
            disabled: true,
        }),
        /type="time"[^>]*disabled=""/,
    );
});

test('empty info adds no trigger, while trimmed info has an accessible non-submit trigger', () => {
    const absent = render(TextInputShell, { label: 'Name', mode: 'create' });
    const whitespace = render(TextInputShell, {
        label: 'Name',
        mode: 'edit',
        info: '  \n ',
    });
    assert.doesNotMatch(absent, /Informasi: Name/);
    assert.doesNotMatch(whitespace, /Informasi: Name/);
    const present = render(TextInputShell, {
        label: 'Name',
        mode: 'edit',
        info: '  Plain guidance  ',
    });
    assert.match(present, /type="button"/);
    assert.match(present, /aria-label="Informasi: Name"/);
    assert.doesNotMatch(present, /disabled=""/);
});

test('all remaining controls render with one label, forwarded native attributes and mode-disabled control', () => {
    const samples = [
        [
            TextareaInputShell,
            { name: 'notes', defaultValue: 'hello' },
            /<textarea[^>]*name="notes"/,
        ],
        [
            CheckboxInputShell,
            { name: 'active', value: 'yes', defaultChecked: true },
            /name="active"/,
        ],
        [
            SwitchInputShell,
            { name: 'enabled', checked: true },
            /name="enabled"/,
        ],
        [
            NativeSelectInputShell,
            {
                name: 'choice',
                defaultValue: 'two',
                options: [
                    { value: 'one', label: 'One' },
                    {
                        label: 'Group',
                        options: [{ value: 'two', label: 'Two' }],
                    },
                ],
            },
            /<select[^>]*name="choice"/,
        ],
        [
            FileInputShell,
            { name: 'upload', accept: '.pdf' },
            /type="file"[^>]*accept=".pdf"[^>]*name="upload"/,
        ],
        [
            ColorInputShell,
            { name: 'tint', defaultValue: '#112233' },
            /type="color"[^>]*name="tint"/,
        ],
        [
            OtpInputShell,
            { name: 'code', maxLength: 4, value: '12', pattern: '[0-9]*' },
            /name="code"/,
        ],
    ];

    for (const [Shell, props, pattern] of samples) {
        const html = render(Shell, { label: 'Field', mode: 'view', ...props });
        assert.match(html, pattern);
        assert.match(html, /disabled(?:="")?/);
        assert.match(html, /<label[^>]*for="[^"]+"/);
    }

    assert.match(
        render(NativeSelectInputShell, {
            label: 'Option',
            mode: 'create',
            options: [
                { value: 'one', label: 'One' },
                { label: 'Grouped', options: [{ value: 'two', label: 'Two' }] },
            ],
        }),
        /<optgroup[^>]*label="Grouped"/,
    );
    assert.throws(
        () =>
            render(OtpInputShell, {
                label: 'Code',
                mode: 'create',
                maxLength: 0,
            }),
        RangeError,
    );
});
