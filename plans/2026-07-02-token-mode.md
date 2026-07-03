# yulong-cli `--token` 模式实现计划

> 目标：让 CLI 支持无状态、服务端部署模式，由上游（网页端模型对话）为每个请求提供 accessToken。同时保持原有本地登录模式不变（除移除 `--userid` 兜底和 `auth import-token` 外）。

---

## 一、背景与目标

当前 `yulong-cli` 依赖本地状态运行：

- `data/tokens.local.json` 存 access/refresh token
- `users.db` 存当前用户
- `user_permissions` 表缓存用户权限
- token 过期时自动刷新，refreshToken 过期时自动重新登录

新需求是把 CLI 放在服务端，给网页端模型对话使用：

- 每个请求可能来自不同用户
- accessToken 由模型/网关层提供，CLI 不再管理 token 生命周期
- 无本地 token 缓存、无本地权限缓存、无本地用户缓存
- 每次 CLI 启动时拉取一次权限做预检
- 原有本地模式继续保留

---

## 二、设计原则

1. **两套模式共存**：不传 `--token` 走原有本地模式；传 `--token` 走无状态 Token 模式。
2. **不破坏原模式核心逻辑**：普通模式的 `auth login` / `token-manager` / `refreshAccessToken` / `user_permissions` 缓存均保留。
3. **Token 模式无本地缓存**：不读/写 `tokens.local.json`，不读/写 `user_permissions`，不强制要求 `users.db`。
4. **Token 由调用方保证有效**：CLI 不自动刷新；token 失效时返回 `auth_required`，由上游重新注入。
5. **`users.db` 只保留最新用户**：通过触发器实现 insert 前清空旧数据；`resolveUser` 按 `created_at DESC LIMIT 1` 读取。
6. **禁止复用跨模块附件**（已在前期文档中明确，本计划不再涉及）。

---

## 三、CLI 侧改动

### 3.1 全局选项与入口（`src/types.ts`、`src/index.ts`）

- `GlobalOptions` 增加 `token?: string`。
- `parseGlobalOptions` 增加 `--token` 解析。
- `printHelp()` 全局帮助中：
  - 删除 `--userid <id>`
  - 增加 `--token <token>`
- 命令入口判断：
  - 若 `options.token` 存在，跳过 `resolveUser()`，不读 `users.db`。
  - 若不存在，走普通模式，调用 `resolveUser()`。
- `dry-run` 输出中的 `user` 字段：
  - Token 模式显示 `"token-mode"` 或省略。
  - 普通模式保持显示 DB 用户。

### 3.2 用户解析（`src/user-resolver.ts`）

- 删除 `--userid` / `YULONG_USERID` 兜底逻辑。
- `resolveUser()` 改为只读取 `users.db`：
  - 按 `created_at DESC LIMIT 1` 取用户。
  - 0 条 → 报错：`未配置用户，请先写入 users.db`。
- 删除 `ResolvedUser.source` 的 `'explicit'` 类型，只剩 `'db'`。
- 同步更新 `src/user-resolver.test.ts`：
  - 删除 `--userid` / `YULONG_USERID` 相关用例。
  - 新增：DB 为空时报错。
  - 新增/保留：DB 有一条时正常返回。

### 3.3 数据库初始化（`src/db.ts`）

- `initSchema()` 增加触发器：

  ```sql
  CREATE TRIGGER IF NOT EXISTS users_keep_latest
  BEFORE INSERT ON users
  BEGIN
    DELETE FROM users;
    DELETE FROM user_permissions;
  END;
  ```

- 效果：
  - 每次 insert 前清空 `users` 和 `user_permissions`。
  - 保证 `users` 表始终只有最新一条用户。
  - 用户切换时旧权限缓存自动失效。

### 3.4 认证命令（`src/auth.ts`）

- **删除 `auth import-token` 命令**：删除 `importToken` 函数及 `handle` 中的 case。
- `auth login`：
  - Token 模式下直接报错：`当前使用 --token 模式，auth 子命令不可用`。
  - 普通模式下保持现有逻辑，但不再读取 `--userid` / `YULONG_USERID`。
- `auth logout` / `auth switch-org`：
  - Token 模式下直接报错。
  - 普通模式下保持不变。
- `auth status`：
  - Token 模式下返回 `{ status: "token_mode", message: "当前使用 --token 外部 token" }`。
  - 普通模式下保持现有逻辑。
- `auth refresh-permissions`：
  - Token 模式下：用传入的 token 调 `/rbac/resource/grantedResources`，返回权限列表，**不写入本地缓存**。
  - 普通模式下：保持现有逻辑，调用 `refreshUserPermissions(userid)` 并写入缓存。
- `printAuthHelp()` 中移除 `import-token` 帮助。

### 3.5 权限检查（`src/permission-guard.ts`）

- 保留 `refreshUserPermissions(userid)`：供普通模式使用，继续写 `user_permissions` 缓存。
- 新增 `fetchUserPermissions(token: string)`：
  - 用指定 token 调 `GET /rbac/resource/grantedResources`。
  - **不缓存**，返回字符串数组。
  - token 失效时抛 `auth_required`。
- `checkPermission(userid, required, matchMode)` 保持原样，供普通模式使用。
- Token 模式下不再调用 `checkPermission`，而是直接调用 `fetchUserPermissions` 后做本地对比。

### 3.6 业务命令（`src/commands/business.ts`）

- 函数签名可改为 `businessCommand(context, userid?, params?)`，`userid` 在 Token 模式下可传 `undefined`。
- Token 模式下：
  - 不调用 `hasToken()`（改用 `context.options.token` 判断）。
  - 调用 `fetchUserPermissions(context.options.token)` 拉取权限并预检。
  - 危险操作确认 `--yes` 逻辑不变。
  - 把 token 传给 `api-client`（通过 `context`）。
- 普通模式下：
  - 保持现有逻辑：调用 `hasToken()`、`checkPermission(userid, ...)`。
  - 缓存为空且预检失败时，刷新一次缓存再试。

### 3.7 API 请求（`src/api-client.ts`）

- `buildRequest(context, params, explicitBody)`：
  - 优先使用 `context.options.token` 构造 `Authorization` header。
  - 无 token 时保持调用 `getAccessToken()`（普通模式）。
- `RequestConfig` 增加 `skipAuthRetry?: boolean`。
- `doRequest(config, retried)`：
  - 若 `config.skipAuthRetry === true` 且遇到 `400001004` / `400001006`，直接抛 `auth_required`，**不调用 `refreshAccessToken`**。
  - 普通模式下 `skipAuthRetry` 不传或传 `false`，保持现有自动刷新/重登逻辑。

### 3.8 帮助文本

- `src/index.ts` 的 `printHelp()` 和 `printAuthHelp()` 移除 `import-token` 和 `--userid` 相关描述。

### 3.9 日志

- 任何位置不得打印完整 token。
- `logger` 输出 `context.options` 前需脱敏或避免打印。

### 3.10 测试

- 更新 `src/user-resolver.test.ts`：
  - 删除 `--userid` / `YULONG_USERID` 用例。
  - 新增：DB 为空时报错。
  - 新增/保留：DB 单条用户时返回。
- 新增 Token 模式测试（可单独文件 `token-mode.test.ts`）：
  - 传 `--token` 时跳过 `resolveUser`，不读 `users.db`。
  - `auth status --token xxx` 返回 `token_mode`。
  - `auth login --token xxx` 报错。
  - 业务命令带 token 请求（可 mock `fetch`）。
  - token 失效返回 `auth_required`，不自动刷新。
- 原有 23 个测试继续通过。

---

## 四、Skill 侧改动

### 4.1 `SKILL.md`

- 移除 `auth import-token` 相关描述。
- 新增「Token 模式（服务端部署）」章节：
  - accessToken 由模型上下文提供。
  - 所有 `yulong` 命令末尾附加 `--token <accessToken>`。
  - 不使用 `auth login` / `logout` / `import-token` / `switch-org`。
- 「严格要求」中：
  - 删除或修改“调用业务命令前，优先检查 `yulong auth status` 确认已登录”。
  - 增加 Token 模式说明：由外部保证 token 有效。
- 「错误处理」中：
  - `auth_required` 区分本地模式（`auth login`）和 Token 模式（上游重新提供 token）。
- 安装说明：
  - Token 模式下不需要 `users.db`。
  - 普通模式仍需配置 `users.db`。

### 4.2 `references/global-reference.md`

- 删除「手动注入 token」整节。
- 删除 `--userid` 全局 Flag 和 `YULONG_USERID` 环境变量。
- 在「Token 自动管理」后新增「Token 模式」章节：
  - 通过 `--token <accessToken>` 传入。
  - CLI 不管理 token 生命周期。
  - 无本地 token 文件、无 `user_permissions` 缓存、Token 模式下无需 `users.db`。
- 全局 Flag 表增加 `--token <token>`。
- 用户数据库配置章节加备注：Token 模式下无需配置 `userDbPath`。

### 4.3 `references/recovery-guide.md`

- Step 2（`auth_required`）分模式：
  - 本地模式：执行 `yulong auth login --format json`，成功后重试原命令。
  - Token 模式：停止，向用户/上游报告“token 已失效，请重新获取 token 后重试”，**禁止执行 `auth login`**。

### 4.4 `references/intent-guide.md`

- 登录/认证/重新登录类意图：
  - 本地模式 → `auth login`。
  - Token 模式 → 告知“当前为 Token 模式，认证由部署环境/模型上下文管理”。

### 4.5 `schema` 命令

- 保持静态，不改。
- Token 模式下 `yulong schema` 仍按 `api_permissions` 返回已配置命令（剔除 `required_permissions=[]`）。

---

## 五、数据模型变更

### `users` 表触发器

```sql
CREATE TRIGGER IF NOT EXISTS users_keep_latest
BEFORE INSERT ON users
BEGIN
  DELETE FROM users;
  DELETE FROM user_permissions;
END;
```

### `resolveUser` 逻辑

```ts
const user = db.query(
  'SELECT userid, org_id, default_org_id FROM users ORDER BY created_at DESC LIMIT 1'
).get() as { userid: string } | null;

if (!user) {
  throw new Error('未配置用户，请先写入 users.db');
}
return user.userid;
```

---

## 六、部署与迁移

1. 编译并部署新版二进制到 `~/.local/lib/yulong/yulong`。
2. 普通模式用户：
   - 如果之前依赖 `--userid` 或 `YULONG_USERID`，需要改为先把用户写入 `users.db`。
   - `auth import-token` 不再可用，改用 `auth login` 或切到 Token 模式。
3. Token 模式部署：
   - 无需 `users.db`、无需 `tokens.local.json`、无需 `userDbPath` 配置。
   - 服务端每次调用 CLI 时传入 `--token <accessToken>`。
   - 由服务端/网关保证 token 有效。

---

## 七、验证清单

- [ ] 普通模式：`auth login` 可用，`--userid` 已移除，`users.db` 单用户正常。
- [ ] Token 模式：`--token` 能执行业务命令，不读 `users.db`。
- [ ] Token 模式：`auth status` 返回 `token_mode`。
- [ ] Token 模式：`auth login` / `logout` / `switch-org` / `import-token` 报错。
- [ ] Token 模式：token 失效返回 `auth_required`，不自动刷新。
- [ ] Token 模式：每次启动拉一次 `/rbac/resource/grantedResources` 做权限预检。
- [ ] 普通模式：token 过期自动刷新、refreshToken 过期自动重登逻辑保持正常。
- [ ] `bun test` 全部通过。
- [ ] `bun run typecheck` 无错误。
- [ ] Skill 文档已同步更新。

---

## 八、待实现顺序

1. CLI 数据层：触发器 + `resolveUser` 改造 + 测试更新。
2. CLI 认证层：删除 `import-token`、Token 模式分支、`auth status` 改造。
3. CLI 入口层：添加 `--token`、跳过用户解析、帮助文本更新。
4. CLI 权限/请求层：`fetchUserPermissions`、token 请求、`skipAuthRetry`。
5. CLI 测试：新增 Token 模式测试。
6. Skill 文档更新。
7. 重新编译部署二进制。

---

*计划制定时间：2026-07-02*
