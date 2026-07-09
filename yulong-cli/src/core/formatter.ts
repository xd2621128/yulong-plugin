/**
 * 按字段列表过滤对象/数组
 *
 * 支持简单字段名（逗号分隔），对数组会应用到每个元素。
 * 分页结果会应用到 records 数组。
 */
export function applyFields(data: unknown, fields: string): unknown {
  const fieldList = fields.split(',').map(f => f.trim()).filter(Boolean);
  if (fieldList.length === 0) {
    return data;
  }

  function pickFields(value: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const field of fieldList) {
      if (field in value) {
        result[field] = value[field];
      }
    }
    return result;
  }

  function processItem(item: unknown): unknown {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      return pickFields(item as Record<string, unknown>);
    }
    return item;
  }

  // 分页对象：保留外层分页信息，只过滤 records
  if (
    data
    && typeof data === 'object'
    && !Array.isArray(data)
    && Array.isArray((data as Record<string, unknown>).records)
  ) {
    const pagination = data as Record<string, unknown>;
    return {
      ...pagination,
      records: (pagination.records as unknown[]).map(processItem),
    };
  }

  if (Array.isArray(data)) {
    return data.map(processItem);
  }

  return processItem(data);
}

function stringifyCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function buildMarkdownTable(rows: Record<string, unknown>[], columns: string[]): string {
  if (rows.length === 0 || columns.length === 0) {
    return '';
  }

  const header = `| ${columns.join(' | ')} |`;
  const separator = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map(row =>
    `| ${columns.map(col => stringifyCell(row[col]).replace(/\|/g, '\\|')).join(' | ')} |`,
  );

  return [header, separator, ...body].join('\n');
}

function extractRows(data: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(data)) {
    if (data.every(item => item && typeof item === 'object' && !Array.isArray(item))) {
      return data as Record<string, unknown>[];
    }
    return null;
  }

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.records)) {
      return extractRows(obj.records);
    }
  }

  return null;
}

function formatTable(data: unknown): string {
  const rows = extractRows(data);
  if (!rows || rows.length === 0) {
    return JSON.stringify(data, null, 2);
  }

  // 取所有出现过的字段作为列，优先按第一个对象的字段顺序
  const columns = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  return buildMarkdownTable(rows, columns);
}

function formatRaw(data: unknown): string {
  if (typeof data === 'string') {
    return data;
  }
  return JSON.stringify(data);
}

/**
 * 根据用户选项格式化数据
 *
 * 错误 envelope 不应调用本函数，应始终输出 JSON envelope。
 */
export function formatData(data: unknown, format: string): string {
  switch (format) {
    case 'table':
      return formatTable(data);
    case 'raw':
      return formatRaw(data);
    case 'json':
    default:
      return JSON.stringify(data, null, 2);
  }
}
