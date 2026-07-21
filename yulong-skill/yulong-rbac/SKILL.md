---
name: yulong-rbac
version: "1.3.0"
description: 御龙用户、角色、组织、权限、通讯录、花名册（员工）查询与部门/岗位管理。当用户提到御龙用户、人员、员工、花名册、查人、通讯录、角色、组织、权限、部门、组织架构、业务线、岗位、岗位类别、岗位序列、员工合同、调动、绩效、离职、转正时使用。首次使用或遇到认证/权限错误时先读 yulong-shared。
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
- 用户提到"岗位 / 岗位类别 / 岗位序列 / 岗位体系"（查询、新增、编辑、删除、导出岗位）
- 用户提到"花名册 / 员工入职 / 员工信息修改 / 员工合同 / 调动记录 / 绩效 / 员工附件 / 无审核调动 / 离职 / 转正 / 导入花名册 / 导出员工名单"

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
| 岗位树 / 岗位搜索 | `yulong hr post getPostTree --format json`（可加 `--json '{"name":"..."}'`） | 三级体系：类别→序列→岗位 |
| 岗位类别/序列/岗位下拉 | `yulong hr post getPostByType --json '{"type":"1"}' --format json` | type=2 需 typeId；type=3 需 typeId+sequenceId |
| 岗位详情 / 绑定人数 | `yulong hr post getDetail / getPostUserNum --json '{"positionId":...}' --format json` | 删除前必查人数 |
| 新增/编辑/删除岗位 | `yulong hr post addPost / updatePost / removePost` | 危险操作，三步确认后加 `--yes` |
| 导出岗位 Excel | `yulong hr post exportPost --format json` | 非危险操作；返回 base64 文件 |
| 花名册列表 / 员工统计 | `yulong hr employee rosterList --json '{"pageNum":1,"pageSize":10}' --format json` / `hr employee count` | 页码字段是 **pageNum**；返回 0 多为无数据权限 |
| 员工详情 / 合同 / 调动记录 / 绩效 | `yulong hr employee detail / getContractList / getChangeList / getPerformanceList --json '{"employeeId":...}' --format json` | employeeId 从 rosterList/addressBook 提取 |
| 新增/编辑员工 | `yulong hr employee addEmployee / updateEmployee` | 危险操作；编辑前必须先 detail 回显、全量提交 |
| 导出员工 / 导出绩效 / 下载导入模板 | `yulong hr employee customExportEmployee / exportPerformance / template` | 返回 base64 文件，解码保存 |
| 花名册/绩效导入 | `yulong hr employee importData / importPerformance --file <path>` | 危险操作；multipart 上传 |
| 无审核调动 / 离职 | `yulong hr employee unapprovedTransfer / unapprovedLeave` | 危险操作；真实变更状态并留不可删记录 |
| 合同/调动记录/绩效 增删改 | `yulong hr employee addOrUpdateContract / removeContract / addChangeRecord / updateChangeRecord / removeChangeRecord / removePerformance` | 危险操作，三步确认 |
| 员工附件维护 | `yulong hr employee updateAttachment` | 危险操作；**12 类附件整体覆盖，未提交类别会被清空** |
| 一键转正 | `yulong hr regularRecord oneClick --json '{"regularId":"..."}'` | 危险操作；regularId 需用户提供 |

## 信息缺失时的追问

| 命令 | 缺失信息 | 追问示例 |
|---|---|---|
| `yulong rbac user userPage` | 分页参数 | "请提供页码 currentPage 和每页条数 pageSize" |
| `yulong hr dept add` | 部门名称 / 部门经理 | "请提供新部门的名称和部门经理" |
| `yulong hr dept addSubDept` | 名称 / 负责人 / 上级部门 | "请提供子部门名称和负责人，以及挂在哪个一级部门下"；可选仅介绍/成员/成立发文，**禁止询问**分管领导/副职/综合/助理/业务线/排序号/是否隐藏（子部门不支持） |
| `yulong hr dept del / hideDept` | 目标部门 | "请提供要删除/隐藏的部门名称" |
| `yulong hr dept list` | 公司（多家公司时） | "要查哪家公司的部门？" |
| `yulong hr post addPost` | 名称 / 上级 | "请提供名称；新增序列需说明所属类别，新增岗位需说明所属类别和序列" |
| `yulong hr post updatePost / removePost` | 目标节点 | "请提供要修改/删除的岗位（类别/序列/岗位）名称" |
| `yulong hr employee rosterList` | 筛选条件 | "查第几页？要按部门或姓名筛选吗？"（页码字段是 pageNum） |
| `yulong hr employee addEmployee` | 必填字段 | "请提供姓名、身份证号、手机号、钉钉手机号、入职日期、部门、岗位、实际岗位" |
| `yulong hr employee updateEmployee` | 要改的字段 | "要修改哪些信息？"（先 detail 回显再全量提交） |
| `yulong hr employee unapprovedTransfer` | 新部门/岗位/生效时间/原因 | "请提供调入部门、岗位、生效日期和调动原因；薪资是否调整？" |
| `yulong hr employee unapprovedLeave` | 离职时间/方式/原因 | "请提供离职时间、离职方式（企业解除/员工解除/协商一致）和离职原因；该操作不可恢复，确认吗？" |
| `yulong hr regularRecord oneClick` | regularId | "请提供待转正记录的 id（转正管理列表中查看）" |

## 危险操作

部门管理写操作全部为危险操作，必须执行三步确认（展示摘要 → 用户明确回复确认 → 加 `--yes` 执行）：

- `yulong hr.dept.add` / `hr.dept.edit` / `hr.dept.addSubDept` / `hr.dept.editSubDept` — 变更组织架构
- `yulong hr.dept.del` — 删除部门，执行前必须先 `hr.dept.judgeDel`，并用 `hr.dept.list` 确认无子部门（先子后父）
- `yulong hr.dept.hideDept` / `hr.dept.editDeptSort` — 影响部门展示
- `yulong hr.dept.export` — 导出全量部门数据
- `yulong hr.dept.addOrUpdateBusinessLine` / `hr.dept.removeBusinessLine` — 业务线变更

岗位管理写操作同样全部为危险操作（导出除外）：

- `yulong hr.post.addPost` / `hr.post.updatePost` — 变更岗位体系（类别/序列/岗位）
- `yulong hr.post.removePost` — 删除岗位节点，执行前必须先 `hr.post.getPostUserNum` 确认绑定人数为 0，并用 `hr.post.getPostTree` 确认无下级节点（先子后父）

花名册写操作全部为危险操作（查询和导出除外）：

- `yulong hr.employee.addEmployee` / `hr.employee.updateEmployee` — 新增/编辑员工；编辑必须先 `hr.employee.detail` 回显并全量提交
- `yulong hr.employee.unapprovedTransfer` / `hr.employee.unapprovedLeave` — 真实变更员工部门/状态，生成**不可删**的系统调动记录；离职不可恢复，摘要中必须警示
- `yulong hr.employee.setEmployeeSortNum` — 员工排序，list 须覆盖当前范围全部员工
- `yulong hr.employee.importData` / `hr.employee.importPerformance` — 批量导入，失败清单用 `hr.file.download` 下载
- `yulong hr.employee.addOrUpdateContract` / `hr.employee.removeContract` — 合同增删改
- `yulong hr.employee.addChangeRecord` / `hr.employee.updateChangeRecord` / `hr.employee.removeChangeRecord` — 手工调动记录维护；带 `employeeChangeId` 的系统记录后端拒绝编辑/删除
- `yulong hr.employee.removePerformance` — 删除绩效
- `yulong hr.employee.updateAttachment` — **12 类附件整体覆盖，未提交类别会被清空**；必须先 detail 拉全量再整体提交
- `yulong hr.regularRecord.oneClick` — 一键转正，直接变更员工状态

## 歧义处理

- "查部门下有哪些人 / 部门通讯录" → 走通讯录流程（`getDeptTree` + `addressBook`），不要用部门管理写接口
- "隐藏部门"不是"删除部门"：隐藏用 `hideDept`（可恢复），删除用 `del`（不可恢复），用户说"不要了/去掉"时必须追问是隐藏还是删除
- "岗位"不是"部门"：岗位体系（类别→序列→岗位）用 `hr.post.*`，组织架构用 `hr.dept.*`，两套 id 不通用，禁止混用
- "查人 / 某人在哪个部门" 用通讯录 `hr.employee.addressBook`；"花名册 / 员工名单 / 在职人数" 才用 `hr.employee.rosterList` / `count`（受 people_manage 数据权限约束，返回 0 时先说明可能是无数据权限）
- "调动"有两种：真实变更部门的用 `hr.employee.unapprovedTransfer`（留不可删记录）；只是补录一条历史记录的用 `hr.employee.addChangeRecord`。用户没说明时必须追问
- "转正"入口不在花名册页：`hr.regularRecord.oneClick` 需要转正管理列表的记录 id（regularId），需用户提供

## 详细参考

- [references/products/rbac.md](../references/products/rbac.md) — RBAC 模块与通讯录命令详细参考
- [references/products/department.md](../references/products/department.md) — 部门管理命令详细参考（参数、流程、注意事项）
- [references/products/post.md](../references/products/post.md) — 岗位管理命令详细参考（参数、流程、注意事项）
- [references/products/roster.md](../references/products/roster.md) — 花名册管理命令详细参考（参数、流程、注意事项）
- [references/global-reference.md](../references/global-reference.md) — 认证机制、全局 flag、输出格式
- [references/error-codes.md](../references/error-codes.md) — 错误码与调试流程
- [references/recovery-guide.md](../references/recovery-guide.md) — recovery 闭环规范
