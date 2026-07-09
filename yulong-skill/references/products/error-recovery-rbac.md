# RBAC 模块错误恢复

## CLI 错误类型

| `error.type` | 触发场景 | 恢复动作 |
|---|---|---|
| `auth_required` | token 过期 | 按 [`yulong-shared`](../../yulong-shared/SKILL.md) 处理：本地模式 `auth login`，Token 模式上报上游 |
| `permission_denied` | 缺少 `unclaimed-business` 或 `user` 权限 | 终止操作，说明缺失权限 |
| `backend_error` | 后端返回非 0 业务错误码 | 展示完整 `code` 和 `msg`，禁止自行替代方案 |
| `validation_error` | JSON 参数格式错误 | 参考 `yulong rbac user userPage --help` 检查参数 |

## 后端错误码

| 后端码 | 含义 | 恢复动作 |
|---|---|---|
| `0` | 成功 | 正常返回 `data` |
| `-1` | 运行异常 | 加 `--verbose` 重试，仍然失败则人工排查 |
| `4` | 业务异常 | 展示完整 `code` 和 `msg` |
| `400001004` / `400001006` | token 过期 | CLI 自动刷新/重登，失败则 `auth_required` |
| `400001007` | 访问未授权 | 返回 `permission_denied` |

## 常见现象

| 现象 | 可能原因 | 恢复动作 |
|---|---|---|
| 返回 `permission_denied` | 用户缺少 `unclaimed-business` 和 `user` 任一权限 | 终止并说明缺失权限 |
| 返回空列表 | `orgId` 无效或筛选条件过严 | 确认 `orgId` 来自有效返回，或放宽条件 |
| `400 body 数据格式不正确，无法完成序列化` | 参数类型错误，如 `currentPage` 传了字符串 | 检查参数类型，确保数字字段传数字 |
| 搜索不到用户 | 使用 `loginName`/`realName` 精确匹配但输入不准确 | 改用更短的片段重试，或让用户确认账号/姓名 |

## 参考

- [rbac.md](./rbac.md) — RBAC 命令详细参考
- [`yulong-shared/SKILL.md`](../../yulong-shared/SKILL.md) — 认证模式与错误处理通则
- [error-codes.md](../error-codes.md) — 全局错误类型
- [recovery-guide.md](../recovery-guide.md) — recovery 闭环规范
