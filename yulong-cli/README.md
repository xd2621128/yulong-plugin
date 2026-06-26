# yulong-cli

御龙网站 API 的命令行客户端，编译为单二进制文件部署。

## 开发环境

- [Bun](https://bun.sh/) 1.3.14+

## 安装依赖

```bash
bun install
```

## 开发运行

```bash
bun run src/index.ts --help
bun run src/index.ts schema
bun run src/index.ts auth status
bun run src/index.ts rbac user userPage --json '{"currentPage":1,"pageSize":10}'
```

## 环境配置

与前端项目一致，开发时采用 `.env` 文件分环境管理配置：

| 文件 | 说明 |
|------|------|
| `.env` | 默认配置，所有环境共享 |
| `.env.development` | 开发环境 |
| `.env.test` | 测试环境 |
| `.env.production` | 生产环境 |
| `.env.local` / `.env.{env}.local` | 本地覆盖，不提交到仓库 |

### 切换环境

开发模式下 Bun 会根据 `NODE_ENV` 自动加载对应的 `.env` 文件：

```bash
# 默认加载 .env.development
bun run src/index.ts schema

# 加载 .env.test
NODE_ENV=test bun run src/index.ts schema

# 加载 .env.production
NODE_ENV=production bun run src/index.ts schema
```

### 配置项

| 环境变量 | 说明 | 默认值 |
|----------|------|--------|
| `YULONG_BASE_URL` | 御龙后端 API 基础地址 | 读取 `config.json` |
| `YULONG_TIMEOUT` | HTTP 超时（秒） | 30 |
| `YULONG_USER_DB_PATH` | 御小龙用户数据库路径 | 空 |
| `YULONG_LOG_LEVEL` | 日志级别：debug / info / warn / error | info |

### 配置优先级

高 → 低：
1. 环境变量（`export YULONG_BASE_URL=...`）
2. `config.local.json`
3. `config.json`
4. `.env.{env}` / `.env`
5. 硬编码默认值

## 编译为单二进制

```bash
# 默认编译为 Linux x64（部署目标）
bun run build.ts

# macOS Apple Silicon（本地开发调试）
bun run build.ts --target=bun-darwin-arm64

# 其他目标
# bun run build.ts --target=bun-linux-arm64
# bun run build.ts --target=bun-windows-x64
```

编译产物为当前目录下的 `yulong` 文件。

## 部署

### 1. 准备部署包

```bash
# 1. 编译 Linux x64 二进制
bun run build.ts

# 2. 安装到系统目录（示例：/opt/yulong/yulong-cli）
mkdir -p /opt/yulong/yulong-cli/data
cp yulong /opt/yulong/yulong-cli/
cp config.json /opt/yulong/yulong-cli/
cp data/users.db /opt/yulong/yulong-cli/data/
chmod +x /opt/yulong/yulong-cli/yulong

# 3. 创建 PATH 入口 wrapper（推荐 /usr/local/bin，无权限时可用 ~/.local/bin）
cat > /usr/local/bin/yulong <<'EOF'
#!/bin/bash
set -e
export YULONG_HOME="${YULONG_HOME:-$HOME/.config/yulong}"
exec /opt/yulong/yulong-cli/yulong "$@"
EOF
chmod +x /usr/local/bin/yulong
```

wrapper 中的 `YULONG_HOME` 决定每个用户把配置和数据放在哪里：

| 模式 | `YULONG_HOME` | 行为 |
|------|--------------|------|
| 全局安装（推荐） | 默认 `$HOME/.config/yulong` | 每个用户独立配置/数据，首次运行时从安装目录复制 seed |
| 便携包 | 不设置，直接 `cd` 到解压目录运行 `./yulong` | 使用包内 `config.json` 和 `data/users.db` |
| 自定义 | 显式设置任意路径 | 配置/数据放到该路径 |

### 2. 配置

全局安装后，每个用户的实际配置文件在 `$YULONG_HOME`（默认 `~/.config/yulong`）：

```
~/.config/yulong/
├── config.json          # 首次从安装目录复制
├── config.local.json    # 用户本地覆盖（可选）
└── data/
    └── users.db         # 首次从安装目录复制
```

**他人使用时只需要配置自己的用户数据库路径**。最常用方式是在 `~/.config/yulong/config.local.json` 中覆盖：

```json
{
  "userDbPath": "/path/to/their/agent/users.db"
}
```

或在 shell 配置中设置环境变量：

```bash
export YULONG_USER_DB_PATH=/path/to/their/agent/users.db
```

`userDbPath` 支持绝对路径；相对路径则相对于当前工作目录。

生产环境覆盖 `baseUrl`：

```json
{
  "baseUrl": "https://production.example.com/pubinfo-hr",
  "logLevel": "warn"
}
```

### 3. 运行

```bash
# 任意目录
yulong auth login --format json
yulong rbac user userPage --format json --json '{"currentPage":1,"pageSize":10}'
```

## 项目结构

```
yulong-cli/
├── src/
│   ├── index.ts            # CLI 入口
│   ├── envelope.ts         # JSON 输出格式
│   ├── logger.ts           # stderr 日志
│   ├── config.ts           # 配置加载
│   ├── db.ts               # SQLite 数据库
│   ├── token-manager.ts    # token 管理
│   ├── api-client.ts       # HTTP 客户端（含自动刷新/自动重登）
│   ├── auth-core.ts        # 第三方登录核心
│   ├── auth.ts             # 认证命令
│   ├── schema.ts           # 命令发现
│   ├── permission-guard.ts # 权限预检
│   ├── user-resolver.ts    # 用户解析
│   └── commands/           # 业务命令分发
├── data/                   # 运行时数据（自动创建）
├── package.json
├── tsconfig.json
├── build.ts
└── config.json             # 默认运行时配置
```

## 当前状态

已实现：
- 命令解析和全局 Flag
- JSON 统一输出
- SQLite 数据库初始化
- token 存储/读取/过期检查/自动刷新/自动重登
- `schema` 命令发现
- `auth` 命令：login / logout / status / import-token
- 权限预检与缓存
- HTTP 客户端接入真实后端
- 业务命令通用分发（已实现 `rbac user userPage`）

## 与 Skill 集成

御小龙 Skill 层通过调用 `yulong` 二进制使用本 CLI，所有调用必须加 `--format json`。

详见 `../yulong-skill/SKILL.md`。
