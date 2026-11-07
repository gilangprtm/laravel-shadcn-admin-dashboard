import { Info } from 'lucide-react';
import { useId, useState } from 'react';
import type { AriaAttributes, ReactNode } from 'react';
import type { MouseEvent, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
    Field,
    FieldDescription,
    FieldError,
    FieldLabel,
    FieldSet,
    FieldLegend,
} from '@/components/ui/field';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type InputShellMode = 'create' | 'edit' | 'view';

export type InputShellProps = {
    label: string;
    mode: InputShellMode;
    info?: string;
    description?: string;
    warning?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    id?: string;
    className?: string;
    controlClassName?: string;
};

type ControlProps = {
    id: string;
    disabled: boolean;
    required: boolean;
    className?: string;
    'aria-invalid'?: AriaAttributes['aria-invalid'];
    'aria-describedby'?: string;
    'aria-labelledby'?: string;
};

type InputFrameProps = InputShellProps &
    Pick<AriaAttributes, 'aria-invalid' | 'aria-describedby'> & {
        children: (props: ControlProps) => ReactNode;
        booleanLayout?: boolean;
        group?: boolean;
    };

export function InputFrame({
    label,
    mode,
    info,
    description,
    warning,
    error,
    required = false,
    disabled = false,
    id,
    className,
    controlClassName,
    children,
    booleanLayout = false,
    group = false,
    'aria-describedby': describedBy,
    'aria-invalid': invalid,
}: InputFrameProps) {
    const generatedId = useId();
    const fieldId = id ?? `${generatedId}-control`;
    const descriptionId = `${fieldId}-description`;
    const warningId = `${fieldId}-warning`;
    const errorId = `${fieldId}-error`;
    const effectiveDisabled = mode === 'view' || disabled;
    const cleanInfo = info?.trim();
    const [infoOpen, setInfoOpen] = useState(false);
    const ids =
        [
            describedBy,
            description && descriptionId,
            warning && warningId,
            error && errorId,
        ]
            .filter(Boolean)
            .join(' ') || undefined;
    const control = children({
        id: fieldId,
        disabled: effectiveDisabled,
        required: mode !== 'view' && required,
        className: controlClassName,
        'aria-invalid': error ? true : invalid,
        'aria-describedby': ids,
        ...(group ? { 'aria-labelledby': `${fieldId}-label` } : {}),
    });
    const Label = group ? FieldLegend : FieldLabel;
    const Container = group ? FieldSet : Field;
    const labelNode = (
        <Label {...(group ? { id: `${fieldId}-label` } : { htmlFor: fieldId })}>
            {label}
            {required && (
                <>
                    <span aria-hidden="true">*</span>
                    <span className="sr-only"> (wajib)</span>
                </>
            )}
        </Label>
    );

    return (
        <Container
            className={className}
            data-disabled={effectiveDisabled || undefined}
            data-invalid={error ? true : invalid || undefined}
        >
            {!booleanLayout && labelNode}
            <div className="flex items-center gap-2">
                {booleanLayout ? (
                    control
                ) : (
                    <div className="min-w-0 flex-1">{control}</div>
                )}
                {booleanLayout && labelNode}
                {cleanInfo && (
                    <TooltipProvider>
                        <Tooltip open={infoOpen} onOpenChange={setInfoOpen}>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    aria-label={`Informasi: ${label}`}
                                    aria-expanded={infoOpen}
                                    onClick={(
                                        event: MouseEvent<HTMLButtonElement>,
                                    ) => {
                                        event.preventDefault();
                                        setInfoOpen((open) => !open);
                                    }}
                                    onKeyDown={(
                                        event: KeyboardEvent<HTMLButtonElement>,
                                    ) => {
                                        if (event.key === 'Escape') {
                                            setInfoOpen(false);
                                        }
                                    }}
                                >
                                    <Info aria-hidden="true" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent
                                onEscapeKeyDown={() => setInfoOpen(false)}
                                onPointerDownOutside={() => setInfoOpen(false)}
                            >
                                {cleanInfo}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
            {description && (
                <FieldDescription id={descriptionId}>
                    {description}
                </FieldDescription>
            )}
            {warning && (
                <FieldDescription
                    id={warningId}
                    className={cn('text-amber-700 dark:text-amber-400')}
                >
                    {warning}
                </FieldDescription>
            )}
            {error && <FieldError id={errorId}>{error}</FieldError>}
        </Container>
    );
}
