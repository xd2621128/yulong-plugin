# Project 模块错误恢复

Project 模块包含商机、合同/签约清单、拆分前/后收入清单、合作伙伴、CRM 字典等命令。

## CLI 错误类型

| `error.type` | 触发场景 | 恢复动作 |
|---|---|---|
| `auth_required` | token 过期 | 按 [`yulong-shared`](../../yulong-shared/SKILL.md) 处理 |
| `permission_denied` | 缺少对应模块权限 | 终止操作，说明缺失权限 |
| `backend_error` | 后端业务错误 | 展示完整 `code` 和 `msg` |
| `validation_error` | JSON 参数格式错误 | 检查字段类型，参考 `--help` |

## 后端错误码

| 后端码 | 含义 | 恢复动作 |
|---|---|---|
| `0` | 成功 | 正常返回 `data` |
| `-1` | 运行异常 | 加 `--verbose` 重试 |
| `4` | 业务异常 | 展示完整 `code` 和 `msg` |
| `400001004` / `400001006` | token 过期 | CLI 自动刷新/重登 |
| `400001007` | 访问未授权 | 返回 `permission_denied` |

## 按命令的常见错误

### `yulong project business list` / `yulong project origin-contract forward list` / `yulong project edaLabel beforeSplit/afterSplit` / `yulong project partner page`

| 现象 | 可能原因 | 恢复动作 |
|---|---|---|
| `400 body 数据格式不正确，无法完成序列化` | `depId` 传了字符串而非数组；`type`/`regionId` 传了字符串而非数字；`edaType`/`state` 未传数组 | 检查字段类型：`depId` 为 `string[]`，`regionId`/`type`/`incomeType` 为数字，`edaType`/`state` 为数组 |
| 返回空列表 | 字典 ID 无效、筛选条件过严、时间格式错误 | 重新查询对应字典确认 ID；检查时间格式（收入清单 `YYYY-MM-DD`，合作伙伴 `YYYY-MM`） |
| `permission_denied` | 缺少对应模块权限 | 说明缺失权限：商机需 `week-field`/`business-list`；合同需 `preceding-contract`；收入需 `income-list`；合作伙伴需 `partner-set-list`/`performance_assessment_system` |
| 分页超过最大页码 | `currentPage` 过大 | 减小 `currentPage` 或增大 `pageSize`（不超过 100） |

### CRM 字典命令

| 命令 | 常见错误 | 恢复动作 |
|---|---|---|
| `yulong project crmField dept` | 返回超长列表 | 使用 `--fields` 或本地 `grep`/`jq` 过滤 |
| `yulong project crmField region` | `regionId` 找不到 | 确认使用 `id` 字段而非 `name` |
| `yulong project crmField province` | `areaId` 无效 | 确认使用叶子节点的 `id`，而非父级或 `value` 名称 |
| `yulong project system pm-index listRDField` | 返回为空 | 确认接口已开放，或检查请求参数 |

## 禁止事项

- 禁止将中文名称直接填入 `depId`/`regionId`/`areaId`/`productField`/`marketLeader`/`rdField` 等字段，必须先查字典
- 禁止在未明确"拆分前/后"、"生态/SP/SI"时构造查询
- 禁止单次拉取超过 100 条记录

## 参考

- [business.md](./business.md) — 商机命令详细参考
- [contract.md](./contract.md) — 合同/签约清单命令详细参考
- [income.md](./income.md) — 收入清单命令详细参考
- [partner.md](./partner.md) — 合作伙伴命令详细参考
- [`yulong-shared/SKILL.md`](../../yulong-shared/SKILL.md) — 认证模式与错误处理通则
- [error-codes.md](../error-codes.md) — 全局错误类型
- [recovery-guide.md](../recovery-guide.md) — recovery 闭环规范
