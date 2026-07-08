# HR 模块错误恢复

HR 模块包含通报查询/详情/附件下载、知识库新增、通用文件上传下载等命令。

## CLI 错误类型

| `error.type` | 触发场景 | 恢复动作 |
|---|---|---|
| `auth_required` | token 过期 | 按 [`yulong-shared`](../../yulong-shared/SKILL.md) 处理 |
| `permission_denied` | 缺少 `workbench` 或 `KNOWLEDGE` 权限 | 终止操作，说明缺失权限 |
| `backend_error` | 后端业务错误 | 展示完整 `code` 和 `msg` |
| `validation_error` | JSON 参数格式错误或必填字段缺失 | 检查参数，参考 `--help` |

## 后端错误码

| 后端码 | 含义 | 恢复动作 |
|---|---|---|
| `0` | 成功 | 正常返回 `data` |
| `-1` | 运行异常 | 加 `--verbose` 重试 |
| `4` | 业务异常 | 展示完整 `code` 和 `msg` |
| `400001004` / `400001006` | token 过期 | CLI 自动刷新/重登 |
| `400001007` | 访问未授权 | 返回 `permission_denied` |

## 按命令的常见错误

### `hr article findReportPage` / `hr article detail`

| 现象 | 可能原因 | 恢复动作 |
|---|---|---|
| `permission_denied` | 缺少 `workbench` 权限 | 终止并说明缺失权限 |
| `404` 或后端错误 | 通报 id 错误或已被删除/下线 | 确认 id 来自列表返回，或让用户提供正确 id |
| 正文图片无法显示 | 图片使用相对路径 | 保留原始 HTML，向用户说明需在后端 baseUrl 环境下查看 |
| 附件下载失败 | `fileId` 提取错误或文件已删除 | 从 `colRealpath` 最后一段提取 fileId，确认文件存在 |

### `hr knowledge addKnowledge`

| 现象 | 可能原因 | 恢复动作 |
|---|---|---|
| 未加 `--yes` 时 CLI 返回危险操作提示 | 危险操作门禁 | 展示摘要 → 用户确认 → 加 `--yes` 重试 |
| `permission_denied` | 缺少 `KNOWLEDGE` 权限 | 终止并说明缺失权限 |
| `backend_error` | 标题超长、正文为空、`type` 不合法、`scopeOrgId` 无效、`classification` 缺失 | 检查必填字段：`title`（≤40 字）、`type`、`content`、`scopeOrgId`；`type=16/17` 时必须提供 `classification` |
| `scopeOrgId` 无效 | 误用了树节点的 `id` 而非 `orgNumId` | 重新查询 `hr knowledge getOrgTree`，使用 `orgNumId` |

### `hr file download` / `hr file upload`

| 现象 | 可能原因 | 恢复动作 |
|---|---|---|
| `permission_denied` | 未登录或 token 过期 | 重新登录或请求上游重新注入 token |
| 下载失败 | `fileId` 不是 `colRealpath` 最后一段 | 正确提取 fileId：`colRealpath.split('/').pop()` |
| 上传失败 | `--file` 路径不存在或不是普通文件 | 检查文件路径，使用 cwd 相对路径 |

## 跨模块附件迁移

从 A 模块迁移附件到 B 模块时（如通报附件导入知识库）：

1. 用 `yulong hr file download <fileId>` 下载到本地
2. 用 `yulong hr file upload --file <path>` 重新上传获取新 fileId
3. 用新 fileId 拼接 `colRealpath`

**禁止直接复用原 `fileId` 或 `colRealpath`。**

## 参考

- [article.md](./article.md) — 通报命令详细参考
- [knowledge.md](./knowledge.md) — 知识库命令详细参考
- [file.md](./file.md) — 通用文件上传/下载详细参考
- [`yulong-shared/SKILL.md`](../../yulong-shared/SKILL.md) — 认证模式与错误处理通则
- [error-codes.md](../error-codes.md) — 全局错误类型
- [recovery-guide.md](../recovery-guide.md) — recovery 闭环规范
