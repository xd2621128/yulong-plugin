# 通报（Report）

御龙的新闻公告模块后端包含新闻、公告、通报、精选、研发运营速递等多种类型。**本 Skill 当前仅支持「通报」**，即 `type = 32` 的已发布通报查询、详情查看及附件下载。如果用户提到新闻、公告、精选等，应明确告知当前仅支持通报。

## 命令映射

| 功能 | CLI 命令 | 后端接口 | 说明 |
|------|----------|----------|------|
| 通报列表 | `yulong hr article findReportPage` | `POST /hr/article/findReportPage` | 查询已发布的通报分页列表 |
| 通报详情 | `yulong hr article detail <id>` | `GET /hr/article/${id}/detail` | 根据 id 获取通报详情（会累加点击数） |
| 附件下载 | `yulong hr file download <id>` | `GET /hr/file/download/${id}` | 通用文件下载，详见 [file.md](./file.md) |

> 后端还存在新闻、公告、精选、研发运营速递等其他类型接口，但本 Skill 当前仅开放通报能力。如用户需要其他类型，明确告知暂不支持。

## 权限要求

| 命令 | 本地权限 | match_mode | ResourceMark |
|------|----------|------------|--------------|
| `hr.article.findReportPage` | `["workbench"]` | `any` | `workbench` |
| `hr.article.detail` | `["workbench"]` | `any` | `workbench` |

附件下载依赖通用文件接口 `hr.file.download`，其权限说明见 [file.md](./file.md)。

## 命令示例

```bash
# 查询通报列表（按标题关键字）
yulong hr article findReportPage --format json --json '{
  "currentPage": 1,
  "pageSize": 10,
  "title": "安全生产"
}'

# 查看某条通报详情
yulong hr article detail 1894319070076387330 --format json

# 下载详情中的某个附件
yulong hr file download 1894319070076387331 --format json
```

## 常用参数

### `hr.article.findReportPage`

| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `currentPage` | number | 页码，从 1 开始 | `1` |
| `pageSize` | number | 每页条数，建议不超过 100 | `10` |
| `doSearchTotal` | boolean | 是否查询总数（可选） | `true` |
| `title` | string | 标题关键字（模糊查询） | `"安全生产"` |
| `status` | string | 状态：1-已拟稿 2-审批中 3-已发布 4-已退回 5-已作废 6-已下线 | `"3"` |
| `scopeStartTimeStr` | string | 发布开始时间（YYYY-MM-DD） | `"2026-01-01"` |
| `scopeEndTimeStr` | string | 发布结束时间（YYYY-MM-DD） | `"2026-06-30"` |
| `top` | boolean | 是否置顶 | `false` |
| `expressTop` | boolean | 是否研发运营速递 | `false` |

### `hr.article.detail` / `hr.file.download`

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 通报/文件 id，作为**路径参数**直接跟在命令后面 |

> `id` 必须作为位置参数传入，例如 `yulong hr article detail 123`，不要写成 `--json '{"id":"123"}'`（虽然 CLI 也会尝试兼容，但位置参数最稳定）。

## 响应字段说明

### 列表记录（`PubPost` / `PubArticleVo`）

```typescript
{
  id?: string;              // 主键 id
  title?: string;           // 标题
  type?: number;            // 类型：11新闻 12党建 13纪检 20公示 21公告 22工会 23普法 24保密 25安全 26研发 27解方 28培训 29专刊 31流程治理 32通报
  typeName?: string;        // 类型中文名（前端根据 type 映射，后端可能不返回）
  source?: string;          // 来源
  drafter?: string;         // 拟稿人
  scopeOrgName?: string;    // 发布范围
  scopeTime?: string;       // 发布时间
  hitCount?: number;        // 点击数
  likesCount?: number;      // 点赞数
  commentCount?: number;    // 评论数
  status?: string;          // 状态：1-已拟稿 2-审批中 3-已发布 4-已退回 5-已作废 6-已下线
  statusName?: string;      // 状态名
  top?: boolean;            // 是否置顶
  selected?: boolean;       // 是否精选
  expressSelected?: boolean;// 是否研发运营速递
}
```

### 详情（`PubArticleVo`）

除列表字段外，详情还包含：

```typescript
{
  content?: string;         // 正文 HTML
  attachments?: string;     // 附件，JSON 字符串，格式见下方
  reportYear?: string;      // 通报年份（仅通报 type=32）
  reportYearNo?: string;    // 通报序号（仅通报 type=32）
  reportNo?: string;        // 通报编号
  updatedByName?: string;   // 编辑人
  createTime?: string;      // 创建时间
  updateTime?: string;      // 更新时间
}
```

## 正文渲染规范

`content` 字段是完整的 HTML 字符串，通常包含富文本、内联样式、图片等。**公文对格式要求严格，Agent 必须原样呈现，禁止剥离字体、字号、颜色等样式。**

### 非通报类型（type ≠ 32）

如果用户提供了非通报文章的 id，详情接口仍可能返回数据。此时 Agent 应：

1. 提示用户当前 Skill 仅支持通报，返回的内容可能不是通报。
2. 将 `content` 原样放入 HTML 代码块输出，保留所有内联样式和图片。

### 通报（type = 32）

通报详情页在前端有特殊的红头公文样式，依赖两款自定义字体：

- **FZXBSJT**：标题用字体
- **fsgb2312**：正文用字体

**Agent 不需要自带或 base64 嵌入这些字体**。输出 HTML 时使用字体的实际族名（不同系统/WPS 可能以中文名或英文名注册字体）：

- 标题字体：`font-family: "方正小标宋简体", "FZXiaoBiaoSong-B05S", FZXBSJT, serif;`
- 正文字体：`font-family: "仿宋_GB2312", "FangSong_GB2312", fsgb2312, serif;`

这样无论用户安装的是中文名称还是英文名称的字体，WPS/浏览器都能正确匹配。如果客户端完全没有这两款字体，才会回退到系统衬线字体。

Agent 应按照以下顺序 reconstruct：

1. **报头图片**：Skill 已将前端静态资源 `reportheader.png` 打包到 `assets/reportheader.png`，并提供 base64 版本 `assets/reportheader.png.base64`。Agent 应读取 base64 文件内容（去掉换行），在输出最上方插入：

   ```html
   <div style="width: 100%; text-align: center;">
     <img src="data:image/png;base64,{{ base64_content }}" alt="报头图片" style="max-width: 100%;" />
   </div>
   ```

   > 如果读取 base64 失败或文件不存在，可退化为文字占位“报头图片”。
2. **通报编号**：

   ```
   中电信浙公信通报〔{{ reportYear }}〕{{ reportYearNo }}号
   ```

3. **红色分隔线**：可用 `<hr style="height: 2px; background-color: #ff0000; border: none;">`。
4. **标题**：

   ```html
   <div style="font-family: '方正小标宋简体', 'FZXiaoBiaoSong-B05S', FZXBSJT, serif; font-size: 33px; line-height: 56px; text-align: center; color: #1d2129; margin: 125px 0 80px;">
     {{ title }}
   </div>
   ```

5. **正文**：

   ```html
   <div style="font-family: '仿宋_GB2312', 'FangSong_GB2312', fsgb2312, serif; font-size: 26px !important; line-height: 38px !important; color: #1d2129 !important;">
     {{ content }}
   </div>
   ```

> 注意：前端对通报正文额外设置了 `!important` 样式。如果 `content` 本身已带内联样式，应**优先保留 content 中的原始样式**，仅在 content 无样式时套用上述兜底样式。

## 附件处理

详情中的 `attachments` 字段是 JSON 字符串，解析后结构如下：

```typescript
[
  {
    colName: '附件名称.pdf',           // 展示名称
    colRealpath: '/pubinfo-hr/hr/file/download/1894319070076387331' // 下载路径
  }
]
```

对每个附件，从 `colRealpath` 中截取最后一段作为 `fileId`：

```
id = colRealpath.split('/').pop()
```

然后调用 `yulong hr file download <id> --format json` 获取 base64 文件数据并保存。通用文件下载的完整说明、返回结构和保存示例见 [file.md](./file.md)。

### 专刊（type = 29）的 PDF 附件

专刊详情页会把附件当作 PDF 直接内联预览。Skill 处理方式与普通附件一致：先 `hr.file.download` 获取 base64，再保存为 PDF 文件供用户查看。

## 核心流程

```
用户提示词
  ├─ "查通报" / "通报列表" / "最近有什么通报" → hr.article.findReportPage
  │                                              默认 currentPage=1, pageSize=10
  ├─ "查看通报 xxx" / "通报 xxx 详情" / "id 为 xxx 的通报" → hr.article.detail <id>
  ├─ "下载通报 xxx 的附件" / "把附件发我" → 先 hr.article.detail <id> 取 attachments
  │                                         再对每个附件 hr.file.download <id>
  ├─ "按标题查通报" → hr.article.findReportPage + title
  ├─ "按发布时间查通报" → hr.article.findReportPage + scopeStartTimeStr/scopeEndTimeStr
  ├─ 用户只说了"通告" → 明确告知当前 Skill 仅支持通报，不支持通告；如用户想查通报，请使用"通报"重新提问
  ├─ 用户提到"新闻/公告/精选/研发运营速递" → 明确告知当前 Skill 仅支持通报，其他类型暂不提供
```

## 意图映射

| 用户说法 | 对应命令 | 说明 |
|----------|----------|------|
| "通报列表" / "查通报" / "最近通报" | `yulong hr article findReportPage` | 默认按发布时间倒序查前 10 条 |
| "查看通报 xxx" / "通报 xxx 内容" | `yulong hr article detail <id>` | id 从列表或用户话语中提取 |
| "下载通报附件" / "把附件发我" | `hr.article.detail` → `hr.file.download` | 先取 attachments 再逐个下载 |
| "按标题查通报" | `hr.article.findReportPage` + `title` | 模糊匹配标题 |
| "某年某月的通报" | `hr.article.findReportPage` + `scopeStartTimeStr/scopeEndTimeStr` | 时间范围 |
| "通告" | — | 明确告知当前 Skill 仅支持通报，不支持通告；如用户想查通报，请使用"通报"重新提问 |
| "新闻/公告/精选/研发运营速递" | — | 明确告知当前 Skill 仅支持通报，其他类型暂不提供 |

## 边界条件与注意事项

- `hr.article.detail` 会**累加点击数**；如果需要不增加点击数，可使用 `hr.article.detailNoHit <id>`（权限已默认开放）。
- `findReportPage` 返回的是**已发布**通报；如需查询审批中、已作废等状态，可传 `status`。
- `scopeStartTimeStr` / `scopeEndTimeStr` 格式为 `YYYY-MM-DD`；其他格式可能返回空结果。
- 附件 `colRealpath` 的格式固定为 `/pubinfo-hr/hr/file/download/{fileId}`，fileId 即 `colRealpath` 的最后一段；具体下载说明见 [file.md](./file.md)。
- 单次 `pageSize` 不超过 100；需要全量时循环分页。

## 错误处理

- `permission_denied`：用户缺少 `workbench` 权限（列表/详情）或未登录（附件下载）。
- `hr.article.detail <id>` 返回 `404` 或后端错误：检查 id 是否正确，或该通报是否已被删除/下线。
- 附件下载失败：检查 fileId 是否为 `colRealpath` 的最后一段；通用文件下载错误处理见 [file.md](./file.md)。
- 正文中的图片无法显示：通常是相对路径，需要后端 baseUrl 前缀；Agent 应保留原始 HTML 并向用户说明。

## 禁止事项

- 禁止剥离正文 HTML 中的 `style`、`class`、`font`、`color`、`size` 等格式信息。
- 禁止编造通报 id；必须从列表返回或用户提供的 id 中使用。
- 禁止把 `colRealpath` 直接当下载命令调用；必须先提取 fileId。
- 禁止单次拉取超过 100 条记录。
