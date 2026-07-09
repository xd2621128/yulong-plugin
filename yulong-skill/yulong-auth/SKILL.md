---
name: yulong-auth
version: "1.0.0"
description: 御龙认证相关操作：登录、登出、查看登录状态、刷新权限缓存。当用户提到御龙登录、登出、token、认证、重新登录、登录状态、刷新权限时使用。首次使用或遇到认证/权限错误时先读 yulong-shared。
cli_version: ">=0.1.0"
metadata:
  requires:
    bins: ["yulong"]
  cliHelp: "yulong auth --help"
---

# 御龙认证 Skill

**执行本 Skill 前，必须先读 [`yulong-shared`](../yulong-shared/SKILL.md) 中的认证模式、Token 模式、错误处理通则。**

## 何时使用

- 用户提到"登录御龙 / 重新登录 / 获取 token / 认证"
- 用户提到"退出御龙 / 登出"
- 用户提到"御龙登录状态 / token 状态"
- 用户提到"刷新权限 / 更新权限缓存"

## 命令快速路由

| 用户目标 | 命令 | 说明 |
|---|---|---|
| 登录 / 重新登录 | `yulong auth login --format json` | 仅本地模式使用 |
| 退出 / 登出 | `yulong auth logout --format json` | 仅本地模式使用 |
| 登录状态 | `yulong auth status --format json` | 两种模式都可用 |
| 刷新权限缓存 | `yulong auth refresh-permissions --format json` | 本地模式刷新缓存；Token 模式由 CLI 自动预检 |
| 能做什么命令 | `yulong schema --format json` | 命令发现 |

## 模式判定

本 Skill 不询问用户“使用哪种模式”，模式由部署环境决定：

1. 若 Skill 上下文/网关注入了 `accessToken`，或 `config.json` / `config.local.json` 中 `mode === "token"`，进入 Token 模式。
2. 否则默认本地模式（桌面端通常落到这里）。

### 本地模式下的认证意图

- 用户提到“登录 / 重新登录 / 获取 token / 认证” → 执行 `yulong auth login --format json`
- 用户提到“退出 / 登出” → 执行 `yulong auth logout --format json`
- 用户提到“登录状态 / token 状态” → 执行 `yulong auth status --format json`
- 用户提到“刷新权限 / 更新权限” → 执行 `yulong auth refresh-permissions --format json`
- 若 `auth login` 报错“未找到用户 / 未配置御小龙数据库” → 提示用户“请先在御小龙客户端登录”

### Token 模式下的认证意图

- 用户提到“登录 / 重新登录 / 获取 token / 认证” → 告知“当前为 Token 模式，认证由部署环境管理，请勿执行 `auth login`”
- 用户提到“退出 / 登出” → 告知“Token 模式下无需登出，token 由上游注入”
- 用户提到“刷新权限 / 更新权限” → 告知“Token 模式下由 CLI 自动在每次启动时拉取权限，无需显式刷新”
- 若业务命令返回 `auth_required` → 向上游报告 token 失效，禁止执行 `auth login`

## 错误处理

参考 [`yulong-shared`](../yulong-shared/SKILL.md) 的错误处理通则。常见认证错误：

| 错误类型 | 本地模式处理 | Token 模式处理 |
|---|---|---|
| `auth_required` | 执行 `yulong auth login --format json`，成功后重试 | 向上游报告 token 失效，禁止执行 `auth login` |
| `permission_denied` | 先 `auth refresh-permissions`，仍失败则 `auth login` | 终止并说明缺失权限 |

## 详细参考

- [references/global-reference.md](../references/global-reference.md) — 认证机制、全局 flag、输出格式
- [references/error-codes.md](../references/error-codes.md) — 错误码与调试流程
- [references/recovery-guide.md](../references/recovery-guide.md) — recovery 闭环规范
