import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSource } from './load-source.mjs';

const { buildTableQuery, parseTableQuery } = loadSource(
    'resources/js/lib/table-query.ts',
);
const config = {
    sortFields: ['name', 'created_at'],
    filterKeys: ['status', 'active'],
};

test('query normalizes search and roundtrips encoded Unicode and scalar filters without mutation', () => {
    const input = new URLSearchParams({
        search: '  Jawa & Bali + 日本  ',
        page: '3',
        per_page: '20',
        sort: 'name',
        direction: 'desc',
        status: '0',
        active: 'false',
        unknown: 'leak',
    });
    const before = input.toString();
    const parsed = parseTableQuery(input, config);
    const stateBefore = structuredClone(parsed);
    const built = buildTableQuery(parsed, config);

    assert.equal(parsed.search, 'Jawa & Bali + 日本');
    assert.equal(parsed.page, 3);
    assert.equal(parsed.perPage, 20);
    assert.equal(parsed.direction, 'desc');
    assert.equal(parsed.filters.status, '0');
    assert.equal(parsed.filters.active, 'false');
    assert.equal(built.has('unknown'), false);
    assert.deepEqual(parseTableQuery(built, config), parsed);
    assert.equal(input.toString(), before);
    assert.deepEqual(
        { ...parsed, filters: { ...parsed.filters } },
        stateBefore,
    );
});

test('query rejects malformed or unsafe pagination and unsupported per-page values', () => {
    for (const value of [
        '0',
        '-1',
        '1.5',
        '1e2',
        '+2',
        ' 2 ',
        '9007199254740992',
        'abc',
        '',
        '01',
    ]) {
        const parsed = parseTableQuery(
            new URLSearchParams({ page: value, per_page: value }),
        );
        assert.equal(parsed.page, 1, value);
        assert.equal(parsed.perPage, 10, value);
    }

    for (const perPage of [10, 20, 30, 40, 50]) {
        assert.equal(parseTableQuery(`per_page=${perPage}`).perPage, perPage);
    }

    assert.equal(
        parseTableQuery('page=9007199254740991').page,
        Number.MAX_SAFE_INTEGER,
    );
    assert.equal(parseTableQuery('per_page=15').perPage, 10);
    assert.equal(
        parseTableQuery('', { perPageOptions: [25, 100] }).perPage,
        25,
    );
    assert.equal(
        parseTableQuery('', { perPageOptions: [25, 100], defaultPerPage: 100 })
            .perPage,
        100,
    );
    assert.equal(
        parseTableQuery('', { perPageOptions: [-1, NaN] }).perPage,
        10,
    );
});

test('sort and direction normalize with no unapproved sort or scalar keys escaping', () => {
    assert.equal(
        parseTableQuery('sort=secret&direction=desc', config).sort,
        undefined,
    );
    assert.equal(
        parseTableQuery('sort=secret&direction=desc', config).direction,
        'asc',
    );
    assert.equal(
        parseTableQuery('sort=name&direction=DESC', config).direction,
        'asc',
    );
    assert.equal(
        parseTableQuery('sort=name&direction=desc', config).direction,
        'desc',
    );
    const state = parseTableQuery(
        'search=  &status=&active=false&other=1',
        config,
    );
    assert.equal(
        buildTableQuery(state, config).toString(),
        'page=1&per_page=10&active=false',
    );
    const invalid = {
        ...state,
        page: NaN,
        perPage: 999,
        sort: 'secret',
        filters: { other: '1' },
    };
    assert.equal(
        buildTableQuery(invalid, config).toString(),
        'page=1&per_page=10',
    );
});

test('prototype, reserved, nested, inherited and unallowlisted filter keys cannot escape', () => {
    const hostileConfig = {
        filterKeys: [
            '__proto__',
            'constructor',
            'prototype',
            'page',
            'search',
            'sort',
            'direction',
            'per_page',
            'a[b]',
            'status',
            'active',
        ],
    };
    const input =
        '__proto__=x&constructor=x&prototype=x&a%5Bb%5D=x&page=2&status=0';
    const state = parseTableQuery(input, hostileConfig);
    assert.deepEqual(Object.keys(state.filters), ['status']);
    assert.equal(Object.getPrototypeOf(state.filters), null);
    assert.equal(
        buildTableQuery(state, hostileConfig).toString(),
        'page=2&per_page=10&status=0',
    );
    state.filters = Object.create({ active: 'inherited' });
    assert.equal(buildTableQuery(state, hostileConfig).has('active'), false);
    assert.equal({}.polluted, undefined);
});
