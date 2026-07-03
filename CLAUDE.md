# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

`yulong-plugin` 是御龙网站 API 的 **CLI + Skill** 插件：

- `yulong-cli/`：Bun + TypeScript 写的命令行客户端，编译为单二进制。
- `yulong-skill/`：御小龙 Skill 的指令与参考文档，最终通过调用 `yulong` 二进制与后端交互。
- `.plan/plan.md`：项目原始开发计划与架构上下文。
- `dist/`：编译后的部署包（git 忽略），包含 `yulong-deploy-mac/` 和 `yulong-deploy/`。

## 常用命令

所有开发命令都在 `yulong-cli/` 下执行：

```bash
cd yulong-cli
bun install              # 安装依赖（只有 @types/bun 和 typescript）
bun run typecheck        # tsc --noEmit
bun test                 # 运行所有测试
bun test src/user-resolver.test.ts   # 运行单个测试文件
bun run dev -- schema    # 开发模式运行：bun run src/index.ts schema
bun run build:mac        # 编译 macOS ARM64 二进制 -> yulong-mac
bun run build:linux      # 编译 Linux x64 二进制 -> yulong
bun run build.ts --target=bun-darwin-arm64   # 自定义目标
```

打包部署包到 `yulong-plugin/dist/` 是手动步骤（二进制、config.json、data/users.db、yulong-skill 一起复制后 zip）。

## 配置与环境

- 配置优先级：`YULONG_*` 环境变量 > `config.local.json` > `config.json` > `.env` > 默认值。
- 开发时 Bun 会自动加载 `.env` / `.env.development` 等；编译后的二进制会手动加载 `.env` 文件。
- 不要提交 `config.local.json`、`secrets.local.json`、`.env.*.local`、`tokens.local.json`、`.db` 文件。

## 高层架构

### CLI 入口与路由

`src/index.ts`：

1. 用 Node `util.parseArgs` 解析全局选项（`--token`、`--json`、`--format`、`--fields` 等）。
2. 特殊命令 `auth` / `schema` 直接分发到 `auth.ts` / `schema.ts`。
3. 业务命令通过 `resolveCommandAndArgs()` 在 `api_permissions` 表中做最长前缀匹配，得到命令名和路径参数。
4. 普通模式调用 `resolveUser()` 从 `users.db` 读取最新用户；Token 模式跳过此步。
5. 最终进入 `commands/business.ts`。

### 命令注册表：`api_permissions`

`db.ts` 中的 `api_permissions` 表是命令映射的唯一事实源：

- `command_name`：点分命令名，如 `rbac.user.userPage`。
- `method` / `path`：实际 HTTP 方法及后端路径；路径参数占位符为 `${param0}`、`${param1}`。
- `required_permissions` + `match_mode`：Skill/CLI 第一道权限防线。
- `is_dangerous`：为 1 时执行必须加 `--yes`。
- `resource_mark`：默认写入 `X-ResourceMark` 请求头，可被 `--resource-mark` 覆盖。

新增业务命令时，通常需要在 `api_permissions` 中插入一条映射，并在 `command-params.ts` 中补充 `--help` 参数说明。

### 两种认证模式

| 模式 | 触发 | 行为 |
|------|------|------|
| **本地模式** | 不指定 `--token` | 从 `users.db` 读取用户，用 `tokens.local.json` 存取 token，自动 refresh/re-login，权限缓存到 `user_permissions` |
| **Token 模式** | `--token <accessToken>` | 不读本地用户、不写 token 文件；每次启动用该 token 拉取权限做预检；`RequestConfig.skipAuthRetry = true`；`auth login/logout/switch-org` 不可用 |

### 认证与权限

- `auth-core.ts`：调用 `POST /hr/auth/extends/login/third/party4UserId` 获取 token。
- `token-manager.ts`：读写 `tokens.local.json`，判断 accessToken 是否过期（提前 5 分钟缓冲）。
- `permission-guard.ts`：
  - 本地模式：读 `user_permissions` 缓存，未命中或为空时调 `GET /rbac/resource/grantedResources` 刷新。
  - Token 模式：`fetchUserPermissions(token)` 每次都请求后端，不缓存。
- `api-client.ts`：
  - `buildRequest()` 根据 `api_permissions` 构造 URL、headers（Authorization、X-ResourceMark）、query/body。
  - `request()` 执行 fetch，映射后端错误码到 `ErrorType`；本地模式下 accessToken 过期会自动 refresh 并重试一次，Token 模式下直接抛 `auth_required`。

### 数据输出

- `envelope.ts`：统一 envelope `{ ok, data?, error?, dryRun?, asOf }`；错误始终输出 JSON。
- `formatter.ts`：处理 `--fields` 字段过滤和 `table`/`raw` 格式；分页对象会保留外层、只过滤 `records`。

### 数据库

`db.ts` 使用 `bun:sqlite`：

- `getDb()` 单例，每次启动都会执行 `initSchema()`，保证旧 DB 也能拿到新表/触发器。
- `users_keep_latest` 触发器：每次向 `users` 表插入前清空 `users` 和 `user_permissions`，确保只保留最新用户。
- `users.db` 同时也是 `api_permissions` 的持久化存储。

## Skill 层约定

`yulong-skill/SKILL.md` 和 `references/` 定义了 Skill 行为，代码改动需与其保持一致：

- 所有 `yulong` 调用必须加 `--format json`。
- 禁止让 Skill 直接用 curl/HTTP/浏览器访问御龙后端；所有请求必须经过 CLI。
- 禁止编造用户 ID、组织 ID、部门 ID 等标识符；字段值必须先查字典确认。
- 危险操作（目前 `hr.knowledge.addKnowledge`）必须先展示摘要、等用户确认、再加 `--yes` 执行。
- Token 模式下禁止执行 `auth login / logout / switch-org`；遇到 `auth_required` 应向上游报告 token 失效。
- 意图路由有严格规则：如“收入清单”未明确拆分前/后必须追问；“XX 大区”优先按部门字典查，找不到必须追问，不能自动当作“区域”。

## 新增命令或模块时的 checklist

1. 在 `api_permissions` 中插入映射（可用 CLI 或 seed 脚本）。
2. 若路径含 `${param0}` 等占位符，确认 `api-client.resolvePath()` 的 fallback 键或 `--json` 中的同名字段能填充。
3. 在 `command-params.ts` 中补充 `--help` 参数说明。
4. 若是文件上传命令，在 `commands/business.ts` 的 `isFileUploadCommand()` 中登记。
5. 若是危险操作，设置 `api_permissions.is_dangerous = 1`，并确保 Skill 文档有三步确认流程。
6. 更新 `yulong-skill/references/products/` 中对应产品的参考文档。
7. 补充单元测试并运行 `bun test` / `bun run typecheck`。
