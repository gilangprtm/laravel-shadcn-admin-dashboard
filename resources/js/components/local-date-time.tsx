import { useSyncExternalStore } from 'react';
import { formatLocalDate, formatLocalDateTime } from '@/lib/date-time';

export type LocalDateTimeProps = Omit<
    React.TimeHTMLAttributes<HTMLTimeElement>,
    'children' | 'dateTime'
> & {
    value: string | Date;
    mode?: 'date' | 'date-time';
    placeholder?: string;
};

const subscribe = (): (() => void) => () => {};
const getServerSnapshot = (): boolean => false;
const getClientSnapshot = (): boolean => typeof window !== 'undefined';

export function LocalDateTime({
    value,
    mode = 'date-time',
    placeholder = '—',
    ...props
}: LocalDateTimeProps) {
    const isClient = useSyncExternalStore(
        subscribe,
        getClientSnapshot,
        getServerSnapshot,
    );
    const formattedValue = isClient
        ? mode === 'date'
            ? formatLocalDate(value)
            : formatLocalDateTime(value)
        : placeholder;
    const text = formattedValue === '-' ? placeholder : formattedValue;
    let dateTime: string | undefined;

    if (isClient && formattedValue !== '-') {
        if (typeof value === 'string') {
            dateTime = value.trim();
        } else {
            try {
                dateTime = value.toISOString();
            } catch {
                dateTime = undefined;
            }
        }
    }

    return (
        <time {...props} dateTime={dateTime}>
            {text}
        </time>
    );
}

export default LocalDateTime;
