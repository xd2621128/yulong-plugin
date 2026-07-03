/**
 * 共享类型定义
 */

/** CLI 全局选项 */
export interface GlobalOptions {
  /** 外部 accessToken（Token 模式） */
  token?: string;
  /** 请求参数 JSON 字符串 */
  json?: string;
  /** 请求参数 JSON 文件路径 */
  jsonFile?: string;
  /** 输出格式 */
  format: 'json' | 'table' | 'raw';
  /** 筛选输出字段 */
  fields?: string;
  /** 覆盖 X-ResourceMark */
  resourceMark?: string;
  /** 详细日志 */
  verbose: boolean;
  /** 调试日志 */
  debug: boolean;
  /** 仅显示解析结果 */
  dryRun: boolean;
  /** 跳过确认 */
  yes: boolean;
  /** HTTP 超时（秒） */
  timeout: number;
  /** 是否显示帮助 */
  help?: boolean;
  /** 上传文件路径（用于文件上传类命令） */
  file?: string;
}

/** 命令上下文 */
export interface CommandContext {
  /** 解析后的命令名 */
  command: string;
  /** 模块 */
  module: string;
  /** 资源 */
  resource: string;
  /** 动作 */
  action: string;
  /** 全局选项 */
  options: GlobalOptions;
  /** 原始参数 */
  args: string[];
}

/** 统一输出 envelope */
export interface Envelope<T = unknown> {
  ok: boolean;
  data?: T;
  error?: {
    type: string;
    message: string;
    detail?: Record<string, unknown>;
  };
  dryRun?: boolean;
  asOf: string;
}

/** token 信息 */
export interface TokenInfo {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  orgId?: string;
}

/** api_permissions 表记录 */
export interface ApiPermission {
  id?: number;
  module: string;
  resource: string;
  action: string;
  command_name: string;
  method: string;
  path: string;
  required_permissions: string;
  match_mode: 'any' | 'all';
  is_dangerous: number;
  needs_resource_mark: number;
  resource_mark?: string;
  description?: string;
}

/** 用户权限缓存 */
export interface UserPermission {
  userid: string;
  permissions: string;
}

/** HTTP 请求配置 */
export interface RequestConfig {
  method: string;
  url: string;
  params?: Record<string, unknown>;
  body?: Record<string, unknown> | FormData;
  headers?: Record<string, string>;
  timeout?: number;
  /** 当前用户，用于 token 过期后自动重新登录 */
  userid?: string;
  /** Token 模式下禁用自动刷新/重试 */
  skipAuthRetry?: boolean;
}

/** 权限检查结果 */
export interface PermissionCheckResult {
  passed: boolean;
  required: string[];
  matchMode: 'any' | 'all';
  userHas: string[];
  missing?: string[];
}
