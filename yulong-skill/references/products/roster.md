# 花名册管理命令参考

花名册管理（前端页面 `/personnel/people-manage`）提供员工的查询、新增、编辑、排序、导入导出，以及员工维度的合同、调动记录、绩效、附件维护和无审核调动/离职。

> 除查询和导出外，其余操作均为**危险操作**（`is_dangerous=1`），必须执行三步确认（展示摘要 → 用户确认 → 加 `--yes`）。

## 命令总览

| 命令 | 方法 | 路径 | 说明 | 危险 |
|------|------|------|------|------|
| `yulong hr employee rosterList` | POST | `/hr/employee/rosterList` | 花名册列表查询 | |
| `yulong hr employee count` | POST | `/hr/employee/count` | 员工统计（在职/试用/离职等） | |
| `yulong hr employee detail` | POST | `/hr/employee/detail` | 员工详情 | |
| `yulong hr employee customExportEmployee` | POST | `/hr/employee/customExportEmployee` | 自定义导出员工 Excel | |
| `yulong hr employee template` | GET | `/hr/employee/template` | 下载花名册导入模板 | |
| `yulong hr employee setEmployeeSortNum` | POST | `/hr/employee/setEmployeeSortNum` | 员工排序 | ✔ |
| `yulong hr employee addEmployee` | POST | `/hr/employee/addEmployee` | 新增员工 | ✔ |
| `yulong hr employee updateEmployee` | POST | `/hr/employee/updateEmployee` | 编辑员工 | ✔ |
| `yulong hr employee importData` | POST | `/hr/employee/importData` | 花名册一键导入（multipart） | ✔ |
| `yulong hr employee unapprovedTransfer` | POST | `/hr/employee/unapprovedTransfer` | 无审核调动 | ✔ |
| `yulong hr employee unapprovedLeave` | POST | `/hr/employee/unapprovedLeave` | 无审核离职 | ✔ |
| `yulong hr employee getContractList` | POST | `/hr/employee/getContractList` | 员工合同列表 | |
| `yulong hr employee addOrUpdateContract` | POST | `/hr/employee/addOrUpdateContract` | 新增/编辑合同 | ✔ |
| `yulong hr employee removeContract` | POST | `/hr/employee/removeContract` | 删除合同 | ✔ |
| `yulong hr employee getChangeList` | POST | `/hr/employee/getChangeList` | 员工调动记录列表 | |
| `yulong hr employee addChangeRecord` | POST | `/hr/employee/addChangeRecord` | 新增调动记录 | ✔ |
| `yulong hr employee updateChangeRecord` | POST | `/hr/employee/updateChangeRecord` | 编辑调动记录 | ✔ |
| `yulong hr employee removeChangeRecord` | POST | `/hr/employee/removeChangeRecord` | 删除调动记录 | ✔ |
| `yulong hr employee getPerformanceList` | POST | `/hr/employee/getPerformanceList` | 员工绩效列表 | |
| `yulong hr employee exportPerformance` | POST | `/hr/employee/exportPerformance` | 导出绩效 Excel | |
| `yulong hr employee importPerformance` | POST | `/hr/employee/importPerformance` | 导入绩效（multipart） | ✔ |
| `yulong hr employee removePerformance` | POST | `/hr/employee/removePerformance` | 删除绩效 | ✔ |
| `yulong hr employee updateAttachment` | POST | `/hr/employee/updateAttachment` | 编辑员工附件 | ✔ |
| `yulong hr employeeChange employee detail` | POST | `/hr/employeeChange/employee/detail` | 调动-花名册详情 | |
| `yulong hr regularRecord oneClick` | POST | `/hr/regularRecord/oneClick` | 一键转正（query 传参） | ✔ |
| `yulong hr file upload return attachment` | POST | `/hr/file/upload/return/attachment` | 上传文件返回附件对象 | ✔ |
| `yulong hr file download <id>` | GET | `/hr/file/download/{id}` | 下载文件（附件/失败清单） | |

## 权限要求

| 命令 | required_permissions | 说明 |
|------|----------------------|------|
| `rosterList` / `getContractList` / `getChangeList` / `getPerformanceList` / `exportPerformance` / `customExportEmployee` | `["people_manage","internal-recruitment"]` 任一 | |
| `detail` | `["people_manage","dimission","internal-recruitment"]` 任一 | |
| `count` / `template` / `importData` | `["people_manage"]` | |
| `addEmployee` | `["people_manage","people_add"]` 全部 | |
| `updateEmployee` / `addOrUpdateContract` / `removeContract` / `addChangeRecord` / `updateChangeRecord` / `removeChangeRecord` / `importPerformance` / `removePerformance` / `updateAttachment` | `["people_manage","people_edit"]` 全部 | |
| `unapprovedTransfer` | `["people_manage","people_transfer"]` 全部 | |
| `unapprovedLeave` | `["people_manage","people_dimission"]` 全部 | |
| `setEmployeeSortNum` | `["people_manage","intern_people"]` 任一 | |
| `hr.employeeChange.employee.detail` | `["people_manage","transfer","renewal"]` 任一 | |
| `hr.regularRecord.oneClick` | `["regular","regular_noAduit"]` 全部 | |
| `hr.file.download` / `hr.file.upload.return.attachment` | `["all"]` | 任意已登录用户 |

## 查询

### 花名册列表

```bash
# 基础分页查询（注意：页码字段是 pageNum，不是 currentPage）
yulong hr employee rosterList --json '{"pageNum":1,"pageSize":10}' --format json

# 按姓名/ID 关键字
yulong hr employee rosterList --json '{"pageNum":1,"pageSize":10,"name":"张"}' --format json

# 按部门筛选（deptNo/deptType 从 hr.dept.getDeptTree 节点取）
yulong hr employee rosterList --json '{"pageNum":1,"pageSize":10,"deptNo":"...","deptType":1}' --format json

# 组合筛选：岗位 + 入职时间范围
yulong hr employee rosterList --json '{"pageNum":1,"pageSize":10,"positionId":null,"startTime":"2026-01-01","endTime":"2026-12-31"}' --format json
```

参数：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `pageNum` | number | 是 | 页码，从 1 开始（**不是 currentPage**） |
| `pageSize` | number | 是 | 每页条数，建议不超过 100 |
| `name` | string | 否 | 姓名/ID 关键字 |
| `deptNo` / `deptType` | string/number | 否 | 部门编号 + 类型（0-公司 1-部门 2-二级部门），从 `hr.dept.getDeptTree` 节点原样取 |
| `positionType` / `positionSequence` | number | 否 | 岗位类别/序列 id，从 `hr.post.getPostTree` 获取 |
| `position` | number[] | 否 | 岗位名称 id 集合（多选） |
| `contractingCompany` / `affiliatedCompany` | string[] | 否 | 签约公司/工作公司集合 |
| `startTime` / `endTime` | string | 否 | 入职时间范围（YYYY-MM-DD） |
| `sex` | string | 否 | 男/女 |
| `educational` | string[] | 否 | 学历：大专以下/专科/本科/研究生 |
| `isContractType` | number | 否 | 是否合同制：1-是 2-否 |

> 花名册列表受 `people_manage` **数据权限**约束：若返回 `total: 0` 但通讯录能查到人，说明当前用户没有花名册数据权限，如实告知用户，不要当作接口异常处理。
> 查人但不需要花名册字段时，优先用 `hr.employee.addressBook`（通讯录，见 [rbac.md](./rbac.md)）。

### 员工统计

```bash
yulong hr employee count --json '{}' --format json
# 带筛选（与 rosterList 参数一致）
yulong hr employee count --json '{"deptNo":"...","deptType":1}' --format json
```

返回 `totalCount`（总数）、`resident`（在职）、`waitRegular`（待转正）、`leave`（离职）等分类计数。

### 员工详情

```bash
yulong hr employee detail --json '{"employeeId":15820335}' --format json
```

- `employeeId` 从 `rosterList` / `addressBook` 返回中提取，禁止编造。
- 返回员工全量字段（基本信息、工作信息、12 类附件列表等），是 `updateEmployee` / `updateAttachment` 前必做的回显查询。
- 员工已离职时返回 `[4] 该员工未在职`；`hr.employeeChange.employee.detail` 返回结构相同，用于调动场景。

### 合同 / 调动记录 / 绩效列表

```bash
yulong hr employee getContractList --json '{"employeeId":...}' --format json
yulong hr employee getChangeList --json '{"employeeId":...}' --format json
yulong hr employee getPerformanceList --json '{"employeeId":...}' --format json
```

均只传 `employeeId`，返回数组（无分页）。合同中后续操作用 `contractId`；调动记录用 `recordId`；绩效用 `id`。

### 导出（返回 base64 文件）

```bash
# 自定义导出员工：customExportParamList 指定导出列
yulong hr employee customExportEmployee --format json --json '{
  "pageNum":1,"pageSize":100,
  "customExportParamList":[{"cnName":"姓名","enName":"name"},{"cnName":"部门","enName":"deptName"}]
}'

# 导出某员工绩效
yulong hr employee exportPerformance --json '{"employeeId":...}' --format json

# 下载花名册导入模板
yulong hr employee template --format json
```

返回 `{"type":"file","contentType":"application/vnd.ms-excel",...,"buffer":"<base64>"}`，需将 `buffer` base64 解码后保存为 `.xls`/`.xlsx` 文件再交付用户。`customExportEmployee` 的筛选参数同 `rosterList`。

## 员工写操作（全部需要 --yes）

### 新增员工

```bash
yulong hr employee addEmployee --yes --format json --json '{
  "name":"张三",
  "sex":"sex0",
  "idNumber":"110101199001011234",
  "mobile":"13900000000",
  "dingTalkPhone":"13900000000",
  "affiliatedCompany":"workingCompany1",
  "contractingCompany":"contractingCompany1",
  "deptNo":"<部门编号>",
  "positionTypeId":9439814,
  "positionSequenceId":9439815,
  "positionId":18198219,
  "actualPost":"实际岗位",
  "entryDate":"2026-07-20",
  "isSm":0,
  "isArchivesInCompany":0,
  "isTrainingAgreement":0
}'
```

必填（与前端表单校验一致）：`name`、`sex`、`idNumber`、`mobile`、`dingTalkPhone`、`affiliatedCompany`、`contractingCompany`、`deptNo`、`positionTypeId`、`positionSequenceId`、`positionId`、`actualPost`、`entryDate`、`isSm`、`isArchivesInCompany`、`isTrainingAgreement`。

- 字典类字段（`sex`、`affiliatedCompany`、`contractingCompany`、`contractType` 等）取值是后端字典 code（如 `sex0`、`workingCompany1`），**从现有员工的 `hr.employee.detail` 返回中复制格式**，禁止编造未见过的取值；不确定时向用户展示已有样例确认。
- 岗位三件套（`positionTypeId`/`positionSequenceId`/`positionId`）从 `hr.post.getPostTree` 获取。
- 后端创建员工会同步钉钉；若返回 `[4] 获取钉钉token失败...`，是后端环境无法访问钉钉 API，并非参数错误，如实告知用户。
- 成功返回 `data: true`，不回传 id；用 `rosterList` / `addressBook` 按姓名反查新员工的 `employeeId`。

### 编辑员工

```bash
# 1. 先拉详情回显
yulong hr employee detail --json '{"employeeId":...}' --format json
# 2. 在详情基础上改目标字段，全量提交（employeeId 必填）
yulong hr employee updateEmployee --yes --timeout 120 --json-file /tmp/emp-update.json --format json
```

- **必须先 `detail` 拉全量，再改目标字段整体提交**；只提交部分字段可能清空其他信息。
- 执行后用 `detail` 回读校验，再向用户汇报。

### 员工排序

```bash
yulong hr employee setEmployeeSortNum --yes --format json --json '{"list":[{"employeeId":123,"sortNum":1},{"employeeId":456,"sortNum":2}]}'
```

与前端拖拽一致：`list` 覆盖当前列表范围内的**全部**员工，`sortNum` 从 1 递增按新位置赋值。

### 花名册一键导入

```bash
# 1. 下载模板
yulong hr employee template --format json   # base64 解码保存 xlsx
# 2. 导入
yulong hr employee importData --yes --file /path/to/花名册.xlsx --format json
```

- 仅支持 `--file` 指定本地文件（FormData 字段名 `file`），无其他参数。
- 导入存在失败行时，响应 `data` 中含 `fileId`/`name`（失败清单），用 `yulong hr file download <fileId> --format json` 下载并解码交付用户。

### 无审核调动

```bash
yulong hr employee unapprovedTransfer --yes --timeout 120 --format json --json '{
  "employeeId":...,
  "changeType":"2000",
  "oldDeptId":"<当前 detail.deptNo>",
  "deptNo":"<新部门编号>",
  "positionTypeId":...,"positionSequenceId":...,"positionId":...,
  "salaryChange":2,
  "changeDate":"2026-07-20",
  "changeReason":"调动原因"
}'
```

- 必填：`employeeId`、`changeType`（1000-部门内 2000-跨部门）、`deptNo`、岗位三件套、`salaryChange`（1-是 2-否）、`changeDate`、`changeReason`；`salaryChange=1` 时 `newSalary` 必填。
- **执行后员工部门真实变更**，并生成一条带 `employeeChangeId` 的系统调动记录（**该记录不可编辑、不可删除**）。执行前务必在摘要中说明"会真实变更部门并留下不可删的调动记录"。

### 无审核离职

```bash
yulong hr employee unapprovedLeave --yes --timeout 120 --format json --json '{
  "employeeId":...,
  "resignationTime":"2026-07-20",
  "resignMethod":"resignMethod2",
  "resignReason":"离职原因"
}'
```

- 必填：`employeeId`、`resignationTime`（止薪时间）、`resignMethod`、`resignReason`。
- `resignMethod` 是字典 code（如 `resignMethod1`-企业解除 `resignMethod2`-员工解除 `resignMethod3`-协商一致），从已有数据或用户确认取值。
- **不可恢复**：员工状态变为离职，重新在职需要新增员工。摘要中必须明确警示。

### 一键转正

```bash
yulong hr regularRecord oneClick --yes --json '{"regularId":"..."}' --format json
```

- `regularId` 是**待转正记录 id**（query 传参），需用户提供（转正管理列表接口未开放，无法通过 CLI 查询）。
- 花名册列表页的"转正"入口在前端已注释，线上入口在转正管理页。

## 合同维护（全部需要 --yes）

```bash
# 新增（不传 contractId）
yulong hr employee addOrUpdateContract --yes --format json --json '{"employeeId":...,"contractCompany":"employeeContractCompany1","contractType":"employeeContractType1","startTime":"2026-01-01","endTime":"2026-12-31","signCount":1,"contractSerial":"HT-2026-001"}'

# 编辑（传 contractId，从 getContractList 获取）
yulong hr employee addOrUpdateContract --yes --format json --json '{"employeeId":...,"contractId":1426,"contractCompany":"...","contractType":"...",...}'

# 删除
yulong hr employee removeContract --yes --json '{"contractId":1426}' --format json
```

- `contractCompany` / `contractType` 必填，取后端字典 code（如 `employeeContractCompany1`、`employeeContractType1`），从 `getContractList` 已有记录复制格式。
- 附件字段 `filePathList`：`[{"fileId":"...","name":"...","url":"..."}]`，fileId 先用 `hr.file.upload.return.attachment` 上传获得。

## 调动记录维护（全部需要 --yes）

```bash
# 新增（不带 recordId）
yulong hr employee addChangeRecord --yes --format json --json '{"employeeId":...,"changeType":"1000","changeDate":"2026-07-20","originDeptName":"原部门","currentDeptNo":"<新部门编号>","currentDeptName":"新部门"}'

# 编辑（带 recordId）
yulong hr employee updateChangeRecord --yes --format json --json '{"recordId":657,"employeeId":...,...}'

# 删除
yulong hr employee removeChangeRecord --yes --json '{"recordId":657}' --format json
```

- 必填：`originDeptName`、`currentDeptNo`（编辑时另需 `recordId`）。
- **带 `employeeChangeId` 的记录是系统生成的真实调动记录，后端拒绝编辑/删除（`[4] 该记录不可编辑`）**，只能维护手工新增的记录。删除前先 `getChangeList` 确认目标记录没有 `employeeChangeId`。

## 绩效维护（全部需要 --yes）

```bash
# 导入（employeeId 走 query，文件走 --file）
yulong hr employee importPerformance --yes --file /path/to/绩效.xlsx --json '{"employeeId":"..."}' --format json

# 删除
yulong hr employee removePerformance --yes --json '{"id":7794}' --format json
```

- 导入文件列：`考核名称 / 覆盖周期 / 考核部门 / 被考核人 / 考核结果`。可先用 `exportPerformance` 导出该员工的绩效 Excel 获得表头格式。
- 删除的 `id` 从 `getPerformanceList` 获取。

## 附件维护（需要 --yes，高风险）

```bash
yulong hr employee updateAttachment --yes --timeout 120 --json-file /tmp/att.json --format json
```

请求体：`{"employeeId":..., "<类别>List":[...], ...}`，共 12 类：`idNumberAttachmentList`（身份证）、`idPhotoAttachmentList`（证件照）、`academicDegreesAttachmentList`（学位证）、`academicDegreesChsiAttachmentList`（学位学信网）、`educationalAttachmentList`（学历证）、`educationalChsiAttachmentList`（学历学信网）、`employmentSeparationCertificateList`（离职证明）、`residenceBookletAttachmentList`（户口簿）、`bankCardAttachmentList`（银行卡）、`vocationalCertificateAttachmentList`（职业证书）、`healthExamReports`（体检报告）、`dischargeCertificateList`（退伍证书）。

> **后端按类别整体覆盖，未提交的类别会被清空！**
> 正确流程：`hr.employee.detail` 拉取全部 12 类附件现状 → 在目标类别上增删（新附件先用 `hr.file.upload.return.attachment` 上传拿 fileId/url）→ **12 类整体提交** → `detail` 回读校验。

## 意图映射

- "查花名册 / 员工列表 / 研发部有多少员工" → `hr.employee.rosterList` / `hr.employee.count`（按部门筛选先 `hr.dept.getDeptTree` 取 deptNo）
- "查 XXX 的详情 / 合同 / 调动记录 / 绩效" → `hr.employee.addressBook` 或 `rosterList` 查 employeeId → `hr.employee.detail` / `getContractList` / `getChangeList` / `getPerformanceList`
- "导出员工名单 / 导出绩效" → `customExportEmployee` / `exportPerformance` → 解码保存文件
- "新增员工 / 入职" → 收集必填字段（字典值参照已有员工 detail）→ 三步确认 → `addEmployee`
- "修改员工信息" → `detail` 回显 → 三步确认 → `updateEmployee`（全量提交）
- "给员工调部门" → `detail` 取现状 + `hr.dept.getDeptTree` 选新部门 → 三步确认 → `unapprovedTransfer`
- "给员工办离职" → 收集离职时间/方式/原因 → 三步确认（警示不可恢复）→ `unapprovedLeave`
- "补一条调动记录" → 三步确认 → `addChangeRecord`（区别于真实调动 `unapprovedTransfer`）
- "导入花名册 / 导入绩效" → 先下载模板（`template` / `exportPerformance` 表头）→ 三步确认 → `importData` / `importPerformance`
- "传身份证/合同附件" → `hr.file.upload.return.attachment` 上传 → `updateAttachment`（12 类整体提交）
- "转正" → 追问待转正记录 id → 三步确认 → `hr.regularRecord.oneClick`
- "查通讯录 / 查某人在哪个部门" → **不归本模块**，用 `hr.employee.addressBook`（见 [rbac.md](./rbac.md)）

## 信息缺失时的追问

| 场景 | 缺失信息 | 追问示例 |
|---|---|---|
| 查花名册 | 页码/筛选条件 | "查第几页？要按部门或姓名筛选吗？"（pageNum 必填） |
| 员工维度操作 | 目标员工 | "请提供员工姓名，我先查一下 employeeId" |
| 新增员工 | 必填字段 | "请提供姓名、身份证号、手机号、钉钉手机号、入职日期、部门、岗位、实际岗位" |
| 编辑员工 | 要改的字段 | "要修改哪些信息？"（先 detail 回显） |
| 无审核调动 | 新部门/岗位/生效时间/原因 | "请提供调入部门、岗位、生效日期和调动原因；薪资是否调整？" |
| 无审核离职 | 离职时间/方式/原因 | "请提供离职时间、离职方式（企业解除/员工解除/协商一致）和离职原因；该操作不可恢复，确认吗？" |
| 新增/编辑合同 | 合同公司/类型/期限 | "请提供合同公司、合同类型（固定期限/无固定期限）和起止日期" |
| 一键转正 | regularId | "请提供待转正记录的 id（转正管理列表中查看）" |
| 导入 | 文件 | "请提供要导入的 Excel 文件路径" |

## 错误处理

| 错误 | 原因 | 恢复动作 |
|---|---|---|
| `permission_denied` | 缺 `people_manage` / `people_add` / `people_edit` / `people_transfer` / `people_dimission` / `regular` 等权限 | 终止并说明缺失权限；本地模式可先 `auth refresh-permissions` |
| `rosterList`/`count` 返回 0 | 当前用户无花名册数据权限 | 如实告知，勿当接口异常；查人改用 `addressBook` |
| `[4] 该员工未在职` | 目标员工已离职或 id 无效 | 确认 employeeId 来源；离职员工不能再做在职操作 |
| `[4] 该记录不可编辑` | 尝试编辑/删除带 `employeeChangeId` 的系统调动记录 | 告知用户系统记录不可改，只能手工新增记录 |
| `[4] 获取钉钉token失败...` | 后端无法访问钉钉 API（环境问题） | 如实告知，非参数错误，不要重试 |
| `[-1] 运行异常` | 必填字段缺失或字典取值错误 | 对照本参考检查必填项与字典格式 |
| 写操作返回 `data: true` | 正常，后端不回传 id | 用对应查询命令反查确认结果 |

## 注意事项

- `employeeId`、`deptNo`、`positionId` 等标识符一律从前序命令返回中提取，禁止编造。
- 所有写操作执行后用对应查询命令回读校验，确认生效再汇报。
- 涉及附件、编辑员工等"全量提交"语义的接口，必须先 detail 回显再整体提交。
- 无审核调动/离职会真实变更员工状态并留下不可删记录，摘要中必须明确提示。
