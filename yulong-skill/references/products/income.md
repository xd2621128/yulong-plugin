# 收入清单（Income）

收入清单模块包含两个列表：**拆分前收入清单** 和 **拆分后收入清单**。Agent 必须根据用户明确指定的页签选择对应命令；如果用户只说"收入清单"，必须追问确认。

| 页签 | CLI 命令 | 后端接口 | 说明 |
|------|---------|----------|------|
| 收入清单（拆分前） | `yulong project edaLabel beforeSplit` | `POST /project/edaLabel/beforeSplit` | 拆分前收入清单列表分页查询 |
| 收入清单（拆分后） | `yulong project edaLabel afterSplit` | `POST /project/edaLabel/afterSplit` | 拆分后收入清单列表分页查询 |

## 权限要求

- 本地权限预检：`["income-list"]`，满足**任意一个**即可
- 请求头：默认自动带上 `X-ResourceMark: income-list`
- 如用户无上述权限，CLI 会直接返回 `permission_denied`，不会调用后端

## 命令示例

```bash
# 拆分前
yulong project edaLabel beforeSplit --format json --json '{"currentPage":1,"pageSize":10}'

# 拆分后
yulong project edaLabel afterSplit --format json --json '{"currentPage":1,"pageSize":10}'
```

## 核心流程

当用户提到需要按部门、区域、客户属地、产品田、营销田、研发田等条件查询时，必须**先查字典接口拿到 ID，再调用列表接口**。

> **大区 vs 区域 严格区分**：
> - 用户说"XX 大区"通常是想按**部门**筛选（`depId`），但部门字典里的 `dname` 不一定就叫"XX 大区"，必须通过 `project crmField dept` 查询并在结果中匹配用户意图
> - "XX 区域"才指区域字典（`regionId`），应查 `project crmField region`
> - 如果 `dept` 字典中找不到能匹配用户说法的部门，必须向用户确认，禁止自动把"大区"当作"区域"处理

```
用户提示词
  ├─ 提到"收入清单"但未明确拆分前/后 → 必须追问用户确认
  ├─ 提到"拆分前收入清单" / "拆分前的收入" → project edaLabel beforeSplit
  ├─ 提到"拆分后收入清单" / "拆分后的收入" → project edaLabel afterSplit
  ├─ 提到部门/大区（如西北大区） → 调 project crmField dept 查 deptId
  │                                  实际部门名称不一定是"XX 大区"，需在结果中匹配用户意图
  │                                  查无结果时追问确认，禁止 fallback 到 region
  ├─ 提到区域（如西北区域） → 调 project crmField region 查 regionId
  ├─ 提到客户属地/省份城市 → 调 project crmField province 查 areaId
  ├─ 提到产品田 → 调 project crmField productField 查 productField id
  ├─ 提到营销田总监 → 调 project crmField marketField 查 majordomoId
  ├─ 提到研发田 → 调 project system pm-index listRDField 查 rdField id
  ├─ 提到 EDA 类型/账套类型 → 按 EDATYPE 枚举直接传值
  ├─ 提到收入类型 → 按 1-6 枚举直接传值
  ├─ 提到属性（增量/存量/本地/异地） → 按 -1/0/1/2/3 枚举直接传值
  ├─ 提到月份/年份/合同年份 → 直接构造时间范围参数
  └─ 其他字段（关键字等） → 直接构造收入清单参数
```

## 字典接口

以下接口已对认证用户开放（`match_mode: all`，`required_permissions: ["all"]`），Agent 可直接调用：

| 字典 | 命令 | 后端接口 | 说明 |
|------|------|----------|------|
| 部门/大区 | `yulong project crmField dept --format json` | `GET /project/crmField/dept` | 返回 `{dname, deptId}`，支持多选（`depId` 传数组） |
| 区域 | `yulong project crmField region --format json` | `GET /project/crmField/region` | 返回 `{name, id}`，`regionId` 传数字 id，`-1` 表示空 |
| 客户属地 | `yulong project crmField province --format json` | `GET /project/crmField/province` | 返回省市区树；树节点字段为 `value`（地区名称）和 `id`，`areaId` 传叶子节点 id，`-1` 表示空 |
| 产品田 | `yulong project crmField productField --format json` | `GET /project/crmField/productField` | 返回 `{id, name, children}`，`productField` 传叶子 id 数组，`-1` 表示空 |
| 营销田总监 | `yulong project crmField marketField --format json` | `GET /project/crmField/marketField` | 返回 `{name, majordomo, majordomoId}`，`marketLeader` 传 `majordomoId`，`-1` 表示空 |
| 研发田 | `yulong project system pm-index listRDField --format json` | `POST /project/system/pm-index/listRDField` | 返回 `{name, id}`，`rdField` 传 id 数组，`-1` 表示空 |

> 字典查询结果可能很长，可在命令后加 `--fields` 筛选，或先用 `grep`/`jq` 在本地过滤。

## 常用参数

| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `currentPage` | number | 页码，从 1 开始 | `1` |
| `pageSize` | number | 每页条数，建议不超过 100 | `10` |
| `keyword` | string | 关键字查询（项目编号/名称/合同编号/商机编码/客户名等） | `"某项目"` |
| `depId` | string[] | **部门 ID 集合**，需先查字典 | `["1894319070076387330"]` |
| `regionId` | number | **区域 ID**（`-1` 表示空），需先查字典 | `111` |
| `areaId` | string | **客户属地叶子节点 ID**，多个以英文逗号拼接（`-1` 表示空），需先查字典 | `"330402"` |
| `productField` | number[] | **产品田叶子 ID 集合**（`-1` 表示空），需先查字典 | `[9589]` |
| `rdField` | number[] | **研发田 ID 集合**（`-1` 表示空），需先查字典 | `[3]` |
| `marketLeader` | string | **营销田总监 ID（majordomoId）**（`-1` 表示空），需先查字典 | `"12814896"` |
| `incomeTimeBegin` | string | 收入月份开始；后端按日期/日期时间解析，CLI 建议传 `YYYY-MM-DD` | `"2025-12-01"` |
| `incomeTimeEnd` | string | 收入月份结束；后端按日期/日期时间解析，CLI 建议传 `YYYY-MM-DD` | `"2025-12-31"` |
| `incomeType` | number | 收入类型（前端枚举，直接传值）：1-代收代付 2-内部其他 3-内部主营 4-弱电施工 5-外部其他 6-外部主营 | `3` |
| `edaType` | number[] | EDA 类型（前端 dict store）：1-信产账套 2-数智账套 3-天翼账套 4-无线账套 5-云技术账套 6-原子能力账套 7-合作分成 8-优化项目 | `[1, 2]` |
| `contractYear` | number | 合同年份（YYYY） | `2025` |
| `state` | number[] | 属性（前端枚举，直接传值）：`-1`-空 `0`-增量本地 `1`-增量异地 `2`-存量本地 `3`-存量异地 | `[0, 1]` |
| `sortField` | string | 排序字段 | `"incomeTime"` |
| `sort` | boolean | 排序方向：`true` 升序，`false` 降序 | `false` |

> 完整字段和类型以 `yulong project edaLabel beforeSplit --help` / `yulong project edaLabel afterSplit --help` 和实际响应为准。

## 字段来源说明

以下字段**不需要**先调字典接口，直接按上表传值即可：

| 参数 | 来源 | 说明 |
|------|------|------|
| `incomeType` | 前端硬编码 | 1-代收代付 2-内部其他 3-内部主营 4-弱电施工 5-外部其他 6-外部主营 |
| `edaType` | 前端 dict store | 1-信产账套 2-数智账套 3-天翼账套 4-无线账套 5-云技术账套 6-原子能力账套 7-合作分成 8-优化项目 |
| `state` | 前端硬编码 | `-1`-空 `0`-增量本地 `1`-增量异地 `2`-存量本地 `3`-存量异地 |

其余 `depId`/`regionId`/`areaId`/`productField`/`rdField`/`marketLeader` 等字段**必须**先查对应字典接口。

## 易错提示

1. **拆分前 vs 拆分后必须明确**：用户说"收入清单"时，不能直接默认使用其中一个命令，必须追问"您指的是拆分前收入清单还是拆分后收入清单？"
2. **月份字段是 `incomeTimeBegin/End`**：前端月份选择器只选到月，但实际向后端传的是完整日期时间（如 `2025-12-01T00:00:00+08:00`）；后端接口按日期/日期时间解析，因此 CLI 直接传 `YYYY-MM-DD`（如 `"2025-12-01"`）即可，不要只传 `"2025-12"`。
3. **`contractYear` 是合同年份**：前端用的是年份选择器，传数字如 `2025`
4. **`incomeYear` 与 `contractYear` 不同**：
   - 拆分前/后列表搜索表单中使用的是 `contractYear`（合同年份）
   - `incomeYear` 仅在路由跳转或收入数据核对页使用，不在拆分前/后列表搜索中
5. **`-1` 表示空**：`regionId`、`areaId`、`productField`、`rdField`、`marketLeader` 都可以传 `-1` 表示"空"，和合同/商机列表一致
6. **`edaType` 和 `state` 是数组**：`edaType` 和 `state` 都支持多选，传数组
7. **`incomeType` 是单选**：搜索表单中是单选下拉，传数字

## 意图映射

| 用户说法 | 对应命令 | 说明 |
|----------|----------|------|
| "拆分前收入清单" / "拆分前的收入清单" / "拆分前收入" | `yulong project edaLabel beforeSplit` | 明确指定拆分前 |
| "拆分后收入清单" / "拆分后的收入清单" / "拆分后收入" | `yulong project edaLabel afterSplit` | 明确指定拆分后 |
| "XX 大区的拆分前收入清单" | 先 `project crmField dept`，再 `project edaLabel beforeSplit` | 用户说"XX 大区"通常想按部门筛选，但实际部门名称不一定是"XX 大区"；必须在 dept 字典中匹配，找不到时追问用户 |
| "XX 大区的拆分后收入清单" | 先 `project crmField dept`，再 `project edaLabel afterSplit` | 用户说"XX 大区"通常想按部门筛选，但实际部门名称不一定是"XX 大区"；必须在 dept 字典中匹配，找不到时追问用户 |
| "XX 区域的拆分前收入清单" | 先 `project crmField region`，再 `project edaLabel beforeSplit` | 区域是 region |
| "XX 区域的拆分后收入清单" | 先 `project crmField region`，再 `project edaLabel afterSplit` | 区域是 region |
| "按时间查收入清单" / "XX 年 XX 月的收入清单" | `project edaLabel beforeSplit/afterSplit` + `incomeTimeBegin/End` | 按收入月份筛选，时间格式为 `YYYY-MM-DD` |
| "收入清单"（未明确拆分前/后） | — | **必须追问用户确认** |

## 典型场景

### 场景 1：按部门（大区）和收入月份查询拆分前收入清单

> 请帮我导出西北大区 2025 年 12 月的拆分前收入清单。

"西北大区" 是用户口语中的部门说法；实际部门字典中的名称可能是"西北大区营销中心"等，也可能不是"XX 大区"命名，需通过 `project crmField dept` 查询匹配。它对应 **部门**（`depId`），不是区域。

**Step 1**：查部门字典

```bash
yulong project crmField dept --format json
```

在结果中搜索到：

```json
{ "dname": "西北大区营销中心", "deptId": "1894319070076387330" }
```

**Step 2**：用 deptId 查拆分前收入清单

```bash
yulong project edaLabel beforeSplit --format json --json '{
  "currentPage": 1,
  "pageSize": 100,
  "depId": ["1894319070076387330"],
  "incomeTimeBegin": "2025-12-01",
  "incomeTimeEnd": "2025-12-31"
}'
```

### 场景 2：按区域查询拆分后收入清单

> 请帮我查西北区域的拆分后收入清单。

"西北区域" 是区域字典里的概念。

**Step 1**：查区域字典

```bash
yulong project crmField region --format json
```

在结果中搜索到：

```json
{ "name": "西北区域", "id": 111 }
```

**Step 2**：用 regionId 查拆分后收入清单

```bash
yulong project edaLabel afterSplit --format json --json '{
  "currentPage": 1,
  "pageSize": 100,
  "regionId": 111
}'
```

### 场景 3：用户只说"收入清单"

> 请帮我导出 2025 年 12 月的收入清单。

用户没有明确是拆分前还是拆分后，Agent 必须追问：

> "您指的是拆分前收入清单还是拆分后收入清单？"

得到明确答复后再执行对应命令。

## 错误处理

- `permission_denied`：用户缺少 `income-list` 权限
- `400 body 数据格式不正确，无法完成序列化`：通常是 ID 字段类型错误，如 `depId` 应传数组、`regionId` 应传数字、`edaType`/`state` 应传数组
- 返回空列表：检查筛选条件是否过严，或字典 ID 是否取错层级
- 分页超过最大页码：减小 `currentPage` 或增大 `pageSize`

## 禁止事项

- 禁止将中文名称直接填入 `depId`/`regionId`/`areaId`/`productField`/`marketLeader`/`rdField` 等字段，必须先查字典
- 禁止在未明确"拆分前"还是"拆分后"时构造查询
- 禁止在未确认区域/时间范围时构造查询
- 禁止单次拉取超过 100 条，大数据量必须分页
- 禁止混淆"部门/大区"与"区域"：用户说"XX 大区"通常想按部门筛选，但部门字典里的 `dname` 不一定就叫"XX 大区"，必须通过 `project crmField dept` 查询匹配；"XX 区域"才指区域字典
- 禁止在部门字典找不到匹配时，自动把"XX 大区"当作"XX 区域"处理，必须追问用户确认
