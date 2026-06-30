import { describe, it, expect } from 'bun:test';
import { applyFields, formatData } from './formatter';

describe('applyFields', () => {
  it('filters top-level fields on an object', () => {
    const data = { a: 1, b: 2, c: 3 };
    expect(applyFields(data, 'a,c')).toEqual({ a: 1, c: 3 });
  });

  it('filters every item in an array', () => {
    const data = [
      { name: 'A', age: 1 },
      { name: 'B', age: 2 },
    ];
    expect(applyFields(data, 'name')).toEqual([{ name: 'A' }, { name: 'B' }]);
  });

  it('filters records inside a pagination object', () => {
    const data = {
      currentPage: 1,
      pageSize: 10,
      total: 2,
      records: [
        { id: '1', name: 'A', extra: 'x' },
        { id: '2', name: 'B', extra: 'y' },
      ],
    };
    expect(applyFields(data, 'id,name')).toEqual({
      currentPage: 1,
      pageSize: 10,
      total: 2,
      records: [
        { id: '1', name: 'A' },
        { id: '2', name: 'B' },
      ],
    });
  });

  it('returns data unchanged when fields is empty', () => {
    const data = { a: 1 };
    expect(applyFields(data, '')).toEqual(data);
  });
});

describe('formatData', () => {
  it('formats as pretty JSON by default', () => {
    const data = { a: 1 };
    expect(formatData(data, 'json')).toBe(JSON.stringify(data, null, 2));
  });

  it('formats as compact JSON for raw', () => {
    const data = { a: 1 };
    expect(formatData(data, 'raw')).toBe(JSON.stringify(data));
  });

  it('returns string as-is for raw', () => {
    expect(formatData('hello', 'raw')).toBe('hello');
  });

  it('formats arrays as markdown table', () => {
    const data = [
      { name: 'A', age: 1 },
      { name: 'B', age: 2 },
    ];
    const output = formatData(data, 'table');
    expect(output).toContain('| name | age |');
    expect(output).toContain('| A | 1 |');
    expect(output).toContain('| B | 2 |');
  });

  it('falls back to JSON for non-object arrays', () => {
    const data = [1, 2, 3];
    expect(formatData(data, 'table')).toBe(JSON.stringify(data, null, 2));
  });
});
