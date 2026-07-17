# 部门管理命令参考

部门管理（前端页面 `/organization/department`）提供公司组织架构的查询与维护能力：部门树查询、一级部门/子部门的新增、编辑、删除、隐藏、排序、导出，以及业务线维护。

> 所有写操作均为**危险操作**（`is_dangerous=1`），必须执行三步确认（展示摘要 → 用户确认 → 加 `--yes`）。

## 命令总览

| 命令 | 方法 | 路径 | 说明 | 危险 |
|------|------|------|------|------|
| `yulong hr dept listCompany` | POST | `/hr/dept/listCompany` | 公司下拉列表 | |
| `yulong hr dept list` | POST | `/hr/dept/list` | 部门列表（树）查询 | |
| `yulong hr dept detail` | GET | `/hr/dept/detail` | 一级部门详情 | |
| `yulong hr dept subDeptDetail` | GET | `/hr/dept/subDeptDetail` | 子部门详情 | |
| `yulong hr dept judgeDel` | GET | `/hr/dept/judgeDel` | 删除前判断是否可删 | |
| `yulong hr dept getBusinessLine` | POST | `/hr/dept/getBusinessLine` | 业务线下拉选项 | |
| `yulong hr public getUserList` | POST | `/hr/public/getUserList` | 人员下拉（选部门经理/负责人） | |
| `yulong hr dept add` | POST | `/hr/dept/add` | 新增一级部门 | ✔ |
| `yulong hr dept edit` | POST | `/hr/dept/edit` | 编辑一级部门 | ✔ |
| `yulong hr dept addSubDept` | POST | `/hr/dept/addSubDept` | 新增子部门 | ✔ |
| `yulong hr dept editSubDept` | POST | `/hr/dept/editSubDept` | 编辑子部门 | ✔ |
| `yulong hr dept del` | POST | `/hr/dept/del` | 删除部门（一级/子部门通用） | ✔ |
| `yulong hr dept hideDept` | POST | `/hr/dept/hideDept` | 隐藏/显示部门 | ✔ |
| `yulong hr dept editDeptSort` | POST | `/hr/dept/editDeptSort` | 同级部门拖拽排序 | ✔ |
| `yulong hr dept export` | POST | `/hr/dept/export` | 导出部门 Excel | ✔ |
| `yulong hr dept addOrUpdateBusinessLine` | POST | `/hr/dept/addOrUpdateBusinessLine` | 新增/编辑业务线 | ✔ |
| `yulong hr dept removeBusinessLine` | POST | `/hr/dept/removeBusinessLine` | 删除业务线 | ✔ |

## 权限要求

| 命令 | required_permissions | 说明 |
|------|----------------------|------|
| `hr.dept.list` / `listCompany` / `detail` / `subDeptDetail` / `getBusinessLine` | `["department"]` 任一 | 读权限 |
| `hr.dept.judgeDel` | `["department","department_add"]` 任一 | |
| `hr.dept.add` / `edit` / `addSubDept` / `editSubDept` / `del` / `export` / `addOrUpdateBusinessLine` / `removeBusinessLine` | `["department","department_add"]` 全部 | 写权限 |
| `hr.dept.hideDept` / `editDeptSort` | `["department","department_show"]` 全部 | |
| `hr.public.getUserList` | `["all"]` | 任意已登录用户 |

## 查询

### 公司列表

```bash
yulong hr dept listCompany --format json
```

返回公司数组，`deptId` 即后续 `hr.dept.list` 的 `companyId`。主公司通常为第一条（"浙江省公众信息产业有限公司"）。

### 部门列表（树）

```bash
# 查某公司的全部一级部门（含子部门）
yulong hr dept list --json '{"companyId":"532a5198-2b2c-4b9f-9c16-86c8c04b1820"}' --format json

# 按部门名称搜索
yulong hr dept list --json '{"companyId":"<companyId>","dname":"市场"}' --format json

# 按业务线 / 部门经理筛选
yulong hr dept list --json '{"companyId":"<companyId>","businessLine":"支撑单元","leaderName":"孙锵"}' --format json
```

参数：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `companyId` | string | 是 | 公司 id，从 `hr.dept.listCompany` 返回的 `deptId` 获取 |
| `dname` | string | 否 | 部门名称模糊搜索 |
| `leaderName` / `subLeaderName` | string | 否 | 按部门经理 / 分管领导姓名筛选 |
| `businessLine` | string | 否 | 业务线，取值必须来自 `hr.dept.getBusinessLine`，禁止编造 |
| `leaderId` / `subLeaderId` / `deputyLeaderId` / `deptSynthesisId` / `assistantId` | string | 否 | 按人员 id 筛选 |
| `deptIdList` | string[] | 否 | 批量查询指定部门 |

返回节点关键字段：`deptId`、`dname`（名称）、`nickName`（简称）、`leaderName`、`businessLine`、`parentId`、`deptNum`（人数）、`type`（1-一级部门 2-子部门）、`sortNum`、`hide`（1-隐藏 2-显示）、`childDepts`（子部门数组）。

### 部门详情

```bash
# 一级部门详情（编辑前必须先查回显）
yulong hr dept detail --json '{"deptId":"<deptId>"}' --format json

# 子部门详情
yulong hr dept subDeptDetail --json '{"deptId":"<deptId>"}' --format json
```

> `type=1` 的部门用 `hr.dept.detail`，`type=2` 的子部门用 `hr.dept.subDeptDetail`，不要混用。

### 人员下拉（选部门经理/负责人）

```bash
# 全部人员
yulong hr public getUserList --json '{"name":""}' --format json

# 按姓名搜索
yulong hr public getUserList --json '{"name":"金"}' --format json
```

返回 `userId` / `name`，分别作为写操作中的 `leaderId` / `leaderName`。

### 业务线选项

```bash
yulong hr dept getBusinessLine --format json
```

返回 `[{"id":2,"name":"产品研发单元"}, ...]`。`businessLine` 字段传 `name`。

## 写操作（全部需要 --yes）

### 新增一级部门

```bash
yulong hr dept add --yes --format json --json '{
  "deptName":"新部门名称",
  "leaderId":"10029778",
  "leaderName":"金炜",
  "parentId":"<公司 deptId>",
  "parentName":"浙江省公众信息产业有限公司",
  "nickName":"简称",
  "businessLine":"支撑单元",
  "deptIntro":"部门介绍"
}'
```

- **`deptName` 和 `leaderId` 必填**；缺 `leaderId` 后端只返回 `[-1] 运行异常`，无字段提示。
- `leaderId` 必须先用 `hr.public.getUserList` 查到真实人员，禁止编造。
- 返回 `data: null`，**新部门 id 需用 `hr.dept.list` + `dname` 反查获得**。

### 编辑一级部门

```bash
yulong hr dept edit --yes --format json --json '{"deptId":"<deptId>","deptName":"名称","leaderId":"...","nickName":"新简称","businessLine":"支撑单元"}'
```

- 编辑前必须先 `hr.dept.detail` 回显当前值，未提供的字段按详情原样带上，避免清空。

### 新增/编辑子部门

```bash
yulong hr dept addSubDept --yes --format json --json '{"parentId":"<一级部门 deptId>","parentName":"市场部","dname":"子部门名","leaderId":"...","leaderName":"..."}'

yulong hr dept editSubDept --yes --format json --json '{"deptId":"<子部门 deptId>","parentId":"<一级部门 deptId>","dname":"新名称","deptIntro":"..."}'
```

- 子部门属于某个一级部门，`parentId` 必填。
- **`dname` 和 `leaderId` 必填**（与前端表单校验一致）；`leaderId` 先用 `hr.public.getUserList` 查到真实人员。
- 新增同样不返回 id，用 `hr.dept.list` 反查父部门的 `childDepts`。

子部门字段集合（仅限这些）：

| 字段 | 必填 | 说明 |
|------|------|------|
| `parentId` / `parentName` | 是 | 上级一级部门 |
| `dname` | 是 | 子部门名称（最长 128 字） |
| `leaderId` / `leaderName` | 是 | 子部门负责人，从 `hr.public.getUserList` 获取 |
| `deptIntro` | 否 | 子部门介绍 |
| `members` | 否 | 成员列表 `[{"id":"用户id","name":"姓名"}]` |
| `appendix` | 否 | 成立发文附件 |

> **子部门不支持**分管领导、副职、综合、助理、业务线、简称、排序号、是否隐藏等字段——那些属于一级部门或独立操作（排序用 `editDeptSort`，隐藏用 `hideDept`）。收集信息时**禁止向用户询问这些字段**。

### 删除部门

标准流程（先子后父）：

```bash
# 1. 判断是否可删（返回 true 才可删）
yulong hr dept judgeDel --json '{"deptId":"<deptId>"}' --format json

# 2. 删除
yulong hr dept del --yes --json '{"deptId":"<deptId>"}' --format json
```

> **注意：`judgeDel` 只校验部门人数，不校验子部门。** 删除一级部门前必须先用 `hr.dept.list` 确认其 `childDepts` 为空；若有子部门，先逐个删除子部门，再删父部门。`judgeDel` 返回 `false` 说明部门内仍有人员，应告知用户并停止，禁止强行删除。

### 隐藏/显示部门

```bash
yulong hr dept hideDept --yes --json '{"deptId":"<deptId>","isHide":1}' --format json   # 隐藏
yulong hr dept hideDept --yes --json '{"deptId":"<deptId>","isHide":2}' --format json   # 恢复显示
```

### 同级排序

```bash
# 与前端一致：每项只传 deptId，数组顺序即新顺序
yulong hr dept editDeptSort --yes --format json --json '{"deptSort":[{"deptId":"..."},{"deptId":"..."},{"deptId":"..."}]}'
```

> **顺序由数组位置决定，`sortNum` 字段会被后端完全忽略**（提交后后端按数组位置重排 sortNum）。只改 `sortNum` 值、不调数组顺序，排序不会生效。
> 正确做法：先 `hr.dept.list` 取当前顺序，**在数组中把目标部门移动到新位置**，再整体提交。
> **必须覆盖同一上级下的全部兄弟部门**，只提交部分部门会导致顺序错乱。

### 导出部门 Excel

```bash
yulong hr dept export --yes --json '{"companyId":"<companyId>"}' --format json
```

筛选参数同 `hr.dept.list`。返回 `{"type":"file","contentType":"application/vnd.ms-excel","size":N,"buffer":"<base64>"}`，需将 `buffer` base64 解码后保存为 `.xls` 文件再交付用户。

### 业务线维护

```bash
# 新增（不传 id）
yulong hr dept addOrUpdateBusinessLine --yes --json '{"name":"新业务线"}' --format json

# 编辑（传 id）
yulong hr dept addOrUpdateBusinessLine --yes --json '{"id":2,"name":"新名称"}' --format json

# 删除
yulong hr dept removeBusinessLine --yes --json '{"id":13}' --format json
```

业务线被部门引用时删除可能影响已有数据，执行前必须用 `hr.dept.list` 的 `businessLine` 筛选确认无部门使用。

## 意图映射

- "查部门 / 部门列表 / 组织架构 / 看看有哪些部门" → `hr.dept.listCompany` → `hr.dept.list`
- "XX 部门的详情 / 部门经理是谁" → `hr.dept.list`（`dname` 搜索）→ `hr.dept.detail`
- "新建部门 / 添加部门" → 收集名称+经理 → `hr.public.getUserList` 查经理 → 三步确认 → `hr.dept.add`
- "改部门名 / 换部门经理 / 修改部门" → `hr.dept.detail` 回显 → 三步确认 → `hr.dept.edit`
- "加子部门 / 二级部门" → 收集名称+负责人（可选仅介绍/成员/附件）→ 三步确认 → `hr.dept.addSubDept`；改子部门 → `hr.dept.editSubDept`
- "删除部门" → `hr.dept.list` 确认子部门 → `hr.dept.judgeDel` → 三步确认 → `hr.dept.del`
- "隐藏部门 / 不显示某部门" → 三步确认 → `hr.dept.hideDept`（`isHide=1`）
- "调整部门顺序 / 排序" → `hr.dept.list` 取全量顺序 → 在数组中移动目标部门位置 → 三步确认 → `hr.dept.editDeptSort`
- "导出部门" → 三步确认 → `hr.dept.export` → 解码保存文件
- "业务线有哪些 / 新增业务线 / 删业务线" → `hr.dept.getBusinessLine` / `addOrUpdateBusinessLine` / `removeBusinessLine`
- "查部门下有哪些人" → **不归本模块**，转通讯录：`hr.dept.getDeptTree` + `hr.employee.addressBook`（见 [rbac.md](./rbac.md)）

## 信息缺失时的追问

| 场景 | 缺失信息 | 追问示例 |
|---|---|---|
| 新建部门 | 部门名称 / 部门经理 | "请提供新部门的名称和部门经理" |
| 新建子部门 | 名称 / 负责人 / 所属一级部门 | "请提供子部门名称和负责人，以及它挂在哪个一级部门下"（可选仅：介绍、成员、成立发文；**不要问**分管领导/副职/综合/助理/业务线/排序号/是否隐藏） |
| 编辑部门 | 目标部门 / 要改的字段 | "请说明要修改哪个部门、修改哪些内容" |
| 删除/隐藏部门 | 目标部门 | "请提供要删除/隐藏的部门名称" |
| 查部门列表 | 公司（存在多家公司时） | "要查哪家公司的部门？" |

## 错误处理

| 错误 | 原因 | 恢复动作 |
|---|---|---|
| `permission_denied` | 缺 `department` / `department_add` / `department_show` 权限 | 终止并说明缺失权限；本地模式可先 `auth refresh-permissions` |
| `backend_error` `[-1] 运行异常` | 必填字段缺失（多为 `leaderId`）或字段类型错误 | 对照本参考检查必填项，勿盲目重试 |
| 写操作返回 `data: null` / `true` | 正常，后端不回传 id | 用 `hr.dept.list` 反查目标部门确认结果 |
| `judgeDel` 返回 `false` | 部门内仍有人员 | 告知用户不可删除，停止操作 |

## 注意事项

- 部门 id、公司 id、人员 id 一律从前序命令返回中提取，禁止编造。
- `businessLine` 取值必须来自 `hr.dept.getBusinessLine` 返回的 `name`。
- 所有写操作执行后，用对应的查询命令回读校验（如 `hr.dept.detail` / `hr.dept.list`），确认生效后再向用户汇报。
- 涉及人员调整（换经理）时，新旧经理姓名都要在操作摘要中展示给用户确认。
