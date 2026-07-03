# 御龙 Plugin

御龙网站 API 的 **CLI + Skill** 插件，将御龙 OA 的后端能力封装为原子命令，供大模型/御小龙 Skill 调用。

---

## 项目结构

```
yulong-plugin/
├── .plan/
│   └── plan.md                 # 项目开发计划与架构设计
├── yulong-cli/                 # 御龙 CLI（Bun + TypeScript）
│   ├── src/                    # 源码
│   ├── README.md               # CLI 开发/使用说明
│   └── package.json
├── yulong-skill/               # 御小龙 Skill
│   ├── SKILL.md                # Skill 触发条件、意图路由、调用约定
│   └── references/             # 参考文档（认证、错误码、产品接口等）
└── dist/                       # 编译后的部署包（git 忽略，手动或 CI 生成）
    ├── yulong-deploy-mac/
    └── yulong-deploy/
```

---

## 快速开始

### 1. 部署 CLI

macOS ARM64：

```bash
unzip dist/yulong-deploy-mac.zip -d ~/.local/lib
mkdir -p ~/.local/bin
cat > ~/.local/bin/yulong <<'EOF'
#!/bin/bash
set -e
export YULONG_HOME="${YULONG_HOME:-$HOME/.config/yulong}"
exec "$HOME/.local/lib/yulong-deploy-mac/yulong" "$@"
EOF
chmod +x ~/.local/bin/yulong
```

Linux x64：

```bash
unzip dist/yulong-deploy.zip -d ~/.local/lib
mkdir -p ~/.local/bin
cat > ~/.local/bin/yulong <<'EOF'
#!/bin/bash
set -e
export YULONG_HOME="${YULONG_HOME:-$HOME/.config/yulong}"
exec "$HOME/.local/lib/yulong-deploy/yulong" "$@"
EOF
chmod +x ~/.local/bin/yulong
```

### 2. 配置

编辑 `~/.config/yulong/config.json`（首次运行后会自动创建）：

```json
{
  "baseUrl": "https://your-yulong-host/pubinfo-hr",
  "timeout": 30,
  "userDbPath": "./data/users.db",
  "logLevel": "info"
}
```

### 3. 登录

本地模式：

```bash
yulong auth login --format json
```

Token 模式（服务端部署，由上游提供 accessToken）：

```bash
yulong <cmd> --format json --token <accessToken>
```

---

## 两种认证模式

| 模式 | 触发条件 | token 生命周期 | 本地缓存 | 自动重登/刷新 |
|------|----------|----------------|----------|---------------|
| **本地模式** | 不指定 `--token` | CLI 通过 SSO 获取并管理 | `tokens.local.json`、`users.db` | 支持 |
| **Token 模式** | `--token <accessToken>` | 由上游保证有效 | 不缓存 token、不缓存用户 | 不支持，token 失效直接返回 `auth_required` |

Token 模式下禁止执行 `yulong auth login / logout / switch-org`。

---

## 开发与测试

```bash
cd yulong-cli
bun install
bun run typecheck
bun test
bun run build:mac     # 或 build:linux
```

---

## 文档索引

- [开发计划](.plan/plan.md)
- [CLI 使用说明](yulong-cli/README.md)
- [Skill 主文档](yulong-skill/SKILL.md)
- [认证与全局 flag](yulong-skill/references/global-reference.md)
- [错误码与调试](yulong-skill/references/error-codes.md)
- [Recovery 指南](yulong-skill/references/recovery-guide.md)
- [意图路由指南](yulong-skill/references/intent-guide.md)
