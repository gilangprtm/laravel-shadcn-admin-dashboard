import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSource } from './load-source.mjs';

const { formatCompactNumber, formatFileSize, formatNumber, formatPercent } =
    loadSource('resources/js/lib/formatters.ts');

test('number formatters respect Indonesian locale, compact notation, and percent ratios', () => {
    assert.equal(formatNumber(1234.5), '1.234,5');
    assert.equal(formatPercent(0.125), '12,5%');
    assert.equal(formatCompactNumber(1200), '1,2 rb');
    assert.equal(formatNumber(-1200, { locale: 'en-US' }), '-1,200');
});

test('number formatters preserve zero and reject missing or nonfinite values', () => {
    for (const value of [null, undefined, NaN, Infinity, -Infinity]) {
        assert.equal(formatNumber(value), '-');
        assert.equal(formatPercent(value), '-');
        assert.equal(formatCompactNumber(value), '-');
    }

    for (const invalid of ['', '123', false]) {
        assert.equal(formatNumber(invalid), '-');
        assert.equal(formatFileSize(invalid), '-');
    }

    assert.equal(formatPercent(0), '0%');
    assert.equal(formatPercent(-0.125), '-12,5%');
    assert.equal(
        formatPercent(0.1256, {
            locale: 'en-US',
            options: { maximumFractionDigits: 2 },
        }),
        '12.56%',
    );
    assert.equal(formatCompactNumber(0), '0');
    assert.equal(formatCompactNumber(-1200), '-1,2 rb');
    assert.equal(formatNumber(0), '0');
    assert.equal(formatNumber(-2), '-2');
});

test('percent minimum-only precision does not conflict with default maximum', () => {
    assert.equal(
        formatPercent(0.125, { options: { minimumFractionDigits: 2 } }),
        '12,50%',
    );
    assert.equal(
        formatPercent(0.125, { options: { minimumFractionDigits: 3 } }),
        '12,500%',
    );
    assert.equal(formatPercent(0.1256), '12,6%');
    assert.equal(
        formatPercent(0.1256, { options: { maximumFractionDigits: 0 } }),
        '13%',
    );
    assert.equal(
        formatPercent(0.1256, {
            options: { minimumFractionDigits: 2, maximumFractionDigits: 3 },
        }),
        '12,56%',
    );
    assert.throws(
        () =>
            formatPercent(0.125, {
                options: { minimumFractionDigits: 3, maximumFractionDigits: 1 },
            }),
        RangeError,
    );
});

test('file sizes use binary thresholds, bounded precision, and reject invalid sizes', () => {
    assert.equal(formatFileSize(0), '0 B');
    assert.equal(formatFileSize(NaN), '-');
    assert.equal(formatFileSize(undefined), '-');
    assert.equal(formatFileSize(1600), '1,56 KiB');
    assert.equal(
        formatFileSize(1536, {
            locale: 'en-US',
            options: { maximumFractionDigits: 1 },
        }),
        '1.5 KiB',
    );
    assert.equal(formatFileSize(1024 ** 8), '1 YiB');
    assert.equal(
        formatFileSize(1536, { options: { maximumFractionDigits: -1 } }),
        '2 KiB',
    );
    assert.equal(formatFileSize(1023), '1.023 B');
    assert.equal(formatFileSize(1024), '1 KiB');
    assert.equal(formatFileSize(1536), '1,5 KiB');
    assert.equal(formatFileSize(1024 ** 2), '1 MiB');
    assert.equal(formatFileSize(1024 ** 3), '1 GiB');
    assert.equal(formatFileSize(1024 ** 4), '1 TiB');
    assert.equal(formatFileSize(-1), '-');
    assert.equal(formatFileSize(Infinity), '-');
    assert.equal(formatFileSize(null), '-');
    assert.equal(
        formatFileSize(1024, { options: { maximumFractionDigits: 99 } }),
        '1 KiB',
    );
});
