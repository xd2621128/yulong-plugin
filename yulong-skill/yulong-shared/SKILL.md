---
name: yulong-shared
version: "1.0.0"
description: 御龙 CLI 共享规则。首次使用、找不到 yulong 命令、配置问题、认证失败、权限错误、看到 _notice 字段、跨 Skill 路由或不确定该用哪个业务 Skill 时先读本 Skill。
cli_version: ">=0.1.0"
metadata:
  requires:
    bins: ["yulong"]
  cliHelp: "yulong --help"
---

# 御龙 CLI 共享规则

御龙是浙江省公众信息产业有限公司的 OA 系统。本 Skill 通过 `yulong` CLI 二进制调用御龙网站 API。其他业务 Skill（`yulong-auth`、`yulong-rbac`、`yulong-project`、`yulong-hr`）都依赖本 Skill 描述的认证、权限、调用约定和错误处理规则。

## CLI 位置

本 Skill 通过 `yulong` CLI 二进制调用御龙 API。

- **默认 PATH 入口**：`~/.local/bin/yulong`（wrapper 脚本）
- **默认二进制位置**：`~/.local/lib/yulong/yulong`
- **Skill 配置**：`config.json` 中的 `cliPath`（默认 `~/.local/bin/yulong`）

调用时优先使用 `yulong`；若 PATH 中没有，则使用 `~/.local/bin/yulong`。如果两者都不存在，说明 CLI 未安装，需从部署包解压安装：

```bash
# macOS ARM64
unzip /path/to/yulong-deploy-mac.zip -d ~/.local/lib
mkdir -p ~/.local/bin
cp ~/.local/lib/yulong-deploy-mac/yulong ~/.local/lib/yulong/yulong
cp ~/.local/lib/yulong-deploy-mac/config.json ~/.local/lib/yulong/config.json
mkdir -p ~/.local/lib/yulong/data
# data/yulong.db 会在首次运行时自动创建；如需预置命令注册表可拷贝 seed：
# cp ~/.local/lib/yulong-deploy-mac/data/yulong.db ~/.local/lib/yulong/data/yulong.db

cat > ~/.local/bin/yulong <<'EOF'
#!/bin/bash
set -e
export YULONG_HOME="${YULONG_HOME:-$HOME/.config/yulong}"
exec "$HOME/.local/lib/yulong/yulong" "$@"
EOF
chmod +x ~/.local/bin/yulong
```

> Token 模式下不需要 `data/yulong.db`，也无需 `tokens.local.json`； accessToken 通过 `--token` 传入。

## 运行模式判定

本 Skill 同时支持**桌面端本地模式**和**服务端 Token 模式**，通过运行时上下文自动判定，**禁止向用户询问“使用哪种模式”**。

判定优先级（高 → 低）：

1. **执行环境注入了 `accessToken`**（如网页端网关通过上下文/环境变量传入）→ 使用 Token 模式，所有命令附加 `--token <accessToken>`。
2. **`config.json` / `config.local.json` 中 `mode === "token"`** → 使用 Token 模式，等待上游注入 token；若未注入则报错。
3. **否则默认本地模式** → 不附加 `--token`，用户身份从御小龙 `yuxiaolong.db` 读取，遇到 `auth_required` 执行 `yulong auth login`。

桌面端部署时，只要不注入 token、不把 `mode` 配成 `token`，Skill 就会自然走本地模式，用户完全无感知。服务端部署时，由网关注入 token 或配置 `mode: "token"`。

## 严格禁止 (NEVER DO)

- 禁止使用 curl、HTTP API、浏览器直接访问御龙后端
- 禁止编造用户 ID、组织 ID 等标识符，必须从命令返回中提取
- 禁止猜测字段名/参数值，操作前必须先查询确认
- 禁止对未在 `yulong schema` 中出现的命令自行构造调用
- **禁止向桌面端用户询问“是否使用 Token 模式”或“请提供 accessToken”**

## 严格要求 (MUST DO)

- 所有命令必须加 `--format json` 以获取可解析输出
- 危险操作必须先向用户确认，用户同意后才加 `--yes` 执行
- 本地模式下，调用业务命令前优先检查 `yulong auth status` 确认已登录
- Token 模式下，由外部（网页端模型对话/网关）保证 accessToken 有效，所有 `yulong` 命令末尾附加 `--token <accessToken>`，不使用 `auth login` / `logout` / `switch-org`
- 单次批量操作不超过 100 条记录
- 所有命令严格遵循参考文档中规定的参数格式
- **模式由部署环境决定，禁止 Skill 主动询问用户“使用本地模式还是 Token 模式”**

## Token 模式（服务端部署）

当 CLI 以服务端形式部署、由网页端模型对话调用时，Skill 通过以下方式进入 Token 模式：

- 执行环境/网关向 Skill 上下文注入了 `accessToken`；或
- `config.json` / `config.local.json` 中配置了 `"mode": "token"`。

Token 模式行为：

- accessToken 由模型上下文/网关层提供，通过 `--token <accessToken>` 传入
- CLI 不管理 token 生命周期，不缓存 token，不缓存用户，不缓存权限
- 每次 CLI 启动时会用该 token 拉取一次权限做预检
- 业务命令统一附加 `--token <accessToken>`，例如：

  ```bash
  yulong rbac user userPage --json '{"currentPage":1,"pageSize":10}' --token <accessToken> --format json
  ```

- Token 模式下禁止执行 `yulong auth login` / `logout` / `switch-org`
- 若返回 `auth_required`，说明 token 已失效，需由上游重新提供 token，禁止引导用户执行 `auth login`
- Token 模式下不需要 `users.db` 和 `tokens.local.json`

## 跨 Skill 路由

| 用户意图 | 使用 Skill | 说明 |
|---|---|---|
| 登录、登出、登录状态、刷新权限 | [`yulong-auth`](../yulong-auth/SKILL.md) | 认证相关 |
| 用户、角色、组织、权限、通讯录 | [`yulong-rbac`](../yulong-rbac/SKILL.md) | RBAC 相关 |
| 部门、组织架构、业务线（查/增/改/删/隐藏/排序/导出） | [`yulong-rbac`](../yulong-rbac/SKILL.md) | 部门管理 |
| 商机、合同、收入清单、合作伙伴、CRM 字典 | [`yulong-project`](../yulong-project/SKILL.md) | 项目/经营相关 |
| 通报、知识库、通用文件上传下载 | [`yulong-hr`](../yulong-hr/SKILL.md) | HR/办公相关 |

## 危险操作确认

当前已登记的危险操作：

- `yulong hr.knowledge.addKnowledge`：新增知识库，会向组织范围内发布内容
- `yulong hr.dept.add` / `hr.dept.edit` / `hr.dept.addSubDept` / `hr.dept.editSubDept`：变更组织架构
- `yulong hr.dept.del`：删除部门（先 `hr.dept.judgeDel` 判断，先删子部门再删父部门）
- `yulong hr.dept.hideDept` / `hr.dept.editDeptSort`：影响部门展示与顺序
- `yulong hr.dept.export`：导出全量部门数据
- `yulong hr.dept.addOrUpdateBusinessLine` / `hr.dept.removeBusinessLine`：业务线变更

执行危险操作必须执行三步确认：

```
Step 1 → 展示操作摘要（操作类型 + 目标对象 + 影响范围）
Step 2 → 用户明确回复确认（如 "确认" / "好的"）
Step 3 → 加 --yes 执行命令
```

## 命令发现

产品参考文档中的 flag 列表仅供参考，权威调用信息来自 CLI 本身：

```bash
# 列出所有命令
yulong schema --format json

# 查看某个命令用法
yulong rbac user userPage --help
```

## 错误处理通则

1. 遇到错误，加 `--verbose` 重试一次，查看 stderr 日志
2. 认证失败（`error.type === "auth_required"`）→ 按当前运行模式处理
   - **本地模式**：执行 `yulong auth login --format json`，成功后重试原命令
   - **Token 模式**：停止，向上游报告“token 已失效，请重新提供 token 后重试”，**禁止执行 `auth login`**
3. 权限不足（`error.type === "permission_denied"`）→ 终止并说明缺失权限；本地模式下如怀疑缓存过期，可先执行 `yulong auth refresh-permissions --format json` 刷新权限缓存后再试，仍然失败则执行 `yulong auth login --format json`
4. 后端业务错误（`error.type === "backend_error"`）→ 展示完整错误码和消息，禁止自行替代方案
5. 仍然失败，参考 [recovery-guide.md](../references/recovery-guide.md)

## 详细参考

- [references/intent-guide.md](../references/intent-guide.md) — 意图路由指南
- [references/global-reference.md](../references/global-reference.md) — 认证机制、全局 flag、输出格式
- [references/error-codes.md](../references/error-codes.md) — 错误码与调试流程
- [references/recovery-guide.md](../references/recovery-guide.md) — recovery 闭环规范
