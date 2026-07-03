# 御龙 Plugin — 开发计划

> 本文件记录从需求分析到架构设计的完整上下文，是开发的唯一事实源。

---

## 0. 参考项目

| 项目 | 路径 | 说明 |
|------|------|------|
| **目标前端工程** | `/Users/xudi/Pubinfo/project/vue/pubinfo-web` | 御龙网站前端 Vue 工程，API 接口、权限码、路由定义的来源 |
| **参考模板（dws）** | `/Users/xudi/.agents/skills/dws` | 钉钉 Skill 模板，目录结构、SKILL.md 写法、参考文档组织的参考 |

---

## 1. 项目概述

为御龙网站创建一套 **CLI + Skill 插件**，将网站全部 API 包装为原子能力模块，供内部大模型项目调用。

**核心要求：**
- 双 token（access + refresh）自动管理
- 统一 JSON envelope 输出
- **Skill 层权限预检**（第一道防线，后端数据权限不可控）
- CLI 从御小龙约定数据库读取 `userid`，调 SSO 接口获取 token、自动刷新、调接口
- CLI 编译为单二进制，零依赖部署

**产物：**
| 产物 | 类型 | 职责 |
|------|------|------|
| `yulong-cli` | 独立 CLI 二进制 | HTTP 请求、token 管理、权限预检、JSON 输出 |
| `yulong-skill` | 御小龙 Skill | 意图路由、参数构造、调用 CLI、结果解析 |

---

## 2. 目录结构

```
yulong-plugin/
├── .plan/
│   └── plan.md                      # 本文件：开发计划
│
├── yulong-cli/                      # CLI 二进制项目（Bun + TypeScript）
│   ├── package.json                 # Bun 项目配置
│   ├── tsconfig.json                # TypeScript 配置
│   ├── build.ts                     # 编译脚本（bun build --compile）
│   ├── README.md                    # CLI 使用文档
│   ├── src/
│   │   ├── index.ts                 # CLI 入口（argparse 路由）
│   │   ├── auth.ts                  # 认证模块（SSO + token 管理）
│   │   ├── token-manager.ts         # Token 生命周期管理
│   │   ├── permission-guard.ts      # 权限预检（第一道防线）
│   │   ├── api-client.ts            # HTTP 客户端（fetch + 拦截器）
│   │   ├── db.ts                    # SQLite 数据库操作（bun:sqlite）
│   │   ├── envelope.ts              # 统一 JSON 输出格式
│   │   ├── logger.ts                # stderr 日志
│   │   ├── schema.ts                # 命令发现（yulong schema）
│   │   └── commands/                # 业务命令（按需逐个实现）
│   │       ├── auth.ts              # auth login / logout / status / switch-org
│   │       └── rbac/                # 用户/角色/组织/权限
│   │           └── user.ts          # user page / info / add / update / delete
│   └── data/                        # 运行时数据（CLI 自动创建）
│       ├── users.db                 # SQLite 数据库（用户映射、权限缓存、接口映射）
│       └── tokens.local.json        # 运行时 token 存储
│
└── yulong-skill/                # 御小龙 Skill
    ├── SKILL.md                     # 触发条件 + 意图路由 + 调用约定
    ├── config.json                  # 公开配置（baseUrl、超时）
    ├── secrets.local.template.json    # 密钥模板（appKey/appSecret）
    └── references/
        ├── global-reference.md        # 认证机制、输出格式、环境变量
        ├── error-codes.md             # 错误码 + 调试流程
        ├── intent-guide.md            # 意图路由指南（易混淆场景对照）
        ├── recovery-guide.md          # recovery 闭环规范
        └── products/                  # 按业务域拆分的接口文档（按需创建）
            ├── rbac.md                # 用户/角色/组织/权限
            ├── daily.md               # 日常办公
            ├── pm.md                  # 项目管理
            ├── finance.md             # 财务
            └── hr.md                  # 人力

# 独立项目：权限映射提取工具
extract-api-permissions/             # 可独立使用
├── extract-api-permissions.ts       # 主脚本
├── extract-api-permissions.types.ts # 类型定义
├── url-resource-map.json            # URL resource 映射配置
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

---

## 2.1 配置文件定义

### `config.json`（公开配置）

存放环境相关配置，不涉密，随 Skill 仓库提交。

```json
{
  "baseUrl": "http://172.16.29.148:9101",
  "timeout": 30,
  "userDbPath": "",
  "logLevel": "info"
}
```

| 字段 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `baseUrl` | string | 御龙后端 API 基础地址 | 空，必须配置 |
| `timeout` | number | HTTP 请求超时（秒） | 30 |
| `userDbPath` | string | 御小龙用户数据库路径（空表示未配置） | 空 |
| `logLevel` | string | stderr 日志级别：debug / info / warn / error | info |

### `secrets.local.template.json`（密钥模板）

敏感信息模板，提交时仅保留模板，实际密钥文件 `secrets.local.json` 加入 `.gitignore`。

> **待 SSO 接口确定后确认是否需要 `appKey`/`appSecret`。如 SSO 接口不需要，可从模板中删除这两个字段。**

```json
{
  "appKey": "<your-app-key>",
  "appSecret": "<your-app-secret>"
}
```

| 字段 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `appKey` | string | 应用标识（SSO 接口可能需要，待确认） | 空 |
| `appSecret` | string | 应用密钥（SSO 接口可能需要，待确认） | 空 |

**实际使用时：**
1. 复制 `secrets.local.template.json` → `secrets.local.json`
2. 等 SSO 接口确定后，确认是否需要 `appKey`/`appSecret`
3. 如不需要 → 从 `secrets.local.json` 中删除这两个字段
4. 如需要 → 填入真实密钥
3. `secrets.local.json` 加入 `.gitignore`，不提交到仓库

### `tokens.local.json`（CLI 运行时创建）

> **项目仅存在单用户场景，tokens.local.json 只存储一个用户的 token。**

存储在 CLI 的 `data/` 目录下，CLI 自动管理，**不手动编辑**。

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresAt": "2026-01-15T12:00:00Z",
  "orgId": "org_001"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `accessToken` | string | 访问令牌 |
| `refreshToken` | string | 刷新令牌 |
| `expiresAt` | string | accessToken 过期时间（ISO 8601） |
| `orgId` | string | 当前组织 ID |

> 注意：`X-ResourceMark` 不是用户级固定配置，不存储在 `tokens.local.json` 中。每个命令的 `X-ResourceMark` 值由 `api_permissions.resource_mark` 字段决定。

---

## 3. 技术栈

### CLI（yulong-cli）

| 组件 | 技术 | 说明 |
|------|------|------|
| 运行时 | Bun | 内置 fetch、SQLite、TypeScript |
| 打包 | `bun build --compile` | 单二进制，零依赖。支持交叉编译（默认目标 Linux x64） |
| HTTP | 内置 `fetch` | 原生支持，无需 axios |
| 数据库 | `bun:sqlite` | 用户映射、权限缓存 |
| 配置 | 本地 JSON 文件 | `config.json`、`tokens.local.json` |

**编译平台：**

| 环境 | 平台 | 说明 |
|------|------|------|
| 开发机 | macOS arm64 | 开发者常用 Mac |
| 部署机（默认） | Linux x64 | 服务器常见环境，可调整 |
| 交叉编译 | `--target` | 开发机直接编译部署目标，无需在部署机上装 Bun |

**编译命令：**
```bash
# 默认：macOS 开发机编译 Linux x64 部署目标
bun build --compile --target=bun-linux-x64 src/index.ts --outfile yulong

# 其他平台（按需调整）
--target=bun-darwin-arm64   # macOS Apple Silicon（本地开发调试）
--target=bun-darwin-x64     # macOS Intel
--target=bun-linux-arm64    # Linux arm64（如 ARM 服务器）
。--target=bun-windows-x64    # Windows x64
```

### `yulong auth import-token` 命令（SSO 未上线前的降级方案）

**作用：** 当 SSO 接口尚未提供时，通过手动注入 token 来跳过登录，直接进行业务接口开发测试。

**使用场景：**
1. 从前端浏览器 DevTools → Network → 复制当前登录用户的 `accessToken` 和 `refreshToken`
2. 或向管理员申请临时 token
3. 通过 CLI 手动注入，无需等待 SSO 接口

**命令格式：**
```bash
yulong auth import-token --access-token <token> --refresh-token <token> --expires-at <ISO8601> [--org-id <id>]
```

| 参数 | 说明 | 示例 |
|------|------|------|
| `--access-token` | 访问令牌（必填） | `eyJhbGciOiJIUzI1NiIs...` |
| `--refresh-token` | 刷新令牌（必填） | `eyJhbGciOiJIUzI1NiIs...` |
| `--expires-at` | accessToken 过期时间（ISO 8601） | `2026-01-15T12:00:00Z` |
| `--org-id` | 当前组织 ID（可选） | `org_001` |

**注入后：**
- 写入 `data/tokens.local.json`
- 后续业务调用直接使用该 token，走正常刷新逻辑
- token 过期后：如果 SSO 接口已上线 → 自动调 SSO 刷新；如果 SSO 未上线 → 需重新 `import-token`

---

### Skill（yulong-skill）

| 组件 | 技术 | 说明 |
|------|------|------|
| 意图路由 | SKILL.md | 自然语言 → CLI 命令 |
| 参考文档 | Markdown | 产品命令详细说明 |

---

## 4. CLI 设计

### 4.1 命令结构

```
yulong <module> <resource-segments...> <action> [options]
```

> 命令不再强制三段式。resource 可包含多个子段，用空格分隔。

**示例：**

```bash
yulong rbac user userPage --json '{"currentPage":1,"pageSize":10}'
yulong rbac user changePassword --json '{"...":"..."}'
yulong daily travel travelRecord add --json '{"...":"..."}'
```

解析规则：
- `module` = 第一个位置参数
- `action` = 最后一个位置参数
- `resource` = 中间所有位置参数用 `.` 连接

**`userid` 从哪来？**

御小龙（Agent）和 CLI **约定一个数据库路径**（通过环境变量或配置文件），御小龙的数据库中存储了当前用户的 `userid`。CLI 从该约定路径读取数据库，获取当前用户标识。

**约定方式：**

| 方式 | 配置项 | 说明 |
|------|--------|------|
| 环境变量 | `YULONG_USER_DB_PATH` | 御小龙设置，指向其用户数据库文件 |
| 配置文件 | `config.json` 中的 `userDbPath` | 部署时一次性配置 |

**读取优先级：**

| 优先级 | 来源 | 说明 |
|--------|------|------|
| 1 | `--userid <id>` | 命令行显式指定，覆盖一切 |
| 2 | `YULONG_USERID` 环境变量 | CI/CD 或容器环境使用 |
| 3 | **约定数据库** | CLI 从 `YULONG_USER_DB_PATH` 指向的数据库读取当前用户 |

**约定数据库中的用户配置：**

```sql
-- 御小龙的数据库中预先配置好的用户映射（仅存储标识和配置，无需密码）
INSERT INTO users (userid, org_id, default_org_id)
VALUES ('alice', 'org_001', 'org_001');
```

CLI 启动时：
1. 检查 `YULONG_USER_DB_PATH` 是否设置
2. 未设置 → 报错：`"未配置用户数据库路径，请设置 YULONG_USER_DB_PATH 环境变量"`
3. 从该路径读取数据库，获取唯一用户

**示例：**
```bash
# 御小龙设置环境变量后调用 CLI
export YULONG_USER_DB_PATH=/path/to/agent/users.db

# 所有命令无需 --userid，CLI 自动使用数据库中的唯一用户
yulong auth login                    # 自动使用唯一用户
yulong auth status
yulong rbac user userPage --json '{"currentPage":1,"pageSize":10}'
yulong rbac user info --id 123

# 切换组织
yulong auth switch-org --org-id org_002
```

### 4.2 全局 Flag

| Flag | 短名 | 说明 | 默认 |
|------|:---:|------|------|
| `--userid <id>` | | 用户标识（仅特殊场景使用，通常无需指定） | 从约定数据库读取唯一用户 |
| `--json <json>` | | 请求参数（JSON 字符串） | 无 |
| `--json-file <path>` | | 请求参数（从 JSON 文件读取） | 无 |
| `--format json` | `-f` | 输出格式: json / table / raw | json |
| `--fields <list>` | | 筛选输出字段（逗号分隔） | 无 |
| `--resource-mark <mark>` | | 覆盖 `X-ResourceMark` 请求头（用于多页面复用接口的精确上下文控制） | 使用 `api_permissions.resource_mark` |
| `--verbose` | `-v` | 详细日志输出到 stderr | false |
| `--debug` | | 调试日志 | false |
| `--dry-run` | | 仅显示命令解析结果，不执行 | false |
| `--yes` | `-y` | 危险操作确认（跳过交互） | false |
| `--timeout <sec>` | | HTTP 超时（秒） | 30 |

### 4.3 参数输入方式

**`--json` 与 `--json-file` 的用法：**

| 方式 | 命令 | 适用场景 |
|------|------|----------|
| **命令行直接传** | `yulong rbac user userPage --json '{"currentPage":1,"pageSize":10}'` | 简单参数，无嵌套引号 |
| **从文件读取** | `yulong rbac user userPage --json-file ./params.json` | 复杂参数、长 JSON、避免转义 |
| **stdin 管道** | `echo '{"currentPage":1}' | yulong rbac user userPage --json -` | 脚本编排、动态生成参数 |

**`--json` 的转义技巧：**
```bash
# 单层引号（推荐）
yulong rbac user userPage --json '{"currentPage":1,"pageSize":10}'

# 双层嵌套（需要转义）
yulong rbac user userPage --json '{"name":"Alice","tags":["admin","dev"]}'

# 复杂参数建议用 --json-file
```

**`--json-file` 示例：**
```json
// params.json
{
  "page": 1,
  "size": 10,
  "filters": {
    "orgId": "org_001",
    "status": ["active", "pending"]
  }
}
```

```bash
yulong rbac user userPage --json-file ./params.json
```

---

### 4.4 输出格式

**stdout 只输出 JSON：**

```json
// 成功
{
  "ok": true,
  "data": { ... },
  "asOf": "2026-01-15T10:30:00Z"
}

// 失败：权限不足（Skill 层拦截）
{
  "ok": false,
  "error": {
    "type": "permission_denied",
    "message": "用户 alice 无权执行 rbac.user.delete",
    "detail": {
      "command": "rbac.user.delete",
      "required": ["user_remove"],
      "user_has": ["user_page", "user_edit"]
    }
  },
  "asOf": "2026-01-15T10:30:00Z"
}

// 失败：token 过期
{
  "ok": false,
  "error": {
    "type": "auth_required",
    "message": "token 已过期，请重新登录"
  },
  "asOf": "2026-01-15T10:30:00Z"
}

// 失败：后端业务错误
{
  "ok": false,
  "error": {
    "type": "backend_error",
    "code": 400001007,
    "message": "访问未授权"
  },
  "asOf": "2026-01-15T10:30:00Z"
}
```

**stderr 写日志：**
```
[2026-01-15T10:30:00Z] [INFO] 用户 alice 调用 rbac.user.userPage
[2026-01-15T10:30:00Z] [DEBUG] token 未过期，直接使用
[2026-01-15T10:30:00Z] [INFO] 权限检查通过：user_page ∈ [user_page, user_edit, user_add]
```

### 4.5 命令发现（`yulong schema`）

**数据来源：** 从 `api_permissions` 表动态读取，不需要硬编码。

**实现方式：** `yulong-cli/src/schema.ts` 读取 `api_permissions` 表，按 `module` 分组生成命令列表。

**命令格式：**
```bash
# 列出所有命令
yulong schema --format json

# 查看某个命令的详细用法
yulong rbac user userPage --help
```

**`yulong schema` 输出格式：**
```json
{
  "ok": true,
  "data": {
    "total": 3,
    "modules": {
      "rbac": {
        "commands": [
          {
            "name": "rbac user userPage",
            "commandName": "rbac.user.userPage",
            "description": "用户分页查询",
            "method": "POST",
            "path": "/rbac/user/userPage",
            "example": "yulong rbac user userPage --json '{\"currentPage\":1,\"pageSize\":10}' --format json",
            "enabled": false,
            "permissionConfigured": false
          }
        ]
      }
    }
  },
  "asOf": "2026-01-15T10:30:00Z"
}
```

**实现要点：**
- `schema` 命令不需要 `userid`（不调用后端，只读取本地 `api_permissions` 表）
- 按 `module → resource → action` 层级分组展示
- 与 `api_permissions` 表实时同步，实现接口后 schema 自动包含该命令
- `--help` 的实现方式：当解析到 `--help` 时，查找该命令在 `api_permissions` 中的记录，输出用法说明
- `enabled` = `required_permissions.length > 0`，表示该命令是否已开放
- `permissionConfigured` = `enabled`

---

### 4.6 `--dry-run` 输出格式

**作用：** 只显示命令解析结果，**不执行 HTTP 请求**。用于验证命令解析、参数构造、权限检查是否正确。

**输出格式（JSON）：**

```json
{
  "ok": true,
  "dryRun": true,
  "data": {
    "command": "rbac.user.delete",
    "user": "alice",
    "tokenStatus": "valid",
    "permissions": {
      "required": ["user", "user_remove"],
      "matchMode": "all",
      "userHas": ["user", "user_page", "user_edit", "user_remove"],
      "passed": true
    },
    "request": {
      "method": "GET",
      "url": "http://172.16.29.148:9101/rbac/user/userDelete",
      "headers": {
        "X-ResourceMark": "user"
      },
      "params": { "userId": "123" }
    },
    "notes": [
      "危险操作：删除用户，需 --yes 确认"
    ]
  },
  "asOf": "2026-01-15T10:30:00Z"
}
```

| 字段 | 说明 |
|------|------|
| `command` | 解析后的完整命令名 |
| `user` | 使用的用户标识 |
| `tokenStatus` | token 状态：valid / expired / missing |
| `permissions` | 权限检查结果 |
| `request` | 将要发送的 HTTP 请求详情 |
| `notes` | 备注信息（如危险操作提示、未配置权限映射警告） |

**使用场景：**
- 开发测试：验证命令解析是否正确
- 权限排查：确认权限是否足够
- 参数检查：确认请求参数构造是否正确
- 演示：不实际操作，展示将要执行的动作

---

## 5. 认证与 Token 管理

### 5.1 认证方式（SSO 单点登录）

> **项目仅存在单用户场景，token 始终只缓存一个用户。**

**后端将提供 SSO 接口，通过 `userid` 直接获取双 token。**

目前 SSO 接口尚未提供，具体参数和路径待定。预计流程：

```
CLI 从约定数据库读取 userid（如 alice）
    ↓
调 SSO 接口（待定）→ 传入 userid → 返回 accessToken + refreshToken
    ↓
存入 tokens.local.json
    ↓
后续业务调用自动管理 token 生命周期
```

**已确定的接口（前端现有）：**

| 接口 | 方法 | 路径 | 说明 | 是否阻塞 |
|------|------|------|------|----------|
| SSO 登录 | 待定 | 待定 | 通过 userid 获取双 token | **阻塞 Phase 1** |
| 刷新访问令牌 | POST | `/auth/token/refresh` | 参数：refreshToken | 已确定 |
| 切换登录组织 | POST | `/auth/changeLoginOrg` | 参数：orgId，返回新 token | 已确定 |
| 登出 | POST | `/auth/loginOut` | 清除服务端会话 | 已确定 |
| 判断缓存token是否有效 | GET | `/auth/checkCacheToken` | 检查 token 有效性 | 已确定 |

**登录方案调整说明：**
- 不再需要密码登录、RSA 公钥加密、验证码等复杂流程
- `users` 表中无需存储 `login_name`、`password` 等敏感字段
- SSO 接口上线前，可用 mock 方式或临时 token 进行业务接口开发测试
- SSO 接口提供后，替换为真实调用即可

### 5.2 Token 生命周期

```
业务调用 → 检查 access 是否过期（提前 5 分钟缓冲）
    ├─ 未过期 → 直接调用
    └─ 过期 → 用 refresh 获取新 access → 重试原请求
    ↓
遇 400001006 (ACCESS_TOKEN_INVALID) → 再试一次 refresh → 成功则重试，失败则返回 auth_required
    ↓
遇 400001004 (LOGIN_TOKEN_INVALID, refreshToken 过期)
    → 返回 auth_required
    → 提示用户："token 已过期，请重新登录（SSO 接口自动获取新 token）"
    ↓
SSO 接口上线后：自动重登（通过 userid 调 SSO 获取新 token）→ 重试原请求
```

**Token 有效期（参考前端）：**
- Access Token：服务端控制，前端通过 `expired(code)` 判断 `code === 400001006`
- Refresh Token：服务端控制，过期码 `400001004`

**自动重登（待 SSO 接口提供后实现）：**
- SSO 接口通过 userid 获取新 token，无需密码
- 用户无感知，CLI 内部自动完成
- SSO 接口上线前，refreshToken 过期后返回 `auth_required`，需御小龙触发重新登录

### 5.3 数据库存储

> **项目仅存在单用户场景，数据库中始终只有一个用户记录。**

**`users.db` — SQLite 数据库（CLI 本地管理）：**

```sql
-- 用户映射表（由御小龙预配置，仅存储用户标识和基本配置）
CREATE TABLE users (
  userid TEXT PRIMARY KEY,         -- 用户标识（如 alice），由御小龙预配置，始终只有一条记录
  org_id TEXT,                     -- 当前组织ID
  default_org_id TEXT,             -- 默认组织ID
  created_at TEXT,
  updated_at TEXT
);

-- 用户权限缓存（从 /rbac/resource/grantedResources 获取，与 token 生命周期绑定）
CREATE TABLE user_permissions (
  userid TEXT PRIMARY KEY,          -- 单用户场景下始终只有一条记录
  permissions TEXT NOT NULL,       -- JSON 数组: ["user_add", "user_edit", ...]
  fetched_at TEXT NOT NULL        -- 最后获取时间（仅用于审计，不做 TTL 判断）
);

-- 接口权限映射表（实现一个接口，填充一条映射）
CREATE TABLE api_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  module TEXT NOT NULL,            -- rbac / daily / pm / finance / hr / auth
  resource TEXT NOT NULL,          -- user / businesstrip / project / org / role
  action TEXT NOT NULL,            -- page / info / add / update / delete / login / logout
  command_name TEXT NOT NULL,      -- 完整命令名：rbac.user.userPage
  method TEXT NOT NULL,            -- GET / POST / PUT / DELETE
  path TEXT NOT NULL,              -- /rbac/user/userPage
  required_permissions TEXT NOT NULL, -- JSON 数组
  match_mode TEXT NOT NULL DEFAULT 'any', -- 'any'(任一) / 'all'(全部)
  is_dangerous INTEGER DEFAULT 0,  -- 1 = 危险操作（需 --yes）
  needs_resource_mark INTEGER DEFAULT 1, -- 1 = 需要 X-ResourceMark 头（默认全局开启，特殊接口可关闭）
  resource_mark TEXT,              -- X-ResourceMark 值，来自命令 resource 对应页面的 router meta.auth
  description TEXT,
  created_at TEXT,
  UNIQUE(command_name)
);
```

---

## 6. 权限预检方案（第一道防线）

### 6.1 为什么需要

后端数据权限判断不可控。Skill 作为**可控的第一道防线**，在请求发送到后端之前做权限校验。

### 6.2 预检流程

```
用户请求: yulong rbac user delete --id 123 --yes
    ↓
[1] CLI 从 users.db 读取当前用户（如 alice）
    ↓
[2] 查 user_permissions: alice 有哪些权限？
    ├─ 无记录 / token 已过期或失效 → 调 GET /rbac/resource/grantedResources → 更新缓存
    └─ 有记录且 token 有效 → 继续
    ↓
[2] 查 api_permissions: rbac.user.delete 需要什么权限？
    ├─ 无记录 → 警告"该接口未配置权限映射"，继续调后端（降级模式）
    └─ 有记录 → 继续
    ↓
[3] 权限对比
    ├─ 满足 → 调后端接口
    └─ 不满足 → 直接返回 403，不发送到后端
```

**权限缓存与 token 生命周期绑定：**
- 登录成功时 → 调 `grantedResources` 获取权限 → 写入 `user_permissions`
- token 自动刷新时 → 同步刷新权限缓存
- token 过期/失效（包括自动重登失败）→ 权限缓存视为失效，下次调用时重新获取
- 切换组织（`auth switch-org`）→ 强制刷新权限缓存（组织变更可能影响权限）

### 6.3 CLI 命令全自动生成

所有 CLI 命令通过 `extract-api-permissions` 脚本自动从前端工程生成，**无需人工复核 command_name**。

#### 生成规则

```text
command_name = URL 路径各段保留原始大小写后用 . 连接
resource     = module 与 action 之间的 URL 路径段（辅助列，不用于唯一标识）
action       = URL 最后一段语义（辅助列，用于危险操作判断和意图生成）
```

例如：

```text
/rbac/user/userPage                  → rbac.user.userPage
/rbac/user/info                      → rbac.user.info
/rbac/user/userDelete                → rbac.user.userDelete
/daily/travel/travelRecord/add       → daily.travel.travelRecord.add
/pm/project/selfManagement/page      → pm.project.selfManagement.page
```

#### 生成流水线

```bash
# 1. 全量生成
cd extract-api-permissions
bun run extract-api-permissions.ts --input <frontend-src> --output ./extracted

# 2. 直接入库（所有命令 schema 可见但默认不开放）
bun sqlite3 ../yulong-cli/data/users.db < ./extracted/candidates.sql

# 3. 查看 schema
yulong schema --format json
```

#### 默认字段值

命令生成时，权限相关字段使用以下默认值：

| 字段 | 默认值 | 含义 |
|------|--------|------|
| `required_permissions` | `[]` | 未配置权限，命令未开放 |
| `match_mode` | `'any'` | 空权限时不影响判断 |
| `resource_mark` | `''` | 未配置 X-ResourceMark |
| `needs_resource_mark` | `1` | 默认发送头（值为空） |
| `is_dangerous` | `0` / `1` | 仅当 `action = 'delete'` 时为 1 |

### 6.4 命令开放流程

命令默认不开放。开放一个命令需要：

1. **补充权限 SQL**

```sql
-- 需要权限
UPDATE api_permissions
SET required_permissions = '["unclaimed-business","user"]',
    match_mode = 'any',
    resource_mark = 'user'
WHERE command_name = 'rbac.user.userPage';

-- 或明确公开
UPDATE api_permissions
SET required_permissions = '["all"]'
WHERE command_name = 'rbac.user.userPage';
```

2. **标记危险操作（如需）**

```sql
UPDATE api_permissions
SET is_dangerous = 1
WHERE command_name = 'rbac.user.resetPassword';
```

3. **更新 Skill 意图示例（可选）**

在 `yulong-skill/references/intent-mapping.json` 中该命令的 `enabled` 标记为 `true`。

### 6.5 白名单权限策略

CLI 采用白名单策略：

| `required_permissions` | 行为 |
|---------------------|------|
| `[]` | 拒绝，命令未开放 |
| `['all']` | 放行，公开接口 |
| `['xxx', 'yyy']` | 按 `match_mode` 检查用户权限 |

### 6.6 Agent 意图匹配

`extract-api-permissions` 同时生成 `intent-mapping.json`：

```json
{
  "commandName": "rbac.user.userPage",
  "command": "rbac user userPage",
  "description": "用户分页查询",
  "intents": ["查询用户列表", "用户分页", "列出用户"],
  "params": {"currentPage": 1, "pageSize": 10},
  "enabled": false
}
```

Agent 优先匹配 `enabled=true` 的命令。未开放命令即使匹配到，CLI 也会返回 `permission_denied`。

**注意：** agent 不应通过 `command_name` 理解语义，而是通过 `description` 和 `intents` 匹配。

| 策略 | 说明 | 推荐度 |
|------|------|--------|
| 每次调用前刷新 | 最安全，但多一次请求 | 低 |
| 5 分钟 TTL | 平衡安全与性能 | 中 |
| **登录时刷新，直到 token 过期** | 性能最好，权限与登录会话一致 | **高** |

**采用"登录时刷新，直到 token 过期"。**

**理由：**
- 御龙系统的权限变更频率较低，与登录会话绑定足够安全
- 减少不必要的 `grantedResources` 请求，提升 CLI 响应速度
- token 刷新时同步刷新权限，保持权限与登录状态一致
- 切换组织时强制刷新，处理组织变更导致的权限变化

**实现要点：**
- `user_permissions` 表不再依赖 `fetched_at` / `expires_at` 做 TTL 判断
- 权限缓存与 `tokens.local.json` 中的 token 绑定：调用时检查 `tokens.local.json` 是否存在有效 token（未过期），如果 token 已过期或不存在 → 权限缓存视为失效，重新获取
- token 自动刷新（`refreshToken` 成功）→ 同步调 `grantedResources` 刷新权限
- token 失效且自动重登失败 → 权限缓存标记为失效，下次调用时重新获取

### 6.7 未配置映射的接口处理

`api_permissions` 表中没有该接口的映射时：
- **拒绝调用**，返回 `not_found` 错误
- 要求先通过 `extract-api-permissions` 生成并入库

### 6.8 防御层级

| 层级 | 机制 | 实现位置 | 可控性 |
|------|------|----------|--------|
| **第一层** | **Skill 权限预检** | `permission-guard.ts` | ✅ 完全可控 |
| **第二层** | 后端 RBAC（最终防线） | 御龙后端 API | ⚠️ 不可控 |
| **第三层** | CLI 透明传递 + 清晰报错 | `api-client.ts` | ✅ 可控 |
| **第四层** | 危险操作确认 | `--yes` 标志 | ✅ 可控 |
| **第五层** | 审计日志 | `logger.ts` stderr 输出 | ✅ 可控 |

---

## 7. 数据权限（X-ResourceMark）

### 7.1 前端机制

前端通过 `maybeSetAuthData` 在请求头中设置 `X-ResourceMark`：

```ts
// apps/rbac/src/api/helper.ts
export function maybeSetAuthData(method: RequestMethod) {
  const settingsStore = useSettingsStore();
  method.config.headers['X-ResourceMark'] = method.config.headers['X-ResourceMark'] || settingsStore.auth;
}
```

`maybeSetAuthData` 在 `api/factory.ts` 的 `assignToken` 中被调用，**每个请求都会执行**。

`settingsStore.auth` 来自当前路由的 `meta.auth`，在 `router/guard/afterEach.ts` 中设置：

```ts
// apps/rbac/src/router/guard/afterEach.ts
const auth = to.meta.auth;
settingsStore.setAuth(auth || '');
```

**结论：**
- `X-ResourceMark` 默认值 = **当前页面的 `router.meta.auth`**
- 它表示"当前调用所在的页面/资源上下文"，用于后端数据范围控制
- 不是用户级固定配置，也不是从权限检查条件中选取

### 7.2 显式覆盖

部分接口会在调用时显式覆盖 `X-ResourceMark`：

```ts
// 例如
postProjectBusinessSelfManagement(params, {
  headers: { 'X-ResourceMark': 'business-list' }
})
```

常见覆盖值：`'business-list'`、`'branch-business'`、`'bid-approval'`、`'achievements-list'`、`'outsource_project_instruction'` 等。

这说明同一个 API 在不同页面/组件中被调用时，可能发送不同的 `X-ResourceMark`。

### 7.3 CLI 实现策略

CLI 没有"当前页面"的概念，但命令结构中的 `resource` 本身就代表业务资源/页面上下文：

```text
yulong rbac user userPage
      ↑     ↑    ↑
    module resource action
```

**`X-ResourceMark` 取值规则：**

```text
X-ResourceMark = 命令 resource 对应的路由页面权限码（router.meta.auth）
```

例如：

| 命令 | resource | 对应 router 页面 | meta.auth | X-ResourceMark |
|------|----------|-----------------|-----------|----------------|
| `rbac user userPage` | `user` | `views/user/index.vue` | `user` | `user` |
| `daily businesstrip add` | `businesstrip` | `views/daily_manage/businesstrip/index.vue` | `dailyaduit_businesstrip` | `dailyaduit_businesstrip` |
| `log login_history page` | `login_history` | `views/log_center/login_history.vue` | `login_history` | `login_history` |

**数据表设计：**

```sql
ALTER TABLE api_permissions ADD COLUMN resource_mark TEXT;
```

| 字段 | 说明 |
|------|------|
| `needs_resource_mark` | 是否发送 `X-ResourceMark` 头，默认 `1` |
| `resource_mark` | 实际发送的 `X-ResourceMark` 值 |

**填充规则：**

1. 提取脚本根据命令 `resource` 查找 router 中对应页面的 `meta.auth`
2. 如果找到，填入 `resource_mark`
3. 如果同一 API 在多个页面被调用，取**主调用位置**（primary caller）对应页面的 `meta.auth`
4. 如果主调用位置不明确或找不到映射，标记 `need_review`

**不再从 `tokens.local.json` 读取 `resourceMark`**，因为它不是用户级固定配置。

### 7.4 多页面复用处理

以 `postRbacUserUserPage` 为例：

```json
{
  "callers": [
    "views/pm/business/business/components/claimed-modal.vue",
    "views/user/index.vue"
  ]
}
```

前端在两个页面调用该 API 时会发送不同的 `X-ResourceMark`（`'business-list'` 或 `'user'`）。

CLI 中按命令 `resource` 确定一个主上下文：

```text
命令: rbac.user.userPage
resource: user
主上下文: views/user/index.vue
resource_mark: user
```

如果业务上确实需要其他上下文，可通过 `--resource-mark` 参数覆盖：

```bash
# 默认发送 X-ResourceMark: user
yulong rbac user userPage --json '{"currentPage":1,"pageSize":10}'

# 显式覆盖为 business-list
yulong rbac user userPage --resource-mark business-list --json '{"currentPage":1,"pageSize":10}'
```

Skill 在自然语言处理时，如果识别到调用上下文属于 `business-list` 页面，应自动带上 `--resource-mark business-list`。

如果 `--resource-mark` 频繁用于某个命令，说明该命令可能需要拆分成多个命令（如 `pm.business.userPage`）。

### 7.5 与 `required_permissions` 的关系

| 字段 | 用途 | 来源 |
|------|------|------|
| `required_permissions` | 权限预检：用户是否有权调用 | 调用位置的页面权限 + 操作权限 |
| `resource_mark` | `X-ResourceMark` 请求头：告诉后端当前上下文 | 命令 resource 对应页面的 `meta.auth` |

两者可能相同（如 `'user'`），但概念不同。

---

## 8. Skill 设计（yulong-skill）

### 8.1 参考 dws 模式

| dws 组件 | yulong 对应 |
|----------|------------|
| `dws` 二进制（外部预装） | `yulong` 二进制（CLI 产物） |
| `SKILL.md` 意图路由 | `SKILL.md` 意图路由 |
| `references/products/*.md` | `references/products/*.md` |
| `references/intent-guide.md` | `references/intent-guide.md` |
| `references/error-codes.md` | `references/error-codes.md` |
| `references/global-reference.md` | `references/global-reference.md` |
| `dws schema` 命令发现 | `yulong schema` 命令发现 |

### 8.2 SKILL.md 核心内容

- **严格禁止**：不要用 curl、HTTP API、浏览器直接调御龙接口
- **严格要求**：所有命令必须加 `--format json`
- **危险操作确认**：删除、修改等操作必须先向用户确认，再加 `--yes`
- **意图判断决策树**：自然语言 → 模块 → 命令
- **命令发现**：`yulong schema` 列出所有命令，`yulong <cmd> --help` 查看用法

---

## 9. 错误处理

### 9.1 前端错误码映射（基于 `apps/rbac/src/api/enum/code.ts`）

| 错误码 | 含义 | CLI 处理 |
|--------|------|----------|
| 0 | 成功 | 正常返回 |
| -1 | 运行异常 | 返回 backend_error |
| 4 | 业务异常 | 返回 backend_error |
| 400001001 | 账户锁定 | 返回 backend_error，提示联系管理员 |
| 400001003 | 账户未启用 | 返回 backend_error，提示联系管理员 |
| **400001004** | **refreshToken 过期** | **返回 auth_required，需重新 login** |
| **400001006** | **accessToken 过期** | **自动 refresh，失败则返回 auth_required** |
| **400001007** | **访问未授权** | **返回 permission_denied** |

### 9.2 错误处理流程

1. 遇到错误，加 `--verbose` 查看详细日志，定位原因（网络 / 参数 / 权限 / token）
2. 认证失败（400001006 / 400001004）→ SSO 调刷新或重新获取 token
3. 权限不足（400001007）→ 返回 permission_denied
4. 仍然失败，报告完整错误信息给用户，禁止自行尝试替代方案

---

## 10. 开发阶段

### Phase 0：CLI 骨架（必须先完成）

| 任务 | 文件 | 说明 |
|------|------|------|
| [ ] 项目初始化 | `yulong-cli/package.json` | Bun 项目配置 |
| [ ] CLI 入口 | `yulong-cli/src/index.ts` | argparse 路由、全局 flag 解析 |
| [ ] 统一输出 | `yulong-cli/src/envelope.ts` | JSON envelope 格式 |
| [ ] 日志 | `yulong-cli/src/logger.ts` | stderr 日志 |
| [ ] 数据库 | `yulong-cli/src/db.ts` | SQLite 建表、CRUD |
| [ ] Token 管理 | `yulong-cli/src/token-manager.ts` | 存取 token、过期检查 |
| [ ] HTTP 客户端 | `yulong-cli/src/api-client.ts` | fetch + 拦截器 + 自动刷新 + X-ResourceMark（按需） |
| [ ] 认证模块 | `yulong-cli/src/auth.ts` | SSO 认证、logout、status、switch-org |
| [ ] 权限预检 | `yulong-cli/src/permission-guard.ts` | 权限检查、缓存、映射 |
| [ ] 命令发现 | `yulong-cli/src/schema.ts` | `yulong schema` 命令，从 `api_permissions` 表动态生成命令列表 |
| [ ] 权限映射提取脚本 | `extract-api-permissions/extract-api-permissions.ts` | 从前端工程自动提取 `api_permissions` 候选，作为独立项目使用 |
| [ ] 编译脚本 | `yulong-cli/build.ts` | `bun build --compile` |

### Phase 1：认证验证（SSO 接口提供后实现）

| 任务 | 命令 | 说明 | 状态 |
|------|------|------|------|
| [ ] 实现 `auth login` | `yulong auth login` | 调用 SSO 接口获取 token | 阻塞（等 SSO 接口） |
| [ ] 实现 `auth status` | `yulong auth status` | 查看 token 状态 | 可先做 |
| [ ] 实现 `auth logout` | `yulong auth logout` | 清除 token | 可先做 |
| [ ] 实现 `auth switch-org` | `yulong auth switch-org --org-id <id>` | 切换组织 | 可先做 |
| [ ] 测试登录流程 | — | 验证 SSO 接口、token 存储、自动刷新 | 阻塞（等 SSO 接口） |

。**SSO 接口未上线前的开发策略：**
1. 用 `yulong auth import-token` 手动注入 token（从浏览器 DevTools 复制或向管理员申请），跳过登录，直接进行业务接口开发测试（Phase 2）
2. token 刷新逻辑（`refreshToken`）可以先实现，接口已确定
3. SSO 接口提供后，补充 `auth login` 实现即可
4. 自动重登逻辑（refreshToken 过期后调 SSO）等 SSO 接口上线后补充

### Phase 2：第一个业务接口（等待用户指定）

> **注：** 命名规则见 §11.4 CLI 命名规范。

候选（基于前端 views 和 api 模块）：
- `yulong rbac user userPage` — 用户分页查询
- `yulong rbac user info` — 用户详情
- `yulong rbac org list` — 组织列表
- `yulong daily businesstrip add` — 出差申请（新增）
- 其他（用户指定）

每个业务接口的实现包含：
1. CLI 命令实现（`src/commands/{module}/{resource}.ts`）
2. 权限映射填充（`api_permissions` 表）
3. Skill 参考文档（`references/products/{module}.md`）

### Phase 3：批量实现（按需）

用户每次指定一个接口，按 Phase 2 模式实现。

### Phase 4：打包与交付

| 任务 | 说明 |
|------|------|
| [ ] 编译 CLI 二进制 | `bun build --compile --target=bun-linux-x64 src/index.ts --outfile yulong` | 默认 Linux x64，按需调整 --target |
| [ ] 打包 Skill | `zip -r yulong-skill.zip yulong-skill/` |
| [ ] 安装说明 | 如何在目标环境部署 CLI + Skill |

---

## 11. 前端工程映射指南

### 11.1 模块映射关系

前端 `apps/rbac/src/api/modules/` 目录对应 CLI 模块：

| 前端模块 | CLI 模块 | 业务域 |
|----------|----------|--------|
| `auth` | `auth` | 认证 |
| `rbac` | `rbac` | 用户/角色/组织/权限 |
| `daily` | `daily` | 日常办公 |
| `pm` | `pm` | 项目管理 |
| `finance` | `finance` | 财务 |
| `hr` | `hr` | 人力 |
| `process` | `process` | 流程 |
| `assist` | `assist` | 辅助 |
| `configData` | `config` | 配置 |
| `log` | `log` | 日志 |
| `rpa` | `rpa` | RPA |
| `ai` | `ai` | AI |

### 11.2 接口提取方法

1. **查看 openapi.config.ts**：获取 Swagger API 文档地址
2. **查看 api/modules/{module}/**：获取自动生成的 API 客户端代码
3. **查看 views/{module}/index.vue**：获取 `v-auth` 权限码和按钮操作映射
4. **查看 api/modules/{module}/{resource}.ts**：获取接口路径、方法、参数类型

### 11.3 权限码提取方法

前端权限码通过 `v-auth="'xxx'"` 指令声明，常见模式：
- `{resource}_add` — 新增权限
- `{resource}_edit` — 编辑权限
- `{resource}_remove` / `{resource}_delete` — 删除权限
- `{resource}_page` / `{resource}_list` — 查询权限
- `{resource}_info` / `{resource}_detail` — 详情权限
- `{resource}_export` — 导出权限
- `{resource}_import` — 导入权限

### 11.4 CLI 命名规范

**命名规则：命令名基于完整 URL 路径自动生成，无需人工复核。**

| 层级 | 来源 | 命名规则 | 示例 |
|------|------|----------|------|
| `command_name` | 完整 URL 路径 | 保留 URL 段原始大小写，用 `.` 连接 | `/rbac/user/userPage` → `rbac.user.userPage` |
| `module` | URL 第一段 | API 模块目录名 | `rbac` / `daily` / `pm` |
| `resource` | URL 中间段 | module 与 action 之间的路径，用 `.` 连接 | `/daily/travel/travelRecord/add` → `travel.travelRecord` |
| `action` | URL 最后一段语义 | 用于危险操作判断和意图生成 | `page` / `add` / `update` / `delete` / `info` / `export` |

**命令名生成示例：**

| URL | command_name | resource | action |
|------|-------------|----------|--------|
| `/rbac/user/userPage` | `rbac.user.userPage` | `user` | `page` |
| `/rbac/user/info` | `rbac.user.info` | `user` | `info` |
| `/rbac/user/userDelete` | `rbac.user.userDelete` | `user` | `delete` |
| `/rbac/user/changePassword` | `rbac.user.changePassword` | `user` | `update` |
| `/rbac/user/resetPassword` | `rbac.user.resetPassword` | `user` | `reset` |
| `/daily/travel/travelRecord/add` | `daily.travel.travelRecord.add` | `travel.travelRecord` | `add` |
| `/daily/expense/apply/add` | `daily.expense.apply.add` | `expense.apply` | `add` |
| `/pm/project/projectPage` | `pm.project.projectPage` | `project` | `page` |
| `/pm/project/selfManagement/page` | `pm.project.selfManagement.page` | `project.selfManagement` | `page` |

**CLI 调用方式：**

```bash
yulong rbac user userPage --format json --json '{"currentPage":1,"pageSize":10}'
yulong rbac user changePassword --format json --json '{"...":"..."}'
yulong daily travel travelRecord add --format json --json '{"...":"..."}'
```

**命令解析规则：**

CLI 把所有业务命令的位置参数用 `.` 连接，得到完整的 `command_name`，再按 `command_name` 查询 `api_permissions`：

```text
yulong <segment-1> <segment-2> ... <segment-N>
  command_name = segment-1.segment-2....segment-N
```

例如：

```text
yulong daily travel travelRecord add
  command_name = daily.travel.travelRecord.add
```

`module`、`resource`、`action` 仅作为辅助列保留，不再用于唯一标识命令。

**action 推导规则：**

从 URL 最后一段和函数名推导，优先匹配：

| action | URL/函数名关键词 |
|--------|-----------------|
| `page` | page, query, findpage |
| `info` | info, detail, get, getById, getAll |
| `add` | add, create, insert, save, apply |
| `update` | update, edit, modify, save, change |
| `delete` | delete, remove, del |
| `export` | export, download |
| `import` | import, upload |
| `unknown` | 无法识别时使用 |

**危险操作标记：**

- 自动生成时，`is_dangerous = 1` 仅当 `action = 'delete'`
- 其他需要 `--yes` 的操作（如 resetPassword、changePassword），在开发开放时手动 UPDATE

**不再使用：**

- 不再维护 `url-resource-map.json` 进行 resource 映射
- 不再人工复核 command_name
- 命令名冲突通过 URL 路径自然区分

**注意：**

agent 不应通过 command_name 理解命令语义，而是通过 `intent-mapping.json` 中的 `description` 和 `intents` 匹配。command_name 只作为调用标识。

## 12. 关键设计记录

### 为什么 CLI 和 Skill 分离？

- CLI 是**独立产物**，可单独使用（脚本、CI、其他系统调用）
- Skill 是**御小龙专属包装**，负责意图理解和自然语言交互
- 分离后 CLI 可以独立迭代，Skill 只关注上层逻辑

### 为什么从 Python 改为 Bun？

- 多环境部署，Python 依赖管理复杂
- Bun 编译为单二进制，零依赖
- `bun:sqlite` 内置支持

### 为什么用 SSO 而不是密码登录？

- 后端将提供 SSO 接口，通过 `userid` 直接获取双 token，无需处理密码和验证码
- 不需要 RSA 公钥加密、验证码交互等复杂流程
- 用户无感知，CLI 内部自动完成登录和 token 刷新
- 更安全，无需在本地存储密码

**注：前端仍采用密码登录，但 CLI 直接使用 SSO 接口，两套认证体系独立。**

### 为什么 Skill 层做权限预检？

- 后端数据权限不可控
- Skill 作为**可控的第一道防线**
- 无权限的请求在 Skill 层直接拒绝，不发送到后端

### RBAC 为什么不放在 Skill 里做最终判断？

- Skill 的权限预检是**第一道防线**，不是唯一防线
- 后端仍是**最终防线**
- Skill 的职责是**提前拦截明显越权的请求**，减少后端压力和安全风险

### 如何从前端代码自动生成权限映射？

已实现 `extract-api-permissions/extract-api-permissions.ts` 自动提取脚本（独立项目）：

1. **解析 API 文件**：读取 `api/modules/**/*.ts`，从 JSDoc 提取 `@url`、`@method`、`@description`，从函数名推导 action
2. **解析路由文件**：读取 `router/modules/**/*.ts`，提取 `meta.auth` 作为页面权限，同时提取 `component: () => import('@/views/xxx.vue')` 作为 resource 名来源
3. **解析视图文件**：读取 `views/**/*.vue` / `**/*.tsx`，提取 `v-auth`、`auth()`、`authAll()`、`permission` 等操作权限
4. **调用链追踪（`--function` 模式）**：给定一个 API 方法名，grep 找到所有调用该方法的视图文件，只在这些文件中提取权限，避免 resource 级模糊匹配带来的误关联
5. **多页面复用处理**：读操作合并所有调用位置的页面权限，`match_mode = 'any'`；写操作使用主调用位置权限，多页面复用时标记 `need_review`
6. **生成候选**：按 action 类型自动匹配页面权限和操作权限，输出 `function-<name>.json` / `function-<name>.sql`
7. **人工审核**：对 `need_review` 记录进行人工确认后入库或写入 CLI 配置

脚本使用示例：

```bash
# 进入独立项目目录
cd extract-api-permissions

# 按需提取单个方法（推荐）
bun run extract-api-permissions.ts \
  --input /Users/xudi/Pubinfo/project/vue/pubinfo-web/apps/rbac/src \
  --function postRbacUserUserPage

# 全量提取（项目初期摸底用）
bun run extract-api-permissions.ts \
  --input /Users/xudi/Pubinfo/project/vue/pubinfo-web/apps/rbac/src
```

---

## 附录 A：前端兼容参考（密码登录专用错误码）

> 以下错误码仅在前端密码登录流程中使用，**SSO 场景下 CLI 不会触发**。保留于此仅作为前端代码（`apps/rbac/src/api/enum/code.ts`）的完整映射参考。

| 错误码 | 含义 | 触发场景 |
|--------|------|----------|
| 400001002 | 登录名或密码不正确 | 密码登录时凭据错误 |
| 400002001 | 验证码失效 | 密码登录时验证码超时 |
| 400002002 | 验证码不匹配 | 密码登录时验证码错误 |
| 400003001 | 首次登录需修改密码 | 密码登录时首次登录强制改密 |
| 400003002 | 密码已过期 | 密码登录时密码过期 |

---

*计划创建时间：2026-01-15*
*最后更新：2026-06-13*
*项目路径：/Users/xudi/Pubinfo/project/skill/yulong-plugin*
