# 合同/签约清单（Contract）

`project.origin-contract.forward.list` 是 Agent 应使用的 CLI 命令，内部映射到后端接口 `POST /project/origin-contract/forward/list`，用于查询**合同清单**（也称为"签约清单"）。Agent 禁止直接调用该后端接口。

## 权限要求

- 本地权限预检：`["preceding-contract"]`，**任一满足即可**
- 请求头：默认自动带上 `X-ResourceMark: preceding-contract`
- 如用户无上述权限，CLI 会直接返回 `permission_denied`，不会调用后端

## 命令

```bash
yulong project origin-contract forward list --json '{"currentPage":1,"pageSize":10}' --format json
```

## 核心流程

当用户提到需要按部门、区域、客户属地、产品田、营销田、研发田等条件查询时，必须**先查字典接口拿到 ID，再调用列表接口**。

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
  ├─ 提到研发田 → 调 project system pm-index listRDField 查 rdField id
  └─ 其他字段（时间、关键字、状态等） → 直接构造 contract list 参数
```

## 字典接口

以下接口已对认证用户开放（`match_mode: all`，`required_permissions: ["all"]`），Agent 可直接调用：

| 字典 | 命令 | 后端接口 | 说明 |
|------|------|----------|------|
| 部门/大区 | `yulong project crmField dept --format json` | `GET /project/crmField/dept` | 返回 `{dname, deptId}`，支持多选（`depId` 传数组） |
| 区域 | `yulong project crmField region --format json` | `GET /project/crmField/region` | 返回 `{name, id}`，`regionId` 传数字 id |
| 客户属地 | `yulong project crmField province --format json` | `GET /project/crmField/province` | 返回省市区树；树节点字段为 `value`（地区名称）和 `id`，`areaId` 传逗号分隔的叶子 id（如 `"330000,330400,330402"`） |
| 产品田 | `yulong project crmField productField --format json` | `GET /project/crmField/productField` | 返回 `{id, name, children}`，`productField` 传叶子 id 数组 |
| 营销田总监 | `yulong project crmField marketField --format json` | `GET /project/crmField/marketField` | 返回 `{name, majordomo, majordomoId}`，`marketLeader` 传 `majordomoId` |
| 研发田 | `yulong project system pm-index listRDField --format json` | `POST /project/system/pm-index/listRDField` | 返回 `{name, id}`，`rdField` 传 id 数组 |

> 字典查询结果可能很长，可在命令后加 `--fields` 筛选，或先用 `grep`/`jq` 在本地过滤。

## 常用参数

| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `currentPage` | number | 页码，从 1 开始 | `1` |
| `pageSize` | number | 每页条数，建议不超过 100 | `10` |
| `keyword` | string | 关键字查询 | `"某项目"` |
| `depId` | string[] | **部门 ID 集合**，需先查字典 | `["1894319070076387330"]` |
| `regionId` | number | **区域 ID**，需先查字典 | `111` |
| `areaId` | string | **客户属地叶子节点 ID**，多个以英文逗号拼接，需先查字典 | `"330402"` |
| `productField` | number[] | **产品田叶子 ID 集合**，需先查字典 | `[9589]` |
| `rdField` | number[] | **研发田 ID 集合**，需先查字典 | `[3]` |
| `marketLeader` | string | **营销田总监 ID（majordomoId）**，需先查字典 | `"12814896"` |
| `archiveTimeBegin` | string | 归档时间开始（YYYY-MM-DD） | `"2025-12-01"` |
| `archiveTimeEnd` | string | 归档时间结束（YYYY-MM-DD） | `"2025-12-31"` |
| `signType` | number | 签约类型（前端枚举，直接传值）：0-合同 1-框架 2-数智 3-天翼 4-PO订单 5-SM项目 6-原子能力 | `0` |
| `dataType` | number | 类别（前端枚举，直接传值）：1-信产 2-天翼 3-数智 4-无线 5-信产分公司 6-SM 7-无合同立项 8-原子能力 9-PO订单 | `1` |
| `isSplit` | number | 拆分状态（前端枚举，直接传值）：0-未拆分 1-已拆分 | `0` |
| `sortField` | string | 排序字段 | `"draftDate"` |
| `sort` | boolean | 排序方向：`true` 升序，`false` 降序 | `false` |

> 完整字段和类型以 `yulong project origin-contract forward list --help` 和实际响应为准。

## 字段来源说明

以下字段**不需要**先调字典接口，直接按上表传值即可：

| 参数 | 来源 | 说明 |
|------|------|------|
| `signType` | 前端枚举 | 0-合同 1-框架 2-数智 3-天翼 4-PO订单 5-SM项目 6-原子能力 |
| `dataType` | 前端 dict store | 1-信产 2-天翼 3-数智 4-无线 5-信产分公司 6-SM 7-无合同立项 8-原子能力 9-PO订单 |
| `isSplit` | 前端硬编码 | 0-未拆分 1-已拆分 |

其余 `depId`/`regionId`/`areaId`/`productField`/`rdField`/`marketLeader` 等字段**必须**先查对应字典接口。

## 意图映射

| 用户说法 | 对应命令 | 说明 |
|----------|----------|------|
| "合同清单" / "签约清单" / "查合同" / "列出合同" | `yulong project origin-contract forward list` | 两个说法指向同一个命令 |
| "XX 大区的合同清单" / "XX 大区的签约清单" | 先 `project crmField dept`，再 `project origin-contract forward list` | 用户说"XX 大区"通常想按部门筛选，但实际部门名称不一定是"XX 大区"；必须在 dept 字典中匹配，找不到时追问用户 |
| "XX 区域的合同清单" / "XX 区域的签约清单" | 先 `project crmField region`，再 `project origin-contract forward list` | 区域是 region |
| "XX 省的合同清单" / "XX 省的签约清单" | 先 `project crmField province`，再 `project origin-contract forward list` | 客户属地是 areaId |
| "按产品田查合同" / "按产品田查签约清单" | 先 `project crmField productField`，再 `project origin-contract forward list` | productField |
| "按营销田总监查合同" / "按营销田总监查签约清单" | 先 `project crmField marketField`，再 `project origin-contract forward list` | marketLeader |
| "按研发田查合同" / "按研发田查签约清单" | 先 `project system pm-index listRDField`，再 `project origin-contract forward list` | rdField |
| "按时间查合同" / "25 年的合同清单" / "25 年的签约清单" | `project origin-contract forward list` + 归档时间范围 | 按 archiveTime 筛选 |

## 典型场景

### 场景 1：按部门（大区）和归档时间查询

> 请帮我导出西北大区 25 年 12 月的签约清单。
> 请帮我导出西北大区 25 年 12 月的合同清单。

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
yulong project origin-contract forward list --format json --json '{
  "currentPage": 1,
  "pageSize": 100,
  "depId": ["1894319070076387330"],
  "archiveTimeBegin": "2025-12-01",
  "archiveTimeEnd": "2025-12-31"
}'
```

### 场景 2：按区域查询

> 请帮我查西北区域的合同清单。

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
yulong project origin-contract forward list --format json --json '{
  "currentPage": 1,
  "pageSize": 100,
  "regionId": 111
}'
```

### 场景 3：全量汇总

> 请帮我根据 2025 年全量的签约清单，汇总成一张表。

```bash
yulong project origin-contract forward list --format json --json '{
  "currentPage": 1,
  "pageSize": 100,
  "archiveTimeBegin": "2025-01-01",
  "archiveTimeEnd": "2025-12-31"
}'
```

若数据超过 100 条，需循环分页获取全部数据后再汇总。

## 错误处理

- `permission_denied`：用户缺少 `preceding-contract` 权限
- `400 body 数据格式不正确，无法完成序列化`：通常是 ID 字段类型错误，如 `depId` 应传数组、`regionId` 应传数字
- 返回空列表：检查筛选条件是否过严，或字典 ID 是否取错层级
- 分页超过最大页码：减小 `currentPage` 或增大 `pageSize`

## 禁止事项

- 禁止将中文名称直接填入 `depId`/`regionId`/`areaId`/`productField`/`marketLeader`/`rdField` 等字段，必须先查字典
- 禁止在未确认区域/时间范围时构造查询
- 禁止单次拉取超过 100 条，大数据量必须分页
- 禁止混淆"部门/大区"与"区域"：用户说"XX 大区"通常想按部门筛选，但部门字典里的 `dname` 不一定就叫"XX 大区"，必须通过 `project crmField dept` 查询匹配；"XX 区域"才指区域字典
- 禁止在部门字典找不到匹配时，自动把"XX 大区"当作"XX 区域"处理，必须追问用户确认
