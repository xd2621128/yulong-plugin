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
bun run build:mac:token  # 编译 Token 模式 macOS 二进制 -> yulong-mac-token
bun run build:linux:token # 编译 Token 模式 Linux 二进制 -> yulong-token
bun run build.ts --target=bun-darwin-arm64   # 自定义目标（支持 --mode=local|token、--outfile=<name>）
```

打包部署包到 `yulong-plugin/dist/` 是手动步骤（二进制、config.json、data/yulong.db、yulong-skill 一起复制后 zip）。

## 配置与环境

- 配置优先级：`YULONG_*` 环境变量 > `config.local.json` > `config.json` > 硬编码默认值。
  - `.env` / `.env.{env}` / `.env.{env}.local` 在开发模式下由 Bun 自动注入为环境变量；编译后的二进制会手动加载这些文件，再合并到 `process.env`。
  - 因此 `.env` 中的值最终通过 `YULONG_*` 环境变量生效，与直接设置环境变量优先级相同。
  - `mode`（`local` / `token`）例外，只有两档来源：`YULONG_MODE` 环境变量 > 编译期注入（`bun run build.ts --mode=token` 通过 `bun build --define YULONG_BUILD_MODE` 注入）。config 文件中的 `mode` 字段 CLI 不读取（`yulong-skill/config.json` 的 `mode` 仅供 agent 参考）；启动日志会输出当前认证模式，便于定位。
- 两个 `config.json` 的分工（不要混放字段）：
  - `yulong-cli/config.json`：CLI 开发配置（`baseUrl` / `timeout` / `dbPath` / `userDbPath` / `logLevel`），也是部署包顶层 `config.json`（安装时复制到 CLI home）的来源。
  - `yulong-skill/config.json`：仅 Skill 专用字段（`cliPath`、`mode`），由 agent 阅读 SKILL.md 时参考；CLI 从不读取此文件。
- 不要提交 `config.local.json`、`secrets.local.json`、`.env.*.local`、`tokens.local.json`、`.db` 文件。

## 高层架构

### CLI 入口与路由

`src/index.ts`：

1. 用 Node `util.parseArgs` 解析全局选项（`--token`、`--json`、`--format`、`--fields` 等）。
2. 特殊命令 `auth` / `schema` 直接分发到 `auth.ts` / `schema.ts`。
3. 业务命令通过 `resolveCommandAndArgs()` 在 `api_permissions` 表中做最长前缀匹配，得到命令名和路径参数。
4. 普通模式调用 `resolveUser()` 读取当前登录用户；Token 模式（`--token` 或配置 `mode=token`）跳过此步。
   - macOS 默认读取 `~/Library/Application Support/御小龙/yuxiaolong.db` 中 `auth_sessions.id = 'current'` 的 `user_info`。
   - 可通过 `YULONG_USER_DB_PATH` / `config.userDbPath` 显式指定御小龙数据库路径（非 macOS 或测试时使用）。
   - CLI 读取 `mode` 配置决定默认认证模式（优先级见上文"配置与环境"）；Skill 文档中的 `mode` 字段约定由 CLI 在运行时强制落地。若 Skill 上下文/网关注入了 `accessToken`（`--token`），优先使用 Token 模式。
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
| **本地模式** | 不指定 `--token` 且配置 `mode=local`（默认） | macOS 默认从御小龙 `yuxiaolong.db` 读取用户，用 `tokens.local.json` 存取 token，自动 refresh/re-login，权限缓存到 `user_permissions` |
| **Token 模式** | `--token <accessToken>`，或 `mode=token`（`YULONG_MODE` 环境变量 / 编译期注入） | 不读本地用户、不写 token 文件；每次启动用该 token 拉取权限做预检；`RequestConfig.skipAuthRetry = true`；`auth login/logout/switch-org` 不可用；`mode=token` 但未提供 `--token` 时，业务命令与 `auth refresh-permissions` 抛 `auth_required` |

### 认证与权限

- `auth-core.ts`：本地模式下调用 `POST /hr/auth/extends/login/third/party4UserId` 获取 token。
- `token-manager.ts`：本地模式下读写 `tokens.local.json`，判断 accessToken 是否过期（提前 5 分钟缓冲）。
- `auth.ts`：
  - `login` / `logout` / `switch-org` 在 Token 模式下不可用。
  - `status` 在两种模式下都可用；Token 模式返回 `status: 'token_mode'`。
  - `refresh-permissions` 在两种模式下都可用：本地模式刷新 `yulong.db` 缓存，Token 模式通过外部 token 临时拉取权限。
- `permission-guard.ts`：
  - 本地模式：读 `user_permissions` 缓存，未命中或为空时调 `GET /rbac/resource/grantedResources` 刷新。
  - Token 模式：`fetchUserPermissions(token)` 每次都请求后端，不缓存。
- `api-client.ts`：
  - `buildRequest()` 根据 `api_permissions` 构造 URL、headers（Authorization、X-ResourceMark）、query/body。
  - `request()` 执行 fetch，映射后端错误码到 `ErrorType`；本地模式下 accessToken 过期会自动 refresh 并重试一次，Token 模式下直接抛 `auth_required`。

### Schema 命令

`schema.ts` 提供 `yulong schema` 子命令，用于列出当前已开放的命令：

- 默认只返回 "已开放" 的命令（`required_permissions` 非空，或 `match_mode === 'all'`），与 `yulong schema` 的过滤标准保持一致。
- 支持 `--json '{"module":"rbac"}'` 按模块过滤。
- 支持 `--json '{"all":true}'` 显示全部命令（含未开放命令）。
- 输出包含命令名、描述、HTTP 方法/路径、示例调用。

### 数据输出

- `envelope.ts`：统一 envelope `{ ok, data?, error?, dryRun?, asOf }`；错误始终输出 JSON。
- `formatter.ts`：处理 `--fields` 字段过滤和 `table`/`raw` 格式；分页对象会保留外层、只过滤 `records`。

### 文件上传

`commands/business.ts` 处理文件上传类命令：

- `hr.file.upload`、`hr.file.upload.return.attachment`（通用上传）以及 `hr.employee.importData`、`hr.employee.importPerformance`（花名册/绩效导入）需要 multipart/form-data 上传；`importPerformance` 的 `employeeId` 走 query（`param_location = query`）。
- 通过 `--file <path>` 指定本地文件路径，`buildFileUploadBody()` 构造 `FormData`，字段名为 `file`。
- 新增文件上传命令时，需在 `isFileUploadCommand()` 中登记，并补充 `--help` 参数说明。

### 数据库

`db.ts` 使用 `bun:sqlite`：

- `getDb()` 单例，每次启动都会执行 `initSchema()`，保证旧 DB 也能拿到新表/触发器。
- CLI 自身数据库默认为 `{dataDir}/yulong.db`，存储 `api_permissions`（命令注册表）和 `user_permissions`（本地权限缓存）。
- 启动时若检测到旧版 `users.db`，会自动把 `api_permissions` 和 `user_permissions` 迁移到 `yulong.db`，并备份旧文件。

## Skill 层约定

`yulong-skill/SKILL.md` 和 `references/` 定义了 Skill 行为，代码改动需与其保持一致：

- 所有 `yulong` 调用必须加 `--format json`。
- 禁止让 Skill 直接用 curl/HTTP/浏览器访问御龙后端；所有请求必须经过 CLI。
- 禁止编造用户 ID、组织 ID、部门 ID 等标识符；字段值必须先查字典确认。
- 危险操作（`hr.knowledge.addKnowledge`、部门管理写操作 `hr.dept.add/edit/addSubDept/editSubDept/del/hideDept/editDeptSort/export/addOrUpdateBusinessLine/removeBusinessLine`、岗位管理写操作 `hr.post.addPost/updatePost/removePost`、花名册写操作 `hr.employee.addEmployee/updateEmployee/unapprovedTransfer/unapprovedLeave/setEmployeeSortNum/importData/importPerformance/addOrUpdateContract/removeContract/addChangeRecord/updateChangeRecord/removeChangeRecord/removePerformance/updateAttachment`、`hr.regularRecord.oneClick`）必须先展示摘要、等用户确认、再加 `--yes` 执行。
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
