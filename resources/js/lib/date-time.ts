const WITA_TIME_ZONE = 'Asia/Makassar';
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_INSTANT_PATTERN =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;

/** SSR uses WITA; immediate hydration in another zone can produce different output. */
export const getLocalTimeZone = (): string => {
    if (typeof window === 'undefined') {
        return WITA_TIME_ZONE;
    }

    try {
        const timeZone = new Intl.DateTimeFormat().resolvedOptions().timeZone;

        if (timeZone) {
            new Intl.DateTimeFormat('en', { timeZone });

            return timeZone;
        }
    } catch {
        // Use WITA when the browser's timezone is unavailable or unusable.
    }

    return WITA_TIME_ZONE;
};

export const localDateKey = (date: Date): string => {
    if (Number.isNaN(date.getTime())) {
        return '-';
    }

    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    };

    try {
        return new Intl.DateTimeFormat('en-CA', {
            ...options,
            timeZone: getLocalTimeZone(),
        }).format(date);
    } catch {
        return new Intl.DateTimeFormat('en-CA', {
            ...options,
            timeZone: WITA_TIME_ZONE,
        }).format(date);
    }
};

const parseInstant = (value: string | Date): Date | null => {
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    value = value.trim();

    if (
        !ISO_INSTANT_PATTERN.test(value) ||
        parseCalendarDate(value.slice(0, 10)) === null
    ) {
        return null;
    }

    const timestamp = Date.parse(value);

    return Number.isNaN(timestamp) ? null : new Date(timestamp);
};

const parseCalendarDate = (value: string): Date | null => {
    const match = ISO_DATE_PATTERN.exec(value);

    if (match === null) {
        return null;
    }

    const [, year, month, day] = match;
    const calendarDate = new Date(`${value}T00:00:00Z`);

    if (
        calendarDate.getUTCFullYear() !== Number(year) ||
        calendarDate.getUTCMonth() !== Number(month) - 1 ||
        calendarDate.getUTCDate() !== Number(day)
    ) {
        return null;
    }

    return calendarDate;
};

const formatValue = (
    value: string | Date,
    options: Intl.DateTimeFormatOptions,
): string => {
    const dateOnly =
        typeof value === 'string' ? parseCalendarDate(value) : null;

    if (dateOnly !== null) {
        return new Intl.DateTimeFormat('id-ID', {
            dateStyle: options.dateStyle,
            timeZone: 'UTC',
        }).format(dateOnly);
    }

    const instant = parseInstant(value);

    if (instant === null) {
        return '-';
    }

    try {
        return new Intl.DateTimeFormat('id-ID', {
            ...options,
            timeZone: getLocalTimeZone(),
        }).format(instant);
    } catch {
        return new Intl.DateTimeFormat('id-ID', {
            ...options,
            timeZone: WITA_TIME_ZONE,
        }).format(instant);
    }
};

export const formatLocalDate = (value: string | Date): string =>
    formatValue(value, {
        dateStyle: 'long',
    });

export const formatLocalDateTime = (value: string | Date): string =>
    formatValue(value, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
