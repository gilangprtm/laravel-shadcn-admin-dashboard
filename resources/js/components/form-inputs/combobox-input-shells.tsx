import { useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { InputFrame } from '@/components/form-inputs/form-input-frame';
import type { InputShellProps } from '@/components/form-inputs/form-input-frame';
import { splitProps } from '@/components/form-inputs/input-shells';
import type { InputSelectOption } from '@/components/form-inputs/input-shells';
import {
    Combobox,
    ComboboxChips,
    ComboboxChip,
    ComboboxChipsInput,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
    ComboboxValue,
    ComboboxTrigger,
} from '@/components/ui/combobox';

type ChoiceOption = InputSelectOption;

function OptionList({
    options,
    emptyMessage,
}: {
    options: readonly ChoiceOption[];
    emptyMessage: ReactNode;
}) {
    return (
        <ComboboxContent>
            <ComboboxList>
                {(value: string) => {
                    const option = options.find(
                        (option) => option.value === value,
                    );

                    return (
                        <ComboboxItem
                            key={value}
                            value={value}
                            disabled={option?.disabled}
                        >
                            {option?.label}
                        </ComboboxItem>
                    );
                }}
            </ComboboxList>
            <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
        </ComboboxContent>
    );
}

export type ComboboxInputShellProps = InputShellProps &
    Pick<
        ComponentProps<typeof Combobox<string>>,
        | 'name'
        | 'form'
        | 'value'
        | 'defaultValue'
        | 'onValueChange'
        | 'onInputValueChange'
    > & {
        options: readonly ChoiceOption[];
        inputRef?: ComponentProps<typeof ComboboxInput>['ref'];
        placeholder?: string;
        emptyMessage?: ReactNode;
        'aria-describedby'?: string;
        'aria-invalid'?: ComponentProps<'input'>['aria-invalid'];
    };

export function ComboboxInputShell({
    options,
    inputRef,
    placeholder,
    emptyMessage = 'Tidak ada pilihan.',
    ...props
}: ComboboxInputShellProps) {
    const { frame, control } = splitProps(props);
    const [uncontrolled, setUncontrolled] = useState(
        control.defaultValue ?? null,
    );
    const locked = frame.mode === 'view' || frame.disabled;

    return (
        <InputFrame
            {...frame}
            aria-describedby={control['aria-describedby']}
            aria-invalid={control['aria-invalid']}
        >
            {(shared) => (
                <Combobox<string>
                    {...control}
                    value={
                        control.value === undefined
                            ? uncontrolled
                            : control.value
                    }
                    onInputValueChange={(next, details) => {
                        if (!shared.disabled) {
                            control.onInputValueChange?.(next, details);
                        }
                    }}
                    items={options.map((option) => option.value)}
                    disabled={shared.disabled}
                    required={shared.required}
                    itemToStringLabel={(v) =>
                        options.find((option) => option.value === v)?.label ??
                        ''
                    }
                    onValueChange={(next, details) => {
                        if (
                            shared.disabled ||
                            options.some(
                                (option) =>
                                    option.value === next && option.disabled,
                            )
                        ) {
                            return;
                        }

                        if (control.value === undefined) {
                            setUncontrolled(next);
                        }

                        control.onValueChange?.(next, details);
                    }}
                >
                    <ComboboxInput
                        id={shared.id}
                        ref={inputRef}
                        placeholder={placeholder}
                        className={shared.className}
                        disabled={locked}
                        aria-describedby={shared['aria-describedby']}
                        aria-invalid={shared['aria-invalid']}
                        showTrigger
                        showClear={!locked}
                    />
                    <OptionList options={options} emptyMessage={emptyMessage} />
                </Combobox>
            )}
        </InputFrame>
    );
}

export type MultiComboboxInputShellProps = InputShellProps &
    Pick<
        ComponentProps<typeof Combobox<string, true>>,
        | 'name'
        | 'form'
        | 'value'
        | 'defaultValue'
        | 'onValueChange'
        | 'onInputValueChange'
    > & {
        options: readonly ChoiceOption[];
        inputRef?: ComponentProps<typeof ComboboxChipsInput>['ref'];
        placeholder?: string;
        emptyMessage?: ReactNode;
        'aria-describedby'?: string;
        'aria-invalid'?: ComponentProps<'input'>['aria-invalid'];
    };

export function MultiComboboxInputShell({
    options,
    inputRef,
    placeholder,
    emptyMessage = 'Tidak ada pilihan.',
    ...props
}: MultiComboboxInputShellProps) {
    const { frame, control } = splitProps(props);
    const [uncontrolled, setUncontrolled] = useState(
        control.defaultValue ?? [],
    );
    const selected =
        control.value === undefined ? uncontrolled : (control.value ?? []);
    const locked = frame.mode === 'view' || frame.disabled;

    return (
        <InputFrame
            {...frame}
            aria-describedby={control['aria-describedby']}
            aria-invalid={control['aria-invalid']}
        >
            {(shared) => (
                <Combobox<string, true>
                    {...control}
                    value={selected}
                    multiple
                    onInputValueChange={(next, details) => {
                        if (!shared.disabled) {
                            control.onInputValueChange?.(next, details);
                        }
                    }}
                    items={options.map((option) => option.value)}
                    name={control.name}
                    disabled={shared.disabled}
                    required={shared.required}
                    onValueChange={(next, details) => {
                        if (shared.disabled) {
                            return;
                        }

                        const previous = selected;

                        if (
                            options.some(
                                (option) =>
                                    option.disabled &&
                                    previous.includes(option.value) !==
                                        next.includes(option.value),
                            )
                        ) {
                            return;
                        }

                        if (control.value === undefined) {
                            setUncontrolled(next);
                        }

                        control.onValueChange?.(next, details);
                    }}
                    itemToStringLabel={(v) =>
                        options.find((option) => option.value === v)?.label ??
                        ''
                    }
                >
                    <ComboboxChips
                        className={shared.className}
                        aria-labelledby={shared['aria-labelledby']}
                        aria-describedby={shared['aria-describedby']}
                        aria-invalid={shared['aria-invalid']}
                    >
                        <ComboboxValue>
                            {(values: string[]) =>
                                values.map((value) => (
                                    <ComboboxChip
                                        key={value}
                                        showRemove={
                                            !locked &&
                                            !options.find(
                                                (option) =>
                                                    option.value === value,
                                            )?.disabled
                                        }
                                        removeLabel={`Hapus pilihan: ${options.find((option) => option.value === value)?.label ?? value}`}
                                    >
                                        {options.find(
                                            (option) => option.value === value,
                                        )?.label ?? ''}
                                    </ComboboxChip>
                                ))
                            }
                        </ComboboxValue>
                        <ComboboxChipsInput
                            id={shared.id}
                            ref={inputRef}
                            placeholder={placeholder}
                            disabled={locked}
                            aria-describedby={shared['aria-describedby']}
                            aria-invalid={shared['aria-invalid']}
                        />
                        <ComboboxTrigger
                            disabled={locked}
                            aria-label={`Buka pilihan: ${frame.label}`}
                        />
                    </ComboboxChips>
                    <OptionList options={options} emptyMessage={emptyMessage} />
                </Combobox>
            )}
        </InputFrame>
    );
}
