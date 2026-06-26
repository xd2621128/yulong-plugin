# 商机列表（Business）

`project.business.list` 是 Agent 应使用的 CLI 命令，其内部映射到后端接口 `POST /project/business/list`，用于查询**全量商机列表**。Agent 禁止直接调用该后端接口。

## 权限要求

- 本地权限预检：`["week-field", "business-list"]`，满足**任意一个**即可
- 请求头：默认自动带上 `X-ResourceMark: business-list`
- 如用户无上述任一权限，CLI 会直接返回 `permission_denied`，不会调用后端

## 命令

```bash
yulong project business list --json '{"currentPage":1,"pageSize":10}' --format json
```

## 核心流程

当用户提到需要按部门、区域、客户属地、产品田、营销田等条件查询时，必须**先查字典接口拿到 ID，再调用列表接口**。

> **大区 vs 区域 严格区分**：
> - 用户说"XX 大区"通常是想按**部门**筛选（`depId`），但部门字典里的 `dname` 不一定就叫"XX 大区"，必须通过 `project crmField dept` 查询并在结果中匹配用户意图
> - "XX 区域"才指区域字典（`regionId`），应查 `project crmField region`
> - 如果 `dept` 字典中找不到能匹配用户说法的部门，必须向用户确认，禁止自动把"大区"当作"区域"处理

```
用户提示词
  ├─ 提到部门/大区（如西北大区） → 调 project crmField dept 查 deptId
  │                                  实际部门名称不一定是"XX 大区"，需在结果中匹配用户意图
  │                                  查无结果时追问确认，禁止 fallback 到 region
  ├─ 提到区域（如西北区域） → 调 project crmField region 查 regionId
  ├─ 提到客户属地/省份城市 → 调 project crmField province 查 areaId
  ├─ 提到产品田 → 调 project crmField productField 查 productField id
  ├─ 提到营销田总监 → 调 project crmField marketField 查 majordomoId
  └─ 其他字段（类别、派单状态、商机类型/级别/阶段/状态、客户类型、来源、项目归属、是否科创/软件开发/解构/中台把关/预估有效/风险评估/投标、投标结果、时间范围、金额范围、成本概算状态、审批状态等） → 直接构造 business list 参数
```

## 字典接口

以下接口已对认证用户开放（`match_mode: all`，`required_permissions: ["all"]`），Agent 可直接调用：

| 字典 | 命令 | 后端接口 | 说明 |
|------|------|----------|------|
| 部门/大区 | `yulong project crmField dept --format json` | `GET /project/crmField/dept` | 返回 `{dname, deptId}`，支持多选（`depId` 传数组） |
| 区域 | `yulong project crmField region --format json` | `GET /project/crmField/region` | 返回 `{name, id}`，`regionId` 传数字 id，`-1` 表示空 |
| 客户属地 | `yulong project crmField province --format json` | `GET /project/crmField/province` | 返回省市区树，`areaId` 传叶子节点 id，`-1` 表示空 |
| 产品田 | `yulong project crmField productField --format json` | `GET /project/crmField/productField` | 返回 `{id, name, children}`，`productField` 传叶子 id 数组，`-1` 表示空 |
| 营销田总监 | `yulong project crmField marketField --format json` | `GET /project/crmField/marketField` | 返回 `{name, majordomo, majordomoId}`，`marketLeader` 传 `majordomoId`，`-1` 表示空 |

> 字典查询结果可能很长，可在命令后加 `--fields` 筛选，或先用 `grep`/`jq` 在本地过滤。

## 常用参数

| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `currentPage` | number | 页码，从 1 开始 | `1` |
| `pageSize` | number | 每页条数，建议不超过 100 | `10` |
| `keyword` | string | 关键字查询（商机名称/编码/客户名等） | `"某项目"` |
| `depId` | string[] | **部门 ID 集合**，需先查字典 | `["1894319070076387330"]` |
| `regionId` | number | **区域 ID**（`-1` 表示空），需先查字典 | `111` |
| `areaId` | string | **客户属地叶子节点 ID**，多个以英文逗号拼接（`-1` 表示空），需先查字典 | `"330402"` |
| `productField` | number[] | **产品田叶子 ID 集合**（`-1` 表示空），需先查字典 | `[9589]` |
| `marketLeader` | string | **营销田总监 ID（majordomoId）**（`-1` 表示空），需先查字典 | `"12814896"` |
| `businessType` | number | 商机类别：1-项目型商机 2-阿里云商机 3-运营型商机 4-原子能力型商机 5-SM型商机 6-其他账套商机 | `1` |
| `sendOrderStatus` | number | 派单状态：1-已接单 2-未接单 3-待指派 4-未派单 | `1` |
| `businessCategory` | number | 商机类型：1-产品类 2-集成类 3-空 | `1` |
| `businessLevel` | number | 商机级别：1-A级 2-B级 3-C级 4-空 | `1` |
| `businessProcess` | number | 商机阶段：501-考察建议 502-方案立项 503-财政评审 504-招投标 | `501` |
| `status` | number[] | 商机状态：2000-新增 2001-推进 2002-赢单 | `[2000, 2001]` |
| `customerType` | number | 客户类型：0-空 1-民营上市/IPO企业 2-黑名单客商 | `1` |
| `customerCategory` | number | 客户类别：1-头部客户 2-蓝海客户 3-其他 | `1` |
| `origin` | number | 来源：-1-空 41-电信 42-渠道 45-自有 | `41` |
| `belong` | number | 项目归属：-1-空 11-省外项目（省级） 12-省外项目（市级） 21-省内项目（省级） 22-省内项目（市级） 23-省内项目（区县） | `21` |
| `isScience` | number | 是否科创项目：-1-空 0-否 1-是 | `1` |
| `isSoftware` | number | 是否含软件开发：-1-空 0-否 1-是 | `1` |
| `isDestruction` | number | 是否解构：-1-空 0-否 1-是 | `0` |
| `midCheckStatus` | number | 中台把关状态：-1-空 0-中台未把关 1-中台已把关 | `1` |
| `isPredictValuable` | number | 是否预估有效：-1-空 0-否 1-是 | `1` |
| `riskAssessment` | number | 是否风险评估：0-否 1-是 | `0` |
| `whetherBid` | number | 是否投标：-1-空 0-否 1-是 | `1` |
| `bidResult` | number | 投标结果：-1-空 1-中标 2-未中标 3-流标 4-废标 5-未投标 | `1` |
| `bidDateBegin` | string | 投标时间开始（YYYY-MM-DD） | `"2025-12-01"` |
| `bidDateEnd` | string | 投标时间结束（YYYY-MM-DD） | `"2025-12-31"` |
| `preSignDateBegin` | string | 预签日期开始（YYYY-MM-DD） | `"2025-12-01"` |
| `preSignDateEnd` | string | 预签日期结束（YYYY-MM-DD） | `"2025-12-31"` |
| `createTimeBegin` | string | 转化时间开始（YYYY-MM-DD） | `"2025-01-01"` |
| `createTimeEnd` | string | 转化时间结束（YYYY-MM-DD） | `"2025-12-31"` |
| `maintainTimeBegin` | string | 维护时间开始（YYYY-MM-DD） | `"2025-01-01"` |
| `maintainTimeEnd` | string | 维护时间结束（YYYY-MM-DD） | `"2025-12-31"` |
| `interactTimeBegin` | string | 客触时间开始（YYYY-MM-DD） | `"2025-01-01"` |
| `interactTimeEnd` | string | 客触时间结束（YYYY-MM-DD） | `"2025-12-31"` |
| `updateTimeBegin` | string | 更新时间开始（YYYY-MM-DD） | `"2025-01-01"` |
| `updateTimeEnd` | string | 更新时间结束（YYYY-MM-DD） | `"2025-12-31"` |
| `winOrderTimeBegin` | string | 赢单时间开始（YYYY-MM-DD） | `"2025-01-01"` |
| `winOrderTimeEnd` | string | 赢单时间结束（YYYY-MM-DD） | `"2025-12-31"` |
| `outerMainBegin` | number | 外部主营金额开始 | `100000` |
| `outerMainEnd` | number | 外部主营金额结束 | `1000000` |
| `preGrossBegin` | number | 预估毛利率开始（%） | `15` |
| `preGrossEnd` | number | 预估毛利率结束（%） | `30` |
| `isCostEstimate` | number | 是否已成本概算：0-未概算 1-已概算 | `1` |
| `productFieldStatus` | number | 产品田审批状态：1-待审批 2-审批退回 3-审批通过 | `3` |
| `levelProcessStatus` | number | 项目定级审批状态：1-待审批 2-修改通过 3-审批通过 | `3` |
| `sortField` | string | 排序字段 | `"preSignDate"` |
| `sort` | boolean | 排序方向：`true` 升序，`false` 降序 | `false` |

> 完整字段和类型以 `yulong project business list --help` 和实际响应为准。

## 意图映射

| 用户说法 | 对应命令 | 说明 |
|----------|----------|------|
| "查询商机列表" / "查一下商机" / "列出所有商机" | `yulong project business list` | 全量商机列表查询 |
| "按部门/大区查商机" / "西北大区的商机" | 先 `project crmField dept`，再 `project business list` | 用户说"西北大区"通常想按部门筛选，但实际部门名称不一定是"西北大区"；必须在 dept 字典中匹配，找不到时追问用户 |
| "按区域查商机" / "西北区域的商机" | 先 `project crmField region`，再 `project business list` | 区域是 region |
| "按客户属地查商机" / "浙江的商机" | 先 `project crmField province`，再 `project business list` | 客户属地是 areaId |
| "按产品田查商机" | 先 `project crmField productField`，再 `project business list` | 产品田是 productField |
| "按营销田总监查商机" | 先 `project crmField marketField`，再 `project business list` | marketLeader 是 majordomoId |
| "按时间查商机" / "25 年的商机" | `project business list` + 时间范围参数 | 按预签/转化/更新时间筛选 |
| "商机分页" / "第 N 页商机" | `project business list` + `currentPage`/`pageSize` | 分页查询 |

## 典型场景

### 场景 1：按部门（大区）和预签日期查询

> 请帮我查西北大区 2025 年 12 月的商机列表。

"西北大区" 是用户口语中的部门说法；实际部门字典中的名称可能是"西北大区营销中心"等，也可能不是"XX 大区"命名，需通过 `project crmField dept` 查询匹配。它对应 **部门**（`depId`），不是区域。

**Step 1**：查部门字典

```bash
yulong project crmField dept --format json
```

在结果中搜索到：

```json
{ "dname": "西北大区营销中心", "deptId": "1894319070076387330" }
```

**Step 2**：用 deptId 查列表

```bash
yulong project business list --format json --json '{
  "currentPage": 1,
  "pageSize": 100,
  "depId": ["1894319070076387330"],
  "preSignDateBegin": "2025-12-01",
  "preSignDateEnd": "2025-12-31"
}'
```

### 场景 2：按区域查询

> 请帮我查西北区域的商机列表。

"西北区域" 是区域字典里的概念。

**Step 1**：查区域字典

```bash
yulong project crmField region --format json
```

在结果中搜索到：

```json
{ "name": "西北区域", "id": 111 }
```

**Step 2**：用 regionId 查列表

```bash
yulong project business list --format json --json '{
  "currentPage": 1,
  "pageSize": 100,
  "regionId": 111
}'
```

### 场景 3：按客户属地查询

> 请帮我查浙江省的商机列表。

**Step 1**：查客户属地字典

```bash
yulong project crmField province --format json
```

在树形结果中找到浙江省的 id（如 `330000`）。

**Step 2**：用 areaId 查列表

```bash
yulong project business list --format json --json '{
  "currentPage": 1,
  "pageSize": 100,
  "areaId": "330000"
}'
```

> 注意：前端 `AreaSelectorPm` 组件支持级联选择，最终传的是叶子节点 id；若用户只说"浙江省"，可先传省级 id 尝试，无结果再追问具体市/区。

### 场景 4：全量汇总

> 请帮我根据 2025 年全量的商机清单，汇总成一张表。

```bash
yulong project business list --format json --json '{
  "currentPage": 1,
  "pageSize": 100,
  "preSignDateBegin": "2025-01-01",
  "preSignDateEnd": "2025-12-31"
}'
```

若数据超过 100 条，需循环分页获取全部数据后再汇总。

### 场景 5：关键字搜索

> 查一下客户名称为"某某科技"的商机。

```bash
yulong project business list --format json --json '{
  "currentPage": 1,
  "pageSize": 20,
  "keyword": "某某科技"
}'
```

## 错误处理

- `permission_denied`：用户缺少 `week-field` 和 `business-list` 任一权限
- `400 body 数据格式不正确，无法完成序列化`：通常是 ID 字段类型错误，如 `depId` 应传数组、`regionId` 应传数字
- 返回空列表：检查筛选条件是否过严，或字典 ID 是否取错层级（如 areaId 取了父级而非叶子）
- 分页超过最大页码：减小 `currentPage` 或增大 `pageSize`

## 禁止事项

- 禁止将中文名称直接填入 `depId`/`regionId`/`areaId`/`productField`/`marketLeader` 等字段，必须先查字典
- 禁止在未确认区域/时间范围时构造查询
- 禁止单次拉取超过 100 条，大数据量必须分页
- 禁止混淆"部门/大区"与"区域"：用户说"XX 大区"通常想按部门筛选，但部门字典里的 `dname` 不一定就叫"XX 大区"，必须通过 `project crmField dept` 查询匹配；"XX 区域"才指区域字典
- 禁止在部门字典找不到匹配时，自动把"XX 大区"当作"XX 区域"处理，必须追问用户确认
