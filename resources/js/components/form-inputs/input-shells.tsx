import type { ComponentProps } from 'react';
import { InputFrame } from '@/components/form-inputs/form-input-frame';
import type { InputShellProps } from '@/components/form-inputs/form-input-frame';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import {
    NativeSelect,
    NativeSelectOptGroup,
    NativeSelectOption,
} from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

type ShellProps<Control> = InputShellProps &
    Omit<Control, keyof InputShellProps>;

export function splitProps<Props extends InputShellProps>(props: Props) {
    const {
        label,
        mode,
        info,
        description,
        warning,
        error,
        required,
        disabled,
        id,
        className,
        controlClassName,
        ...control
    } = props;

    return {
        frame: {
            label,
            mode,
            info,
            description,
            warning,
            error,
            required,
            disabled,
            id,
            className,
            controlClassName,
        },
        control,
    };
}

export type TextInputShellProps = ShellProps<
    Omit<ComponentProps<typeof Input>, 'type'>
> & {
    type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number';
};

export function TextInputShell({
    type = 'text',
    ...props
}: TextInputShellProps) {
    const { frame, control } = splitProps(props);

    return (
        <InputFrame
            {...frame}
            aria-describedby={control['aria-describedby']}
            aria-invalid={control['aria-invalid']}
        >
            {(shared) => <Input {...control} {...shared} type={type} />}
        </InputFrame>
    );
}

export type DateInputShellProps = ShellProps<
    Omit<ComponentProps<typeof Input>, 'type'>
> & {
    type?: 'date' | 'datetime-local' | 'time';
};

export function DateInputShell({
    type = 'date',
    ...props
}: DateInputShellProps) {
    const { frame, control } = splitProps(props);

    return (
        <InputFrame
            {...frame}
            aria-describedby={control['aria-describedby']}
            aria-invalid={control['aria-invalid']}
        >
            {(shared) => <Input {...control} {...shared} type={type} />}
        </InputFrame>
    );
}

export type TextareaInputShellProps = ShellProps<
    ComponentProps<typeof Textarea>
>;

export function TextareaInputShell(props: TextareaInputShellProps) {
    const { frame, control } = splitProps(props);

    return (
        <InputFrame
            {...frame}
            aria-describedby={control['aria-describedby']}
            aria-invalid={control['aria-invalid']}
        >
            {(shared) => <Textarea {...control} {...shared} />}
        </InputFrame>
    );
}

export type CheckboxInputShellProps = ShellProps<
    Omit<ComponentProps<typeof Checkbox>, 'asChild' | 'children'>
>;

export function CheckboxInputShell(props: CheckboxInputShellProps) {
    const { frame, control } = splitProps(props);

    return (
        <InputFrame
            {...frame}
            booleanLayout
            aria-describedby={control['aria-describedby']}
            aria-invalid={control['aria-invalid']}
        >
            {(shared) => <Checkbox {...control} {...shared} />}
        </InputFrame>
    );
}

export type SwitchInputShellProps = ShellProps<
    Omit<ComponentProps<typeof Switch>, 'asChild' | 'children'>
>;

export function SwitchInputShell(props: SwitchInputShellProps) {
    const { frame, control } = splitProps(props);

    return (
        <InputFrame
            {...frame}
            booleanLayout
            aria-describedby={control['aria-describedby']}
            aria-invalid={control['aria-invalid']}
        >
            {(shared) => <Switch {...control} {...shared} />}
        </InputFrame>
    );
}

export type InputSelectOption = {
    value: string;
    label: string;
    disabled?: boolean;
};
export type InputSelectOptionGroup = {
    label: string;
    disabled?: boolean;
    options: readonly InputSelectOption[];
};
export type NativeSelectInputShellProps = ShellProps<
    Omit<
        ComponentProps<typeof NativeSelect>,
        'children' | 'dangerouslySetInnerHTML'
    >
> & {
    options: readonly (InputSelectOption | InputSelectOptionGroup)[];
};

function renderOption(option: InputSelectOption) {
    return (
        <NativeSelectOption
            key={option.value}
            value={option.value}
            disabled={option.disabled}
        >
            {option.label}
        </NativeSelectOption>
    );
}

export function NativeSelectInputShell({
    options,
    ...props
}: NativeSelectInputShellProps) {
    const { frame, control } = splitProps(props);

    return (
        <InputFrame
            {...frame}
            aria-describedby={control['aria-describedby']}
            aria-invalid={control['aria-invalid']}
        >
            {(shared) => (
                <NativeSelect {...control} {...shared}>
                    {options.map((option) =>
                        'options' in option ? (
                            <NativeSelectOptGroup
                                key={option.label}
                                label={option.label}
                                disabled={option.disabled}
                            >
                                {option.options.map(renderOption)}
                            </NativeSelectOptGroup>
                        ) : (
                            renderOption(option)
                        ),
                    )}
                </NativeSelect>
            )}
        </InputFrame>
    );
}

export type FileInputShellProps = ShellProps<
    Omit<
        ComponentProps<typeof Input>,
        'type' | 'value' | 'defaultValue' | 'children'
    >
>;

export function FileInputShell(props: FileInputShellProps) {
    const { frame, control } = splitProps(props);

    return (
        <InputFrame
            {...frame}
            aria-describedby={control['aria-describedby']}
            aria-invalid={control['aria-invalid']}
        >
            {(shared) => <Input {...control} {...shared} type="file" />}
        </InputFrame>
    );
}

export type ColorInputShellProps = ShellProps<
    Omit<ComponentProps<typeof Input>, 'type'>
>;

export function ColorInputShell(props: ColorInputShellProps) {
    const { frame, control } = splitProps(props);

    return (
        <InputFrame
            {...frame}
            aria-describedby={control['aria-describedby']}
            aria-invalid={control['aria-invalid']}
        >
            {(shared) => <Input {...control} {...shared} type="color" />}
        </InputFrame>
    );
}

export type OtpInputShellProps = ShellProps<
    Omit<ComponentProps<typeof InputOTP>, 'children' | 'render' | 'maxLength'>
> & { maxLength: number };

export function OtpInputShell({ maxLength, ...props }: OtpInputShellProps) {
    if (!Number.isSafeInteger(maxLength) || maxLength < 1) {
        throw new RangeError(
            'OtpInputShell maxLength must be a positive safe integer.',
        );
    }

    const { frame, control } = splitProps(props);

    return (
        <InputFrame
            {...frame}
            aria-describedby={control['aria-describedby']}
            aria-invalid={control['aria-invalid']}
        >
            {(shared) => (
                <InputOTP {...control} {...shared} maxLength={maxLength}>
                    <InputOTPGroup>
                        {Array.from({ length: maxLength }, (_, index) => (
                            <InputOTPSlot key={index} index={index} />
                        ))}
                    </InputOTPGroup>
                </InputOTP>
            )}
        </InputFrame>
    );
}
