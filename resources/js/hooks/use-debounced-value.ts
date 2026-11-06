import { useEffect, useState } from 'react';

/** Debounces a value only; it does not cancel or abort requests using that value. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
    const [debouncedValue, setDebouncedValue] = useState(() => value);
    const delay = Number.isFinite(delayMs) ? Math.max(0, delayMs) : 0;

    useEffect(() => {
        const timeout = setTimeout(() => setDebouncedValue(() => value), delay);

        return () => clearTimeout(timeout);
    }, [value, delay]);

    return debouncedValue;
}
