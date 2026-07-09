---
name: yulong-hr
version: "1.0.0"
description: 御龙 HR/办公相关操作：通报查询与下载、知识库新增、通用文件上传下载。当用户提到通报、通告、新闻、公告、知识库、文件上传下载时使用。首次使用或遇到认证/权限错误时先读 yulong-shared。
cli_version: ">=0.1.0"
metadata:
  requires:
    bins: ["yulong"]
  cliHelp: "yulong hr --help"
---

# 御龙 HR Skill

**执行本 Skill 前，必须先读 [`yulong-shared`](../yulong-shared/SKILL.md) 中的认证模式、Token 模式、错误处理通则和危险操作确认规则。**

## 何时使用

- 用户提到"通报 / 查通报 / 最近通报"
- 用户提到"知识库 / 新增知识库 / 发布知识库"
- 用户提到"文件上传 / 文件下载 / 附件下载"

## 命令快速路由

| 用户目标 | 优先命令 | 说明 |
|---|---|---|
| 通报列表 | `yulong hr article findReportPage --format json` | 默认按发布时间倒序 |
| 通报详情 | `yulong hr article detail <id> --format json` | id 从列表或用户话语中提取 |
| 下载通报附件 | 先 `yulong hr article detail <id>`，再 `yulong hr file download <fileId>` | 逐个下载 attachments |
| 知识库组织树 | `yulong hr knowledge getOrgTree --format json` | 获取分享范围 |
| 知识库分类 | `yulong hr knowledge classifyList --format json` | 模板下载/常见问题解答类型需要 |
| 新增知识库 | `yulong hr knowledge addKnowledge --format json` | 危险操作，需三步确认 |

## 歧义处理

- "通告" → 明确告知当前 Skill 仅支持**通报**，不支持通告；如用户想查通报，请使用"通报"重新提问
- "新闻 / 公告 / 精选 / 研发运营速递" → 明确告知当前 Skill 仅支持通报，其他类型暂不提供
- "收入清单"相关 → **不归本 Skill 处理**，转 [`yulong-project`](../yulong-project/SKILL.md)

## 危险操作

- `yulong hr.knowledge.addKnowledge` 是危险操作，新增知识库会向组织范围内发布内容。
- 必须执行三步确认：展示摘要 → 用户明确回复确认 → 加 `--yes` 执行。
- 必填字段（`title`、`type`、`content`、`scopeOrgId`）缺失时必须追问，禁止猜测。

## 详细参考

- [references/products/article.md](../references/products/article.md) — 通报命令详细参考
- [references/products/knowledge.md](../references/products/knowledge.md) — 知识库命令详细参考
- [references/products/file.md](../references/products/file.md) — 通用文件上传/下载详细参考
- [references/intent-guide.md](../references/intent-guide.md) — 完整意图路由指南
- [references/global-reference.md](../references/global-reference.md) — 认证机制、全局 flag、输出格式
- [references/error-codes.md](../references/error-codes.md) — 错误码与调试流程
- [references/recovery-guide.md](../references/recovery-guide.md) — recovery 闭环规范
