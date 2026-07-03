# 御龙 CLI 全局参考

御龙是浙江省公众信息产业有限公司的 OA 系统。本 CLI 提供对御龙 API 的封装，Skill 层通过调用 `yulong` 二进制使用。

## CLI 安装位置

默认安装位置（以当前用户 home 目录为根）：

```
二进制：~/.local/lib/yulong/yulong
PATH 入口：~/.local/bin/yulong
```

Skill 调用时应优先使用 `yulong`（假设已加入 PATH）。如果 PATH 中找不到，回退到 `~/.local/bin/yulong`。

若实际安装路径不同，请同步修改本 Skill `config.json` 中的 `cliPath`。

### 找不到 yulong 时

1. 检查 PATH 入口是否存在：
   ```bash
   ls -la ~/.local/bin/yulong
   ```
2. 检查二进制是否存在：
   ```bash
   ls -la ~/.local/lib/yulong/yulong
   ```
3. 如果都不存在，说明 CLI 未安装，需要从部署包安装（见 `SKILL.md` 的「CLI 位置」或项目 `README.md`）。

## 调用约定

- 所有命令必须通过 `yulong` CLI 二进制调用
- 所有命令必须加 `--format json`，以便 Skill 解析统一 envelope 输出
- 禁止直接使用 curl、HTTP API、浏览器访问御龙后端

## 认证机制

### 本地模式（当前）

本地模式不指定 `--token`，CLI 自动完成：

1. 识别当前用户（macOS 默认从御小龙 `yuxiaolong.db` 读取；非 macOS 可通过 `YULONG_USER_DB_PATH` / `config.userDbPath` 显式指定）
2. 获取并保存 accessToken + refreshToken
3. 刷新本地权限缓存

**Agent 必须通过 `yulong` CLI 完成登录，禁止直接调用任何登录接口。**

> 御小龙数据库路径在 macOS 上自动发现：
> `~/Library/Application Support/御小龙/yuxiaolong.db`
>
> 非 macOS 或需要覆盖时，在 `~/.config/yulong/config.local.json` 中设置：
> ```json
> { "userDbPath": "/path/to/yuxiaolong.db" }
> ```
> 数据库为空或找不到当前用户时，CLI 会报错，请先登录御小龙。

### Token 模式（服务端部署）

当 CLI 放在服务端、由网页端模型对话调用时，使用 `--token` 传入外部 accessToken：

```bash
yulong rbac user userPage --json '{"currentPage":1,"pageSize":10}' --token <accessToken> --format json
```

- CLI 不管理 token 生命周期，不保存 `tokens.local.json`
- 无本地用户缓存、无本地权限缓存
- 每次启动时用该 token 拉取一次权限做预检
- Token 模式下 `yulong auth login` / `logout` / `switch-org` 不可用
- 若 token 失效，CLI 返回 `auth_required`，由上游重新注入 token

### Token 自动管理（仅本地模式）

- accessToken 过期 → CLI 自动用 refreshToken 刷新
- refreshToken 也过期 → CLI 自动重新登录（需要御小龙数据库中存在当前用户）
- 自动重登失败 → 返回 `auth_required`，需先确保御小龙已登录，或手动执行 `yulong auth login --format json`

## 环境变量

| 变量 | 说明 | 优先级 |
|------|------|--------|
| `YULONG_HOME` | CLI 配置/数据根目录（默认 `~/.config/yulong`） | 最高 |
| `YULONG_BASE_URL` | 御龙后端基础 URL | 高于 config.json |
| `YULONG_DB_PATH` | CLI 运行时数据库路径（默认 `{dataDir}/yulong.db`） | 高于 config.json |
| `YULONG_USER_DB_PATH` | 御小龙身份数据库路径（覆盖默认路径） | 高于 config.json |
| `YULONG_LOG_LEVEL` | 日志级别：debug / info / warn / error | 高于 config.json |
| `YULONG_TIMEOUT` | HTTP 超时秒数 | 高于 config.json |

全局安装时，wrapper 会设置默认 `YULONG_HOME=$HOME/.config/yulong`，每个用户在该目录下有独立的 `config.json`、`config.local.json` 和 `data/`。
便携模式（直接 `./yulong`）则使用当前目录作为 `YULONG_HOME`。

## 用户数据库配置

本地模式下，CLI 默认从御小龙数据库读取当前用户：

```
~/Library/Application Support/御小龙/yuxiaolong.db
```

macOS 上无需额外配置。非 macOS 或需要覆盖默认路径时，通过以下方式指定：

1. `YULONG_USER_DB_PATH` 环境变量
2. `config.local.json` 中的 `userDbPath`
3. `config.json` 中的 `userDbPath`

示例：

```json
{
  "userDbPath": "/path/to/yuxiaolong.db"
}
```

> Token 模式下无需配置 `userDbPath`，CLI 不读取御小龙数据库。

## 全局 Flag

| Flag | 说明 | 示例 |
|------|------|------|
| `--token <token>` | 外部 accessToken（Token 模式） | `--token eyJhbG...` |
| `--json <json>` | 请求参数 JSON 字符串 | `--json '{"page":1,"size":10}'` |
| `--json-file <path>` | 从文件读取参数 | `--json-file ./params.json` |
| `--format json` | 输出格式，Skill 必须固定使用 | `--format json` |
| `--resource-mark <mark>` | 覆盖 `X-ResourceMark` 头 | `--resource-mark user` |
| `--verbose` / `-v` | 详细日志 | `--verbose` |
| `--debug` | 调试日志 | `--debug` |
| `--dry-run` | 仅展示解析结果，不执行 | `--dry-run` |
| `--yes` / `-y` | 危险操作确认 | `--yes` |
| `--timeout <sec>` | HTTP 超时 | `--timeout 30` |

## 输出格式

### 成功

```json
{
  "ok": true,
  "data": { ... },
  "asOf": "2026-06-18T08:00:00Z"
}
```

### 失败

```json
{
  "ok": false,
  "error": {
    "type": "auth_required",
    "message": "token 已过期，请重新登录"
  },
  "asOf": "2026-06-18T08:00:00Z"
}
```

错误类型见 [error-codes.md](./error-codes.md)。

## 命令发现

```bash
# 列出所有已开放的命令（默认）
yulong schema --format json

# 列出所有已配置的命令（含未开放的）
yulong schema --json '{"all":true}' --format json

# 查看某个命令用法
yulong rbac user userPage --help
```

## 配置加载优先级

1. 命令行 `--` 参数
2. 环境变量 `YULONG_*`
3. `config.local.json`
4. `config.json`
5. `.env.*.local`、`.env.development`、`.env.test`、`.env.production`、`.env`

## 注意事项

- CLI 是单二进制产物，部署时只需 `yulong` 文件和 SQLite 数据目录
- `data/tokens.local.json` 是运行时文件，权限应为 `0o600`
- Skill 调用 CLI 时，应保证 `YULONG_BASE_URL` 或 `config.json` 已正确配置
