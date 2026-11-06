type NumericValue = number | null | undefined;

export type NumberFormatConfig = {
    locale?: Intl.LocalesArgument;
    options?: Intl.NumberFormatOptions;
};

export type FileSizeFormatConfig = {
    locale?: Intl.LocalesArgument;
    options?: Pick<
        Intl.NumberFormatOptions,
        'minimumFractionDigits' | 'maximumFractionDigits' | 'useGrouping'
    >;
};

function isFiniteNumber(value: NumericValue): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

export function formatNumber(
    value: NumericValue,
    { locale = 'id-ID', options }: NumberFormatConfig = {},
): string {
    if (!isFiniteNumber(value)) {
        return '-';
    }

    return new Intl.NumberFormat(locale, options).format(value);
}

/** Percent inputs are ratios: 0.125 means 12.5%, not 0.125%. */
export function formatPercent(
    value: NumericValue,
    { locale = 'id-ID', options }: NumberFormatConfig = {},
): string {
    return formatNumber(value, {
        locale,
        options: {
            ...options,
            maximumFractionDigits:
                options?.maximumFractionDigits ??
                Math.max(1, options?.minimumFractionDigits ?? 0),
            style: 'percent',
        },
    });
}

export function formatCompactNumber(
    value: NumericValue,
    { locale = 'id-ID', options }: NumberFormatConfig = {},
): string {
    return formatNumber(value, {
        locale,
        options: { ...options, notation: 'compact' },
    });
}

/** Bytes in binary units; fractional precision is bounded to 0–6 digits. */
export function formatFileSize(
    value: NumericValue,
    { locale = 'id-ID', options = {} }: FileSizeFormatConfig = {},
): string {
    if (!isFiniteNumber(value) || value < 0) {
        return '-';
    }

    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    let amount = value;
    let unitIndex = 0;

    while (amount >= 1024 && unitIndex < units.length - 1) {
        amount /= 1024;
        unitIndex += 1;
    }

    const boundedDigits = (digits: number | undefined, fallback: number) =>
        typeof digits === 'number' && Number.isFinite(digits)
            ? Math.min(6, Math.max(0, Math.trunc(digits)))
            : fallback;
    const maximumFractionDigits = boundedDigits(
        options.maximumFractionDigits,
        2,
    );
    const minimumFractionDigits = Math.min(
        maximumFractionDigits,
        boundedDigits(options.minimumFractionDigits, 0),
    );
    const formatted = formatNumber(amount === 0 ? 0 : amount, {
        locale,
        options: { ...options, minimumFractionDigits, maximumFractionDigits },
    });

    return `${formatted} ${units[unitIndex]}`;
}
