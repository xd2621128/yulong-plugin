---
name: yulong-rbac
version: "1.0.0"
description: 御龙用户、角色、组织、权限查询。当用户提到御龙用户、人员、员工、查人、角色、组织、权限时使用。首次使用或遇到认证/权限错误时先读 yulong-shared。
cli_version: ">=0.1.0"
metadata:
  requires:
    bins: ["yulong"]
  cliHelp: "yulong rbac --help"
---

# 御龙 RBAC Skill

**执行本 Skill 前，必须先读 [`yulong-shared`](../yulong-shared/SKILL.md) 中的认证模式、Token 模式、错误处理通则。**

## 何时使用

- 用户提到"御龙用户 / 人员 / 员工 / 查人"
- 用户提到"御龙角色 / 组织 / 权限"

## 命令快速路由

| 用户目标 | 命令 | 说明 |
|---|---|---|
| 用户列表 / 用户分页 | `yulong rbac user userPage --json '{"currentPage":1,"pageSize":10}' --format json` | 分页参数必须追问 |

## 信息缺失时的追问

| 命令 | 缺失信息 | 追问示例 |
|---|---|---|
| `yulong rbac user userPage` | 分页参数 | "请提供页码 currentPage 和每页条数 pageSize" |

## 详细参考

- [references/products/rbac.md](../references/products/rbac.md) — RBAC 模块命令详细参考
- [references/global-reference.md](../references/global-reference.md) — 认证机制、全局 flag、输出格式
- [references/error-codes.md](../references/error-codes.md) — 错误码与调试流程
- [references/recovery-guide.md](../references/recovery-guide.md) — recovery 闭环规范
