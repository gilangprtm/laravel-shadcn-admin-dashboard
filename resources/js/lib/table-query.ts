export type TableQueryState = {
    search: string;
    page: number;
    perPage: number;
    sort?: string;
    direction: 'asc' | 'desc';
    filters: Record<string, string>;
};

export type TableQueryConfig = {
    sortFields?: readonly string[];
    filterKeys?: readonly string[];
    perPageOptions?: readonly number[];
    defaultPerPage?: number;
};

const DEFAULT_PER_PAGE_OPTIONS = [10, 20, 30, 40, 50] as const;
const FILTER_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;

function allowedPerPage(config: TableQueryConfig): number[] {
    const options = (config.perPageOptions ?? DEFAULT_PER_PAGE_OPTIONS).filter(
        (value) => Number.isSafeInteger(value) && value > 0,
    );

    return options.length > 0 ? [...new Set(options)] : [10, 20, 30, 40, 50];
}

function defaultPerPage(config: TableQueryConfig): number {
    const allowed = allowedPerPage(config);

    return allowed.includes(config.defaultPerPage ?? 10)
        ? (config.defaultPerPage ?? 10)
        : (allowed[0] ?? 10);
}

function positiveSafeInteger(
    value: string | undefined,
    fallback: number,
): number {
    if (!value || !/^[1-9]\d*$/.test(value)) {
        return fallback;
    }

    const parsed = Number(value);

    return Number.isSafeInteger(parsed) ? parsed : fallback;
}

function normalizeSearch(search: string | undefined): string {
    return (search ?? '').trim();
}

function isAllowedKey(key: string, config: TableQueryConfig): boolean {
    return (
        FILTER_KEY_PATTERN.test(key) &&
        ![
            '__proto__',
            'prototype',
            'constructor',
            'search',
            'page',
            'per_page',
            'sort',
            'direction',
        ].includes(key) &&
        (config.filterKeys ?? []).includes(key)
    );
}

function normalizeState(
    state: TableQueryState,
    config: TableQueryConfig,
): TableQueryState {
    const allowedPages = allowedPerPage(config);
    const requestedPerPage =
        Number.isSafeInteger(state.perPage) && state.perPage > 0
            ? state.perPage
            : defaultPerPage(config);
    const filters: Record<string, string> = Object.create(null) as Record<
        string,
        string
    >;

    for (const key of config.filterKeys ?? []) {
        const value = Object.hasOwn(state.filters ?? {}, key)
            ? state.filters[key]
            : undefined;

        if (
            isAllowedKey(key, config) &&
            typeof value === 'string' &&
            value !== ''
        ) {
            filters[key] = value;
        }
    }

    const sort =
        typeof state.sort === 'string' &&
        (config.sortFields ?? []).includes(state.sort)
            ? state.sort
            : undefined;

    return {
        search: normalizeSearch(state.search),
        page:
            Number.isSafeInteger(state.page) && state.page > 0 ? state.page : 1,
        perPage: allowedPages.includes(requestedPerPage)
            ? requestedPerPage
            : defaultPerPage(config),
        ...(sort ? { sort } : {}),
        direction: sort && state.direction === 'desc' ? 'desc' : 'asc',
        filters,
    };
}

/** Pure scalar query parsing; duplicate wire keys use their first value. */
export function parseTableQuery(
    input: URLSearchParams | string,
    config: TableQueryConfig = {},
): TableQueryState {
    const params =
        input instanceof URLSearchParams
            ? new URLSearchParams(input)
            : new URLSearchParams(
                  input.startsWith('?') ? input.slice(1) : input,
              );
    const perPageOptions = allowedPerPage(config);
    const parsedPerPage = positiveSafeInteger(
        params.get('per_page') ?? undefined,
        defaultPerPage(config),
    );
    const state: TableQueryState = {
        search: normalizeSearch(params.get('search') ?? undefined),
        page: positiveSafeInteger(params.get('page') ?? undefined, 1),
        perPage: perPageOptions.includes(parsedPerPage)
            ? parsedPerPage
            : defaultPerPage(config),
        direction: params.get('direction') === 'desc' ? 'desc' : 'asc',
        filters: Object.create(null) as Record<string, string>,
    };
    const requestedSort = params.get('sort');

    if (requestedSort && (config.sortFields ?? []).includes(requestedSort)) {
        state.sort = requestedSort;
    }

    for (const key of config.filterKeys ?? []) {
        if (isAllowedKey(key, config)) {
            const value = params.get(key);

            if (value !== null && value !== '') {
                state.filters[key] = value;
            }
        }
    }

    return normalizeState(state, config);
}

/** Consumers must reset page on filter changes and manage obsolete requests. */
export function buildTableQuery(
    state: TableQueryState,
    config: TableQueryConfig = {},
): URLSearchParams {
    const normalized = normalizeState(state, config);
    const params = new URLSearchParams();

    if (normalized.search) {
        params.set('search', normalized.search);
    }

    params.set('page', String(normalized.page));
    params.set('per_page', String(normalized.perPage));

    if (normalized.sort) {
        params.set('sort', normalized.sort);
        params.set('direction', normalized.direction);
    }

    for (const key of config.filterKeys ?? []) {
        if (
            isAllowedKey(key, config) &&
            normalized.filters[key] !== undefined
        ) {
            params.set(key, normalized.filters[key]);
        }
    }

    return params;
}
