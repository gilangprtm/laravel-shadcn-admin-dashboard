import { useState } from 'react';
import type { ComponentProps } from 'react';
import { InputFrame } from '@/components/form-inputs/form-input-frame';
import type { InputShellProps } from '@/components/form-inputs/form-input-frame';
import { splitProps } from '@/components/form-inputs/input-shells';
import type {
    InputSelectOption,
    InputSelectOptionGroup,
} from '@/components/form-inputs/input-shells';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldLabel } from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

type ChoiceOption = InputSelectOption;
type ChoiceOptions = readonly (ChoiceOption | InputSelectOptionGroup)[];

function flatOptions(options: ChoiceOptions): readonly ChoiceOption[] {
    return options.flatMap((option) =>
        'options' in option
            ? option.options.map((item) => ({
                  ...item,
                  disabled: option.disabled || item.disabled,
              }))
            : [option],
    );
}

/** Required means at least one selection (ARIA only); caller/server must validate the group. */
export type CheckboxGroupInputShellProps = InputShellProps & {
    options: readonly ChoiceOption[];
    name?: string;
    ref?: ComponentProps<'div'>['ref'];
    value?: string[];
    defaultValue?: string[];
    onValueChange?: (value: string[]) => void;
    'aria-invalid'?: ComponentProps<'div'>['aria-invalid'];
    'aria-describedby'?: string;
};

export function CheckboxGroupInputShell({
    options,
    value,
    defaultValue,
    onValueChange,
    name,
    ref,
    ...props
}: CheckboxGroupInputShellProps) {
    const { required, mode, ...frame } = props;
    const [uncontrolled, setUncontrolled] = useState(defaultValue ?? []);
    const selected = value ?? uncontrolled;

    return (
        <InputFrame {...frame} mode={mode} required={required} group>
            {(shared) => (
                <div
                    role="group"
                    id={shared.id}
                    ref={ref}
                    className={shared.className}
                    aria-labelledby={shared['aria-labelledby']}
                    aria-describedby={shared['aria-describedby']}
                    aria-required={shared.required || undefined}
                    aria-invalid={shared['aria-invalid']}
                    data-invalid={shared['aria-invalid'] || undefined}
                >
                    {options.map((option) => (
                        <div
                            className="flex items-center gap-2"
                            key={option.value}
                        >
                            <Checkbox
                                id={`${shared.id}-${option.value}`}
                                name={name}
                                value={option.value}
                                checked={selected.includes(option.value)}
                                disabled={shared.disabled || option.disabled}
                                onCheckedChange={(checked) => {
                                    if (shared.disabled || option.disabled) {
                                        return;
                                    }

                                    const next = checked
                                        ? [
                                              ...selected.filter(
                                                  (item) =>
                                                      item !== option.value,
                                              ),
                                              option.value,
                                          ]
                                        : selected.filter(
                                              (item) => item !== option.value,
                                          );

                                    if (value === undefined) {
                                        setUncontrolled(next);
                                    }

                                    onValueChange?.(next);
                                }}
                            />
                            <FieldLabel
                                htmlFor={`${shared.id}-${option.value}`}
                            >
                                {option.label}
                            </FieldLabel>
                        </div>
                    ))}
                </div>
            )}
        </InputFrame>
    );
}

export type RadioGroupInputShellProps = InputShellProps &
    Omit<ComponentProps<typeof RadioGroup>, 'children' | 'asChild'> & {
        options: readonly ChoiceOption[];
        'aria-describedby'?: string;
        'aria-invalid'?: ComponentProps<'div'>['aria-invalid'];
    };

export function RadioGroupInputShell({
    options,
    ...props
}: RadioGroupInputShellProps) {
    const { frame, control } = splitProps(props);

    return (
        <InputFrame
            {...frame}
            group
            aria-describedby={control['aria-describedby']}
            aria-invalid={control['aria-invalid']}
        >
            {(shared) => (
                <RadioGroup
                    {...control}
                    id={shared.id}
                    aria-labelledby={shared['aria-labelledby']}
                    aria-describedby={shared['aria-describedby']}
                    aria-invalid={shared['aria-invalid']}
                    disabled={shared.disabled}
                    required={shared.required}
                    className={shared.className}
                    onValueChange={(next) => {
                        if (
                            !shared.disabled &&
                            !options.some(
                                (option) =>
                                    option.value === next && option.disabled,
                            )
                        ) {
                            control.onValueChange?.(next);
                        }
                    }}
                >
                    {options.map((option) => (
                        <div
                            className="flex items-center gap-2"
                            key={option.value}
                        >
                            <RadioGroupItem
                                id={`${shared.id}-${option.value}`}
                                value={option.value}
                                disabled={option.disabled || shared.disabled}
                            />
                            <FieldLabel
                                htmlFor={`${shared.id}-${option.value}`}
                            >
                                {option.label}
                            </FieldLabel>
                        </div>
                    ))}
                </RadioGroup>
            )}
        </InputFrame>
    );
}

/** triggerRef targets the button. Empty option values become placeholder text, never SelectItems. */
export type SelectInputShellProps = InputShellProps &
    Omit<ComponentProps<typeof Select>, 'children'> & {
        options: ChoiceOptions;
        triggerRef?: ComponentProps<typeof SelectTrigger>['ref'];
        placeholder?: string;
        'aria-describedby'?: string;
        'aria-invalid'?: ComponentProps<typeof SelectTrigger>['aria-invalid'];
    };

export function SelectInputShell({
    options,
    triggerRef,
    ...props
}: SelectInputShellProps) {
    const { placeholder, ...rest } = props;
    const { frame, control } = splitProps(rest);
    const [uncontrolled, setUncontrolled] = useState(
        control.defaultValue ?? '',
    );
    const selected = flatOptions(options).find(
        (option) => option.value === (control.value ?? uncontrolled),
    );
    const placeholderOption = flatOptions(options).find(
        (option) => option.value === '',
    );

    return (
        <InputFrame
            {...frame}
            aria-describedby={control['aria-describedby']}
            aria-invalid={control['aria-invalid']}
        >
            {(shared) => (
                <Select
                    {...control}
                    value={control.value ?? uncontrolled}
                    disabled={shared.disabled}
                    required={shared.required}
                    onValueChange={(next) => {
                        if (
                            shared.disabled ||
                            flatOptions(options).some(
                                (option) =>
                                    option.value === next && option.disabled,
                            )
                        ) {
                            return;
                        }

                        if (control.value === undefined) {
                            setUncontrolled(next);
                        }

                        control.onValueChange?.(next);
                    }}
                >
                    <SelectTrigger
                        id={shared.id}
                        ref={triggerRef}
                        className={shared.className}
                        aria-describedby={shared['aria-describedby']}
                        aria-invalid={shared['aria-invalid']}
                    >
                        <SelectValue
                            placeholder={
                                placeholder ?? placeholderOption?.label
                            }
                        >
                            {selected?.value ? selected.label : undefined}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {options.map((option) =>
                            'options' in option ? (
                                <SelectGroup key={option.label}>
                                    <SelectLabel>{option.label}</SelectLabel>
                                    {option.options
                                        .filter((item) => item.value !== '')
                                        .map((item) => (
                                            <SelectItem
                                                key={item.value}
                                                value={item.value}
                                                disabled={
                                                    option.disabled ||
                                                    item.disabled
                                                }
                                            >
                                                {item.label}
                                            </SelectItem>
                                        ))}
                                </SelectGroup>
                            ) : option.value !== '' ? (
                                <SelectItem
                                    key={option.value}
                                    value={option.value}
                                    disabled={option.disabled}
                                >
                                    {option.label}
                                </SelectItem>
                            ) : null,
                        )}
                    </SelectContent>
                </Select>
            )}
        </InputFrame>
    );
}

/**
 * ref targets the Slider root span, not a thumb. The installed Slider wrapper
 * cannot assign per-thumb names/descriptions; root ARIA is not a substitute.
 * required is presentation only: validate ranges in the caller/server.
 */
export type SliderInputShellProps = InputShellProps &
    Omit<
        ComponentProps<typeof Slider>,
        'defaultValue' | 'value' | 'children'
    > & {
        value?: number[];
        defaultValue?: number[];
        'aria-describedby'?: string;
        'aria-invalid'?: ComponentProps<typeof Slider>['aria-invalid'];
        ref?: ComponentProps<typeof Slider>['ref'];
    };

export function SliderInputShell({
    min = 0,
    max = 100,
    value,
    defaultValue,
    ...props
}: SliderInputShellProps) {
    const { frame, control } = splitProps(props);

    return (
        <InputFrame
            {...frame}
            group
            aria-describedby={control['aria-describedby']}
            aria-invalid={control['aria-invalid']}
        >
            {(shared) => (
                <Slider
                    {...control}
                    id={shared.id}
                    ref={control.ref}
                    className={shared.className}
                    aria-labelledby={shared['aria-labelledby']}
                    onValueChange={(next) => {
                        if (!shared.disabled) {
                            control.onValueChange?.(next);
                        }
                    }}
                    onValueCommit={(next) => {
                        if (!shared.disabled) {
                            control.onValueCommit?.(next);
                        }
                    }}
                    min={min}
                    max={max}
                    value={value}
                    defaultValue={defaultValue ?? [min]}
                    disabled={shared.disabled}
                    aria-describedby={shared['aria-describedby']}
                    aria-invalid={shared['aria-invalid']}
                />
            )}
        </InputFrame>
    );
}
