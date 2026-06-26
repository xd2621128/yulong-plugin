# 合作伙伴列表（Partner）

合作伙伴模块包含两个页签：**生态合作伙伴** 和 **SP/SI合作伙伴**。两个页签共用同一个 CLI 命令 `yulong project partner page`，内部映射到后端接口 `POST /project/partner/page`，唯一区别是请求体中的 `type` 字段。

| 页签 | `type` 值 | CLI 命令 |
|------|----------|---------|
| 生态合作伙伴 | `1` | `yulong project partner page` |
| SP/SI合作伙伴 | `2` | `yulong project partner page` |

## 权限要求

- 本地权限预检：`["partner-set-list", "performance_assessment_system"]`，满足**任意一个**即可
- 请求头：默认自动带上 `X-ResourceMark: partner-set-list`
- 如用户无上述任一权限，CLI 会直接返回 `permission_denied`，不会调用后端

## 命令示例

```bash
# 生态合作伙伴
yulong project partner page --format json --json '{"currentPage":1,"pageSize":10,"type":1}'

# SP/SI合作伙伴
yulong project partner page --format json --json '{"currentPage":1,"pageSize":10,"type":2}'

# 按引入时间范围查询
yulong project partner page --format json --json '{
  "currentPage": 1,
  "pageSize": 100,
  "type": 1,
  "introduceTimeBegin": "2026-01",
  "introduceTimeEnd": "2026-03"
}'
```

## 核心流程

```
用户提示词
  ├─ 提到"生态合作伙伴" → project partner page + type=1
  ├─ 提到"SP/SI合作伙伴" / "SP/SI" → project partner page + type=2
  ├─ 提到"合作伙伴"但未明确类型 → 必须追问用户确认是生态还是 SP/SI
  ├─ 提到部门/大区（如西北大区） → 调 project crmField dept 查 deptId
  │                                  实际部门名称不一定是"XX 大区"，需在结果中匹配用户意图
  │                                  查无结果时追问确认
  ├─ 提到引入时间/年份/月份 → 直接构造 introduceTimeBegin/End
  ├─ 提到统计变动/新增/退出 → 按下方「统计与变动分析」处理
  └─ 其他字段（关键字等） → 直接构造 partner page 参数
```

## 字典接口

以下接口已对认证用户开放（`match_mode: all`，`required_permissions: ["all"]`），Agent 可直接调用：

| 字典 | 命令 | 后端接口 | 说明 |
|------|------|----------|------|
| 部门/大区 | `yulong project crmField dept --format json` | `GET /project/crmField/dept` | 返回 `{dname, deptId}`，支持多选（`deptId` 传数组） |

> 字典查询结果可能很长，可在命令后加 `--fields` 筛选，或先用 `grep`/`jq` 在本地过滤。

## 常用参数

| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `currentPage` | number | 页码，从 1 开始 | `1` |
| `pageSize` | number | 每页条数，建议不超过 100 | `10` |
| `keyword` | string | 关键字查询（合作伙伴名称） | `"某科技"` |
| `type` | number | **合作伙伴类型**：`1`-生态合作伙伴 `2`-SP/SI合作伙伴 | `1` |
| `deptId` | string[] | **引入部门 ID 集合**，需先查字典 | `["1894319070076387330"]` |
| `introduceTimeBegin` | string | 引入时间开始（YYYY-MM） | `"2026-01"` |
| `introduceTimeEnd` | string | 引入时间结束（YYYY-MM） | `"2026-03"` |
| `sortField` | string | 排序字段：`introduceTime` / `quitTime` | `"introduceTime"` |
| `sort` | boolean | 排序方向：`true` 升序，`false` 降序 | `false` |
| `doSearchTotal` | boolean | 是否查询总数（可选） | `true` |

> 完整字段和类型以 `yulong project partner page --help` 和实际响应为准。

## 响应字段说明

```typescript
{
  id?: number;              // 主键 id
  partnerName?: string;     // 合作伙伴名称
  deptId?: string;          // 引入部门 id
  deptName?: string;        // 引入部门名称
  introduceTime?: string;   // 引入时间（yyyy-MM）
  relatedBusiness?: string; // 引入业务（仅 SP/SI 页签展示）
  quitTime?: string;        // 退出时间（yyyy-MM，仅生态合作伙伴页签展示，可能为空）
  status?: string;          // 存续状态（仅生态合作伙伴页签展示，后端字符串，无前端枚举）
  isIntegrate?: number;     // 是否集成类：1-是 0-否
  isWeakWork?: number;      // 是否弱电类：1-是 0-否
  isCustomDevelop?: number; // 是否定制开发类：1-是 0-否
  isDeliverOperation?: number; // 是否交付运维类：1-是 0-否
  email?: string;           // 合作伙伴邮箱（仅生态合作伙伴页签展示）
}
```

## 页签与字段可见性

- **生态合作伙伴（`type=1`）**表格字段：合作伙伴名称、引入部门、引入时间、退出时间、存续状态、集成类、弱电类、定制开发类、交付运维类、合作伙伴邮箱
- **SP/SI合作伙伴（`type=2`）**表格字段：合作伙伴名称、引入部门、引入时间、引入业务

> 页签只影响前端表格展示；后端接口返回全部字段，Agent 无需根据页签过滤字段。

## 统计与变动分析

用户可能要求统计某个时间范围内的合作伙伴变动，例如：

> 请帮我统计 26 年 1 季度合作伙伴有哪些变动。

### 处理原则

1. **先确认页签**："合作伙伴"未明确类型时，必须追问是生态合作伙伴还是 SP/SI 合作伙伴。
2. **再确认时间范围**：例如"2026 年 1 季度"对应 `introduceTimeBegin=2026-01`、`introduceTimeEnd=2026-03`。
3. **明确统计口径**：向用户说明 API 能力限制：
   - **新增合作伙伴**：可以直接按 `introduceTimeBegin/End` 查询该时间段内引入的合作伙伴。
   - **退出合作伙伴**：后端接口**没有** `quitTime` 筛选参数，Agent 必须拉取较大范围的数据（如全年或全部），然后在本地按 `quitTime` 过滤；也可以同时参考 `status` 字段的实际取值（如观察到 `"已退出"`）。
   - **存续状态**：`status` 是后端返回的字符串，前端没有枚举映射，Agent **必须从返回数据中观察实际取值**，禁止猜测。

### 推荐执行步骤

**Step 1**：确认页签和时间范围

> "您想统计生态合作伙伴还是 SP/SI 合作伙伴？时间范围是 2026 年 1 季度（2026-01 至 2026-03）吗？"

**Step 2**：查询该季度内新增的合作伙伴

```bash
yulong project partner page --format json --json '{
  "currentPage": 1,
  "pageSize": 100,
  "type": 1,
  "introduceTimeBegin": "2026-01",
  "introduceTimeEnd": "2026-03"
}'
```

从响应中读取 `data.total` 得到新增数量，读取 `data.records` 得到新增列表。

**Step 3**：查询退出的合作伙伴

由于接口不支持按 `quitTime` 过滤，需扩大时间范围（如全年或全部）拉取数据，再在本地筛选 `quitTime` 落在 2026-01 至 2026-03 的记录：

```bash
yulong project partner page --format json --json '{
  "currentPage": 1,
  "pageSize": 100,
  "type": 1
}'
```

> 如果总数超过 100，需要循环分页获取全部数据后再做本地过滤。

**Step 4**：向用户报告

示例：

> 2026 年 1 季度生态合作伙伴变动统计：
> - 新增合作伙伴：X 家（列表...）
> - 退出合作伙伴：Y 家（列表...）
> - 注：退出数据通过本地过滤 `quitTime` 得到；`status` 字段后端返回值为"..."（请按实际观察值填写）。

### 注意事项

- **禁止猜测 `status` 枚举值**：`status` 是后端返回的字符串，前端没有枚举映射。Agent 必须从返回数据中观察实际取值。
  - 实际环境中已观察到的取值示例：`"在库"`、`"已退出"`。
  - 不同环境/不同时间可能新增其他取值，Agent 不得以这两个值作为唯一判断标准。
- **禁止直接按中文名称查询 `deptId`**：必须先调 `project crmField dept`。
- **大数据量必须分页**：单次 `pageSize` 不超过 100。

## 意图映射

| 用户说法 | 对应命令 | 说明 |
|----------|----------|------|
| "生态合作伙伴" / "查生态合作伙伴" | `yulong project partner page` + `type=1` | 明确指定生态页签 |
| "SP/SI合作伙伴" / "SP/SI" / "查 SP/SI" | `yulong project partner page` + `type=2` | 明确指定 SP/SI 页签 |
| "合作伙伴列表" / "查合作伙伴" / "列出合作伙伴" | `yulong project partner page` | 通常需要追问页签 |
| "XX 大区的合作伙伴" | 先 `project crmField dept`，再 `project partner page` | 用户说"XX 大区"通常想按部门筛选，但实际部门名称不一定是"XX 大区" |
| "按时间查合作伙伴" / "XX 年引入的合作伙伴" | `project partner page` + `introduceTimeBegin/End` | 按引入时间筛选 |
| "合作伙伴变动" / "新增/退出合作伙伴统计" | `project partner page` + 时间范围 + 本地分析 | 按「统计与变动分析」处理 |
| "合作伙伴"（未明确生态/SP/SI） | — | **必须追问用户确认是生态合作伙伴还是 SP/SI 合作伙伴** |

## 边界条件与注意事项

### `type` 字段必须明确且为数字

- `type=1` → 生态合作伙伴
- `type=2` → SP/SI合作伙伴
- **缺少 `type`**：后端会返回所有类型的合作伙伴合计（实际测试约 399 条），这与前端两个 tab 分别展示的逻辑不符，Agent 必须始终显式传入 `type`。
- **`type` 传字符串（如 `"1"`）或无效值（如 `99`）**：后端可能当作未筛选或匹配不到，返回全部或空结果。`type` 必须传数字。

### `deptId` 类型必须为数组

`deptId` 必须是 `string[]`。如果传单个字符串，会返回：

```
[400] body数据格式不正确，无法完成序列化
```

### 时间格式

`introduceTimeBegin/End` 必须是 `YYYY-MM` 格式。测试发现：

- 正确格式（如 `"2026-01"`）正常筛选
- 错误格式（如 `"2026/01"`）不会报错，但会返回空结果（total=0）

### 分页

- `currentPage` 超出实际页数时，`ok=true`，`records=[]`，不会报错
- `pageSize` 后端最大支持到 200，但 Skill 规范要求**单次不超过 100**，大数据量必须分页

### SP/SI 页签的特殊性

- SP/SI 记录通常没有 `quitTime` 和 `status` 字段（实测为 `null`）
- 因此"退出统计"主要适用于**生态合作伙伴**页签
- 如果用户要求统计 SP/SI 的变动，Agent 应说明该页签数据主要以 `relatedBusiness` 为维度，退出状态字段通常为空

### 关键字查询

`keyword` 支持合作伙伴名称模糊查询。无匹配时 `total=0`，不会报错。

## 典型场景

### 场景 1：按部门和引入时间查询生态合作伙伴

> 请帮我查西北大区 2026 年 1 季度引入的生态合作伙伴。

**Step 1**：查部门字典

```bash
yulong project crmField dept --format json
```

在结果中匹配到类似：

```json
{ "dname": "西北大区营销中心", "deptId": "1894319070076387330" }
```

**Step 2**：查询列表

```bash
yulong project partner page --format json --json '{
  "currentPage": 1,
  "pageSize": 100,
  "type": 1,
  "deptId": ["1894319070076387330"],
  "introduceTimeBegin": "2026-01",
  "introduceTimeEnd": "2026-03"
}'
```

### 场景 2：统计某季度合作伙伴变动

> 请帮我统计 2026 年 1 季度生态合作伙伴有哪些变动。

**Step 1**：查询该季度新增

```bash
yulong project partner page --format json --json '{
  "currentPage": 1,
  "pageSize": 100,
  "type": 1,
  "introduceTimeBegin": "2026-01",
  "introduceTimeEnd": "2026-03"
}'
```

**Step 2**：拉取较全数据并本地过滤退出

```bash
yulong project partner page --format json --json '{
  "currentPage": 1,
  "pageSize": 100,
  "type": 1
}'
```

在返回的 records 中筛选 `quitTime` 落在 `2026-01` 至 `2026-03` 的记录。

**Step 3**：汇总报告

> 2026 年 1 季度生态合作伙伴变动：新增 X 家，退出 Y 家（退出数据通过本地过滤 quitTime 得到）。

## 错误处理

- `permission_denied`：用户缺少 `partner-set-list` 和 `performance_assessment_system` 任一权限
- `400 body 数据格式不正确，无法完成序列化`：通常是 `deptId` 应传数组、`type` 应传数字
- 返回空列表：检查 `type` 是否传错，或筛选条件是否过严
- 分页超过最大页码：减小 `currentPage` 或增大 `pageSize`

## 禁止事项

- 禁止将中文部门名称直接填入 `deptId`，必须先查 `project crmField dept`
- 禁止在页签未明确时构造查询
- 禁止猜测 `status` 字段的枚举值，必须从实际响应中观察
- 禁止单次拉取超过 100 条，大数据量必须分页
- 禁止混淆"部门/大区"与"区域"：用户说"XX 大区"通常想按部门筛选，但部门字典里的 `dname` 不一定就叫"XX 大区"，必须查询匹配
