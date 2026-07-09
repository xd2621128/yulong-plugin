# 御龙 Skill Recovery 指南

## 当前状态

`yulong` CLI 暂未实现 `RECOVERY_EVENT_ID` 机制和 `execute/finalize` 两阶段命令。因此初版 Skill 的 recovery 流程以**重试 + 重新认证 + 完整报错**为主。

## 标准 Recovery 流程

当 CLI 调用失败时，按以下顺序处理：

### Step 1: 用 `--verbose` 重试

```bash
yulong <cmd> --format json --verbose ...
```

目的：查看 stderr 日志，区分网络错误、认证错误、权限错误、后端业务错误。

### Step 2: 认证失败时重新登录

如果 `error.type === "auth_required"`：

- **本地模式**：

  ```bash
  yulong auth login --format json
  ```

  然后重新执行原命令。

- **Token 模式**：

  停止并向上游报告："当前使用 --token 模式，token 已失效，请重新获取 token 后重试"。
  **禁止执行 `yulong auth login`。**

### Step 3: 权限不足时终止

如果 `error.type === "permission_denied"`：
- 向用户说明缺失的权限
- 不再重试，也不尝试其他绕过方式

### Step 4: 后端业务错误时完整报告

如果 `error.type === "backend_error"`：
- 提取 `error.detail.code` 和 `error.message`
- 向用户报告完整错误信息
- 禁止自行构造替代请求

### Step 5: 危险操作确认

如果 `error.type === "validation_error"` 且消息包含"危险操作"和"请添加 --yes 确认"：
- 这是 CLI 的危险操作门禁
- **禁止**自动加 `--yes` 静默重试
- 向用户展示操作摘要（操作类型 + 目标对象 + 影响范围）
- 用户明确同意后，在原命令末尾追加 `--yes` 重试
- 用户拒绝则终止流程

详细协议见 [global-reference.md](./global-reference.md) 的"危险操作确认协议"章节。

### Step 6: 按业务域查看详细恢复

通用 recovery 流程无法覆盖所有业务错误时，参考对应业务域的错误恢复文档：

| 业务域 | 文档 |
|---|---|
| 认证相关 | [error-recovery-auth.md](./products/error-recovery-auth.md) |
| 用户/角色/组织/权限 | [error-recovery-rbac.md](./products/error-recovery-rbac.md) |
| 商机/合同/收入/合作伙伴 | [error-recovery-project.md](./products/error-recovery-project.md) |
| 通报/知识库/文件 | [error-recovery-hr.md](./products/error-recovery-hr.md) |

### Step 7: 仍然失败

如果以上步骤都无法恢复：
- 完整输出命令、参数、错误 envelope、stderr 日志
- 告知用户需要人工排查
- 不猜测、不编造结果

## 禁止行为

- 不要跳过认证直接调后端
- 不要用临时 token 替代失效 token
- 不要猜测用户 ID、组织 ID 等标识符
- 不要对未实现的命令自行构造调用
