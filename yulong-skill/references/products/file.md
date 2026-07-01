# 文件（File）

御龙系统的通用文件上传/下载接口。通报、知识库等模块的附件下载都复用 `hr.file.download`；`hr.file.upload` 是通用的附件上传接口。

## 命令映射

| 功能 | CLI 命令 | 后端接口 | 说明 |
|------|----------|----------|------|
| 下载文件 | `yulong hr file download <id>` | `GET /hr/file/download/${param0}` | 返回文件二进制 base64 数据 |
| 上传文件 | `yulong hr file upload --file <path>` | `POST /hr/file/upload` | 通用文件上传接口，返回 fileId |
| 上传文件并返回附件信息 | `yulong hr file upload return attachment --file <path>` | `POST /hr/file/upload/return/attachment` | 返回含 fileId、name、url 的附件对象 |

## 权限要求

| 命令 | 本地权限 | match_mode | ResourceMark | 说明 |
|------|----------|------------|--------------|------|
| `hr.file.download` | `["all"]` | `all` | — | 对任意已登录用户开放，下载时仍需 token |
| `hr.file.upload` | `["all"]` | `all` | — | 对任意已登录用户开放，上传时仍需 token |
| `hr.file.upload.return.attachment` | `["all"]` | `all` | — | 对任意已登录用户开放，上传时仍需 token |

## 参数说明

### `hr.file.download <id>`

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 文件 id，例如通报附件 `colRealpath` `/pubinfo-hr/hr/file/download/1894319070076387331` 的最后一段 `1894319070076387331` |

> `id` 必须作为位置参数传入：`yulong hr file download 1894319070076387331 --format json`，不要直接调用完整的 `colRealpath`。

### `hr.file.upload`

| 参数 | 类型 | 说明 |
|------|------|------|
| `--file` | string | 要上传的本地文件路径（必填） |

用法：

```bash
yulong hr file upload --file /path/to/file.pdf --format json
```

CLI 会读取本地文件并以 `multipart/form-data` 形式上传，字段名为 `file`，与前端 `FileUploaderImg` 组件保持一致。

### `hr.file.upload.return.attachment`

如果需要后端直接返回附件对象（含 `fileId`、`name`、`url` 等），可使用：

```bash
yulong hr file upload return attachment --file /path/to/file.pdf --format json
```

## 上传文件

### 普通上传（返回 fileId）

成功时返回字符串，通常是上传后的文件 id；在构造通报/知识库等附件对象时，`colRealpath` 应拼为 `/pubinfo-hr/hr/file/download/{fileId}`，与前端页面保持一致。

### 跨模块附件迁移

当需要把 A 模块的附件用于 B 模块时（例如把通报附件导入知识库），**禁止直接复用 A 模块返回的 `fileId` 或 `colRealpath`**。正确流程：

1. 用 `yulong hr file download <fileId>` 把附件下载到本地；
2. 用 `yulong hr file upload --file <path>` 重新上传，获取新的 `fileId`；
3. 用新 `fileId` 拼接 `colRealpath` 填入 B 模块的 `attachments`。

> 不同模块对文件存储的权限/归属要求不同，直接复用原文件 ID 可能导致下载 404 或发布范围错误。

### 返回附件对象

`hr.file.upload.return.attachment` 成功时返回 `AttachmentVO`：

```typescript
{
  fileId?: string;    // 文件 id
  name?: string;      // 文件名
  url?: string;       // 下载地址
  preViewUrl?: string;// 预览地址
  fileType?: number;  // 文件类型
  createUserName?: string;
  createTime?: string;
}
```

> 通报场景目前**只涉及附件下载**，不涉及通过 `hr.file.upload` 上传附件。通报的附件上传由前端/业务接口（如发文/编辑页面）自行处理。

## 错误处理

- `permission_denied`：用户未登录，或 token 已过期。
- `backend_error`：文件不存在、已被删除、或后端存储异常。
- `hr.file.download` 返回空或失败：检查 `fileId` 是否为 `colRealpath` 的最后一段。
- `hr.file.upload` 返回空或失败：检查 `--file` 路径是否存在、是否为普通文件。

## 禁止事项

- 禁止把 `colRealpath` 整体当作命令调用；必须先提取 fileId。
- 禁止上传未确认来源或超出大小限制的文件。
- 禁止单次下载/上传超过后端允许的大小限制（参考后端错误提示）。
