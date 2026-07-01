# 知识库（Knowledge）

御龙知识库模块，支持通过组织树选择分享范围、查询分类字典、新增知识库条目。本 Skill 当前聚焦**新增知识库**场景，严格对齐前端 `newknowledge.vue` 页面逻辑。

## 命令映射

| 功能 | CLI 命令 | 后端接口 | 说明 |
|------|----------|----------|------|
| 获取组织树 | `yulong hr knowledge getOrgTree` | `POST /hr/knowledge/getOrgTree` | 查询可用于分享范围的组织树 |
| 分类字典 | `yulong hr knowledge classifyList` | `GET /hr/knowledge/classifyList` | 查询模板下载 / 常见问题解答的分类选项 |
| 新增知识库 | `yulong hr knowledge addKnowledge` | `POST /hr/knowledge/addKnowledge` | 新增一条知识库（**危险操作**，需二次确认） |

## 权限要求

| 命令 | 本地权限 | match_mode | ResourceMark | 说明 |
|------|----------|------------|--------------|------|
| `hr.knowledge.getOrgTree` | `["all"]` | `all` | — | 对任意已登录用户开放 |
| `hr.knowledge.classifyList` | `["all"]` | `all` | — | 对任意已登录用户开放 |
| `hr.knowledge.addKnowledge` | `["KNOWLEDGE"]` | `any` | `KNOWLEDGE` | 需要 `KNOWLEDGE` 权限，且为危险操作 |

## 参数说明

### `hr.knowledge.addKnowledge`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | 是 | 知识库标题，1-40 字 |
| `type` | number | 是 | 知识库类型，见下方「类型字典」 |
| `content` | string | 是 | 正文内容，HTML 字符串（富文本） |
| `scopeOrgId` | string | 是 | **分享范围，必须传 `orgNumId`**；多个组织的 `orgNumId` 用英文逗号拼接。禁止误用树节点的 `id`。 |
| `classification` | number | **条件必填** | 当 `type` 为 `16`（模板下载）或 `17`（常见问题解答）时**必须**提供，否则 Agent 应追问用户 |
| `attachments` | string | 否 | 附件 JSON 字符串，格式见下方「附件格式」；空数组或不传时表示无附件 |

### 类型字典

前端 `enum.ts` 中的 `klTypeList` 决定 `type` 取值：

| type 值 | 类型代码 | 中文含义 |
|---------|----------|----------|
| `11` | `zcfg` | 政策法规 |
| `12` | `gswj` | 公司文件 |
| `13` | `xmzl` | 项目资料 |
| `14` | `hyzs` | 行业知识 |
| `15` | `jxkh` | 绩效考核 |
| `16` | `mbxz` | 模板下载 |
| `17` | `cjwtjd` | 常见问题解答 |
| `18` | `cwzszx` | 财务知识中心 |
| `19` | `cpdcg` | 产品大采购 |

> 后端 API 注释中曾出现 `11=政策法规、12=行业知识、13=项目资料、14=公司文件` 的描述，但前端实际以上表 `klTypeList` 索引为准。本 Skill 按前端逻辑映射。

### 分享范围

1. 调用 `yulong hr knowledge getOrgTree --format json` 获取组织树。
2. 每个节点字段：

   ```typescript
   {
     id: string;          // 节点 id（uuid 或数字字符串）
     name: string;        // 组织名称，如 "浙江省公众信息产业有限公司"
     orgNumId: string;    // 分享范围取值
     type: string;        // 节点类型
     children: [...]      // 子组织
   }
   ```

3. 用户按名称选择后，**必须**使用对应节点的 `orgNumId`，**不能**使用 `id`（`id` 与 `orgNumId` 可能不一致）。
4. 多选时把多个 `orgNumId` 用英文逗号拼接，例如：

   ```
   "1793907438427492353,1793907438456852482"
   ```

### 分类字典（模板下载 / 常见问题解答）

1. 调用 `yulong hr knowledge classifyList --format json`。
2. 返回示例：

   ```json
   [
     { "code": 1, "name": "市场条线" },
     { "code": 2, "name": "人力条线" },
     { "code": 3, "name": "财务条线" }
   ]
   ```

3. 用户按 `name` 选择后，参数中传对应 `code`。

## 字段校验

在调用 `hr.knowledge.addKnowledge` 前，Agent 必须校验：

- `title`、`type`、`content`、`scopeOrgId` 不能为空。
- 当 `type` 为 `16`（模板下载）或 `17`（常见问题解答）时，`classification` **必须**有值；否则必须追问用户选择分类，禁止直接提交。
- `title` 长度不能超过 40 个字符。
- 若用户提供本地附件，文件名长度不能超过 30 个字符，单文件大小不能超过 100MB。

### 附件格式

`attachments` 字段是 JSON 字符串，结构与通报附件一致：

```typescript
[
  {
    colName: '附件名称.pdf',           // 展示名称
    colRealpath: '/pubinfo-hr/hr/file/download/1894319070076387331' // 下载路径
  }
]
```

如果涉及附件，Agent 必须按以下规则处理：

1. **本地附件**：调用 `yulong hr file upload --file <path> --format json` 上传，获取 `fileId`。
2. **从其他模块迁移的附件**（如把通报附件搬到知识库）：**禁止直接复用原 `fileId` 或 `colRealpath`**，必须先用 `yulong hr file download <fileId>` 下载到本地，再重新调用 `hr.file.upload` 上传获取新 `fileId`。

然后用新的 `fileId` 拼接 `colRealpath`：

```
/pubinfo-hr/hr/file/download/{fileId}
```

> 必须与前端页面保持一致：附件下载路径包含 context path `/pubinfo-hr`。如果 `colRealpath` 写成 `/hr/file/download/{fileId}`，页面上的下载链接会缺少前缀导致 404。

最后把附件数组 `JSON.stringify` 后作为 `attachments`。

## 新增知识库流程

```
用户说"新增知识库" / "发布一条知识库" / "添加知识库"
  ├─ 1. 确认 type（如未提供则展示类型字典让用户选择）
  ├─ 2. 确认 title（标题）
  ├─ 3. 确认 content（正文，可为 HTML 或普通文本自动包成 <p>）
  ├─ 4. 确认分享范围
  │      └─ 先调用 hr.knowledge.getOrgTree
  │         用户按组织名称选择，Agent 转换为 orgNumId 拼接字符串
  ├─ 5. 若 type 为 16/17，确认 classification
  │      └─ 先调用 hr.knowledge.classifyList
  ├─ 6. 确认附件（可选）
  │      └─ 如有本地文件，先 hr.file.upload 上传，再构造 attachments
  └─ 7. 二次确认（危险操作）
         ├─ 展示摘要：标题 + 类型 + 分享范围 + 分类 + 附件数量
         ├─ 用户明确回复确认
         └─ 调用 yulong hr knowledge addKnowledge ... --yes
```

## 危险操作确认

`hr.knowledge.addKnowledge` 是危险操作，必须执行三步确认：

1. **展示操作摘要**：标题、类型、分享范围组织名、分类（如有）、附件数量。
2. **用户明确回复确认**（如 "确认" / "好的" / "发布"）。
3. **加 `--yes` 执行**：

   ```bash
   yulong hr knowledge addKnowledge --json '{"title":"...","type":11,"content":"...","scopeOrgId":"...","classification":1,"attachments":"..."}' --yes --format json
   ```

## 命令示例

```bash
# 查询组织树
yulong hr knowledge getOrgTree --format json

# 查询分类字典
yulong hr knowledge classifyList --format json

# 新增知识库（需加 --yes）
yulong hr knowledge addKnowledge --json '{
  "title": "测试标题",
  "type": 11,
  "content": "<p>测试正文</p>",
  "scopeOrgId": "1793907438427492353"
}' --yes --format json
```

## 响应说明

- `hr.knowledge.getOrgTree`：返回组织树数组。
- `hr.knowledge.classifyList`：返回 `{ code, name }[]`。
- `hr.knowledge.addKnowledge`：成功时 `data` 通常为 `1` 或新增记录 id。

## 错误处理

- `permission_denied`：缺少 `KNOWLEDGE` 权限或未登录。
- `backend_error`：标题超长、正文为空、type 不合法、scopeOrgId 无效、classification 缺失等。
- 未加 `--yes` 时 CLI 直接返回 `危险操作 hr.knowledge.addKnowledge，请添加 --yes 确认`。

## 禁止事项

- 禁止在用户信息不全（必填字段缺失）时猜测并构造新增请求。
- 禁止绕过二次确认直接加 `--yes`；必须等待用户明确确认。
- 禁止把 `scopeOrgId` 直接写死；必须通过 `hr.knowledge.getOrgTree` 让用户选择有效组织。
- 禁止把 `classification` 写死；`type` 为 16/17 时必须通过 `hr.knowledge.classifyList` 查询。
- 禁止单次新增携带超过前端限制（文件名 30 字符、文件 100MB）的附件。
