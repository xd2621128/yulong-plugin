# 岗位管理命令参考

岗位管理（前端页面 `/post-management`）维护公司的三级岗位体系：**岗位类别（type=1）→ 岗位序列（type=2）→ 岗位（type=3）**。提供岗位树查询、层级下拉、详情、绑定人数查询，以及新增、编辑、删除、导出。

> 新增/修改/删除为**危险操作**（`is_dangerous=1`），必须执行三步确认（展示摘要 → 用户确认 → 加 `--yes`）。导出不是危险操作。

## 命令总览

| 命令 | 方法 | 路径 | 说明 | 危险 |
|------|------|------|------|------|
| `yulong hr post getPostTree` | POST | `/hr/post/getPostTree` | 获取岗位树（类别→序列→岗位） | |
| `yulong hr post getPostByType` | POST | `/hr/post/getPostByType` | 按层级拉取类别/序列/岗位列表 | |
| `yulong hr post getDetail` | POST | `/hr/post/getDetail` | 获取岗位节点详情 | |
| `yulong hr post getPostUserNum` | POST | `/hr/post/getPostUserNum` | 获取节点绑定的在职人数（删除前必查） | |
| `yulong hr post addPost` | POST | `/hr/post/addPost` | 新增类别/序列/岗位 | ✔ |
| `yulong hr post updatePost` | POST | `/hr/post/updatePost` | 编辑名称/职责描述 | ✔ |
| `yulong hr post removePost` | POST | `/hr/post/removePost` | 删除岗位节点 | ✔ |
| `yulong hr post exportPost` | POST | `/hr/post/exportPost` | 导出岗位 Excel | |

## 权限要求

| 命令 | required_permissions | 说明 |
|------|----------------------|------|
| `hr.post.getPostTree` / `getDetail` / `getPostUserNum` | `["post"]` 任一 | 读权限 |
| `hr.post.getPostByType` | `["post","onboarding"]` 任一 | 跨模块共享字典接口（入职管理也用） |
| `hr.post.addPost` | `["post","post_add"]` 全部 | 写权限 |
| `hr.post.updatePost` | `["post","post_edit"]` 全部 | 写权限 |
| `hr.post.removePost` | `["post","post_delete"]` 全部 | 写权限 |
| `hr.post.exportPost` | `["post","post_export"]` 全部 | |

## 查询

### 岗位树

```bash
# 全量岗位树（页面加载时的默认行为）
yulong hr post getPostTree --json '{}' --format json

# 按名称搜索（类别/序列/岗位均可命中，返回带上下文的子树）
yulong hr post getPostTree --json '{"name":"管理"}' --format json
```

返回节点关键字段：`positionId`（节点 id，后续所有操作的入口）、`type`（1-类别 2-序列 3-岗位）、`postName`、`remarks`、`children`（下级数组）。

### 按层级拉取列表（级联）

与前端弹窗的级联下拉一致，逐级获取：

```bash
# 1. 岗位类别列表（新增/编辑时先拉这个）
yulong hr post getPostByType --json '{"type":"1"}' --format json

# 2. 某类别下的序列列表（typeId 必填）
yulong hr post getPostByType --json '{"type":"2","typeId":9439814}' --format json

# 3. 某序列下的岗位列表（typeId + sequenceId 必填）
yulong hr post getPostByType --json '{"type":"3","typeId":9439814,"sequenceId":9439815}' --format json

# 附加名称过滤
yulong hr post getPostByType --json '{"type":"1","name":"研发"}' --format json
```

返回字段：`id`、`type`、`postTypeId`/`postTypeName`（类别）、`postSequenceId`/`postSequenceName`（序列）、`postId`/`postName`（岗位）。

### 节点详情

```bash
yulong hr post getDetail --json '{"positionId":9439814}' --format json
```

返回 `postName` / `remarks` / `type` / `typeId` / `sequenceId`。**编辑前必须先查回显**；注意返回不含 `positionId`，提交编辑时沿用查询时的 id。

### 绑定人数（删除前置检查）

```bash
yulong hr post getPostUserNum --json '{"positionId":9439814}' --format json
```

返回整数（在职绑定人数）。**删除任何节点前必查**：大于 0 表示该类别/序列/岗位下仍有在职人员，前端此时直接禁止删除，CLI 也必须停止并告知用户"请先完成人员转移"。

## 写操作（需要 --yes；导出除外）

### 新增（类别/序列/岗位同一个接口）

```bash
# 新增岗位类别（type=1，不需要上级）
yulong hr post addPost --yes --format json --json '{"postName":"新类别","type":"1","remarks":"职责描述"}'

# 新增岗位序列（type=2，挂到类别下）
yulong hr post addPost --yes --format json --json '{"postName":"新序列","type":"2","typeId":9439814,"remarks":"职责描述"}'

# 新增岗位（type=3，挂到序列下，typeId 与 sequenceId 都要）
yulong hr post addPost --yes --format json --json '{"postName":"新岗位","type":"3","typeId":9439814,"sequenceId":9439815,"remarks":"职责描述"}'
```

参数：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `postName` | string | 是 | 名称，最长 30 字（与前端表单一致） |
| `type` | string | 是 | `1`-类别 `2`-序列 `3`-岗位 |
| `typeId` | number | type=2/3 时必填 | 所属类别 id，从 `getPostByType type=1` 或 `getPostTree` 获取 |
| `sequenceId` | number | type=3 时必填 | 所属序列 id，从 `getPostByType type=2` 或 `getPostTree` 获取 |
| `remarks` | string | 否 | 职责描述，最长 200 字 |

- 返回 `data: true`，**不回传新节点 id**，需用 `getPostTree` + `name` 反查确认。
- 新增序列/岗位时的 `typeId`/`sequenceId` 就是前端"新增下级"弹窗中自动带入的父级 id，禁止编造。

### 编辑

```bash
yulong hr post updatePost --yes --format json --json '{"positionId":18198286,"postName":"新名称","remarks":"新描述"}'
```

- 只支持修改 `postName` 和 `remarks`；**层级（typeId/sequenceId）不可改**（前端编辑弹窗中归属下拉为禁用态）。
- 编辑前先 `getDetail` 回显，未要修改的字段按详情原样带上，避免清空。

### 删除

标准流程（先查人数，先子后父）：

```bash
# 1. 查绑定人数，返回 0 才可删
yulong hr post getPostUserNum --json '{"positionId":18198286}' --format json

# 2. 删除
yulong hr post removePost --yes --json '{"positionId":18198286}' --format json
```

> **注意：`getPostUserNum` 只校验在职人数，不校验下级节点。** 删除类别/序列前必须先用 `getPostTree` 确认其 `children` 为空；若有下级，先逐个删除下级，再删父级。人数大于 0 时禁止删除，告知用户先转移人员。

### 导出岗位 Excel

```bash
# 全量导出
yulong hr post exportPost --json '{}' --format json

# 带名称筛选导出（与 getPostTree 参数一致）
yulong hr post exportPost --json '{"name":"管理"}' --format json
```

返回 `{"type":"file","contentType":"application/vnd.ms-excel","size":N,"buffer":"<base64>"}`，需将 `buffer` base64 解码后保存为 `.xls` 文件再交付用户。导出不是危险操作，无需 `--yes`。

## 意图映射

- "查岗位 / 岗位列表 / 岗位体系 / 岗位树" → `hr.post.getPostTree`
- "有哪些岗位类别 / 序列 / XX 序列下有哪些岗位" → `hr.post.getPostByType`（逐级 type=1 → 2 → 3）
- "XX 岗位的职责 / 详情" → `getPostTree`（`name` 搜索）→ `hr.post.getDetail`
- "XX 岗位有多少人 / 能删吗" → `hr.post.getPostUserNum`
- "新增岗位类别/序列/岗位" → 收集名称（+上级）→ 三步确认 → `hr.post.addPost` → `getPostTree` 反查确认
- "改岗位名 / 改职责描述" → `hr.post.getDetail` 回显 → 三步确认 → `hr.post.updatePost`
- "删除岗位/序列/类别" → `getPostTree` 确认无下级 → `getPostUserNum` 确认人数为 0 → 三步确认 → `hr.post.removePost`
- "导出岗位" → `hr.post.exportPost` → 解码保存文件

## 信息缺失时的追问

| 场景 | 缺失信息 | 追问示例 |
|---|---|---|
| 新增序列 | 名称 / 所属类别 | "请提供序列名称，以及挂在哪个岗位类别下" |
| 新增岗位 | 名称 / 所属类别+序列 | "请提供岗位名称，以及它属于哪个类别和序列" |
| 编辑节点 | 目标节点 / 要改的字段 | "请说明要修改哪个岗位（类别/序列/岗位），修改名称还是职责描述" |
| 删除节点 | 目标节点 | "请提供要删除的岗位/序列/类别名称" |

## 错误处理

| 错误 | 原因 | 恢复动作 |
|---|---|---|
| `permission_denied` | 缺 `post` / `post_add` / `post_edit` / `post_delete` / `post_export` 权限 | 终止并说明缺失权限；本地模式可先 `auth refresh-permissions` |
| `validation_error` 含"危险操作" | 未加 `--yes` | 执行三步确认后加 `--yes` 重试，禁止自动静默重试 |
| `backend_error` `[-1] 运行异常` | 必填字段缺失（如 type=2/3 未传 typeId） | 对照本参考检查必填项，勿盲目重试 |
| 新增返回 `data: true` | 正常，后端不回传 id | 用 `getPostTree` + `name` 反查确认结果 |
| `getPostUserNum` 返回大于 0 | 节点下仍有在职人员 | 告知用户不可删除、先转移人员，停止操作 |

## 注意事项

- `positionId`、`typeId`、`sequenceId` 一律从前序命令返回中提取，禁止编造。
- 三级体系不可逆序操作：新增先父后子，删除先子后父。
- 所有写操作执行后，用 `getPostTree` / `getDetail` 回读校验，确认生效后再向用户汇报。
- "岗位"与"部门"是两套体系：岗位走 `hr.post.*`，部门走 `hr.dept.*`（见 [department.md](./department.md)），不要混用。
