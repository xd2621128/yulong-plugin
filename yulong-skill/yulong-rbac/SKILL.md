---
name: yulong-rbac
version: "1.1.0"
description: 御龙用户、角色、组织、权限、通讯录查询与部门管理。当用户提到御龙用户、人员、员工、查人、通讯录、角色、组织、权限、部门、组织架构、业务线时使用。首次使用或遇到认证/权限错误时先读 yulong-shared。
cli_version: ">=0.1.0"
metadata:
  requires:
    bins: ["yulong"]
  cliHelp: "yulong rbac --help"
---

# 御龙 RBAC Skill

**执行本 Skill 前，必须先读 [`yulong-shared`](../yulong-shared/SKILL.md) 中的认证模式、Token 模式、错误处理通则和危险操作确认规则。**

## 何时使用

- 用户提到"御龙用户 / 人员 / 员工 / 查人 / 通讯录"
- 用户提到"御龙角色 / 组织 / 权限"
- 用户提到"部门 / 组织架构 / 子部门 / 业务线"（新建、编辑、删除、隐藏、排序、导出部门）

## 命令快速路由

| 用户目标 | 命令 | 说明 |
|---|---|---|
| 用户列表 / 用户分页 | `yulong rbac user userPage --json '{"currentPage":1,"pageSize":10}' --format json` | 分页参数必须追问 |
| 通讯录-按部门查人 | `yulong hr dept getDeptTree --format json` + `yulong hr employee addressBook --json '{"pageNum":1,"pageSize":10,"deptNo":"..."}' --format json` | 先取组织树，再按部门编号查通讯录 |
| 通讯录-按姓名搜索 | `yulong hr employee addressBook --json '{"pageNum":1,"pageSize":10,"name":"..."}' --format json` | 支持姓名模糊搜索 |
| 部门列表 / 组织架构 | `yulong hr dept listCompany --format json` → `yulong hr dept list --json '{"companyId":"..."}' --format json` | 先取公司，再查部门树 |
| 部门详情 | `yulong hr dept detail --json '{"deptId":"..."}' --format json`（子部门用 `hr dept subDeptDetail`） | deptId 从 list 返回提取 |
| 新建/编辑/删除部门 | `yulong hr dept add / edit / del` | 危险操作，三步确认后加 `--yes` |
| 新建/编辑子部门 | `yulong hr dept addSubDept / editSubDept` | 危险操作，三步确认后加 `--yes`；必填 名称+负责人 |
| 隐藏/显示部门 | `yulong hr dept hideDept --json '{"deptId":"...","isHide":1}'` | 危险操作；1-隐藏 2-显示 |
| 部门排序 | `yulong hr dept editDeptSort` | 危险操作；必须提交同级全部部门 |
| 导出部门 Excel | `yulong hr dept export` | 危险操作；返回 base64 文件 |
| 业务线查询/维护 | `yulong hr dept getBusinessLine / addOrUpdateBusinessLine / removeBusinessLine` | 写操作危险，三步确认 |

## 信息缺失时的追问

| 命令 | 缺失信息 | 追问示例 |
|---|---|---|
| `yulong rbac user userPage` | 分页参数 | "请提供页码 currentPage 和每页条数 pageSize" |
| `yulong hr dept add` | 部门名称 / 部门经理 | "请提供新部门的名称和部门经理" |
| `yulong hr dept addSubDept` | 名称 / 负责人 / 上级部门 | "请提供子部门名称和负责人，以及挂在哪个一级部门下"；可选仅介绍/成员/成立发文，**禁止询问**分管领导/副职/综合/助理/业务线/排序号/是否隐藏（子部门不支持） |
| `yulong hr dept del / hideDept` | 目标部门 | "请提供要删除/隐藏的部门名称" |
| `yulong hr dept list` | 公司（多家公司时） | "要查哪家公司的部门？" |

## 危险操作

部门管理写操作全部为危险操作，必须执行三步确认（展示摘要 → 用户明确回复确认 → 加 `--yes` 执行）：

- `yulong hr.dept.add` / `hr.dept.edit` / `hr.dept.addSubDept` / `hr.dept.editSubDept` — 变更组织架构
- `yulong hr.dept.del` — 删除部门，执行前必须先 `hr.dept.judgeDel`，并用 `hr.dept.list` 确认无子部门（先子后父）
- `yulong hr.dept.hideDept` / `hr.dept.editDeptSort` — 影响部门展示
- `yulong hr.dept.export` — 导出全量部门数据
- `yulong hr.dept.addOrUpdateBusinessLine` / `hr.dept.removeBusinessLine` — 业务线变更

## 歧义处理

- "查部门下有哪些人 / 部门通讯录" → 走通讯录流程（`getDeptTree` + `addressBook`），不要用部门管理写接口
- "隐藏部门"不是"删除部门"：隐藏用 `hideDept`（可恢复），删除用 `del`（不可恢复），用户说"不要了/去掉"时必须追问是隐藏还是删除

## 详细参考

- [references/products/rbac.md](../references/products/rbac.md) — RBAC 模块与通讯录命令详细参考
- [references/products/department.md](../references/products/department.md) — 部门管理命令详细参考（参数、流程、注意事项）
- [references/global-reference.md](../references/global-reference.md) — 认证机制、全局 flag、输出格式
- [references/error-codes.md](../references/error-codes.md) — 错误码与调试流程
- [references/recovery-guide.md](../references/recovery-guide.md) — recovery 闭环规范
