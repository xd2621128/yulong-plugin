# 御龙 Skill 意图路由总览

## 何时进入御龙 Skill

当用户提到以下任一关键词时，应进入御龙相关 Skill：

- 御龙
- 浙江省公众信息产业有限公司 / 浙江信产 / 信产公司
- 浙江信产 OA / 公众信息 OA / 御龙 OA
- pubinfo-hr / pubinfo OA

## 业务 Skill 快速路由

| 用户意图 | 使用 Skill | 主要命令 |
|---|---|---|
| 登录、登出、登录状态、刷新权限 | [`yulong-auth`](../yulong-auth/SKILL.md) | `yulong auth login/logout/status/refresh-permissions` |
| 用户、角色、组织、权限 | [`yulong-rbac`](../yulong-rbac/SKILL.md) | `yulong rbac user userPage` |
| 商机、合同、收入清单、合作伙伴 | [`yulong-project`](../yulong-project/SKILL.md) | `yulong project business list`、`yulong project origin-contract forward list`、`yulong project edaLabel beforeSplit/afterSplit`、`yulong project partner page` |
| 通报、知识库、通用文件 | [`yulong-hr`](../yulong-hr/SKILL.md) | `yulong hr article findReportPage/detail`、`yulong hr knowledge addKnowledge`、`yulong hr file download` |
| 不确定该用哪个 / 认证失败 / 配置问题 | [`yulong-shared`](../yulong-shared/SKILL.md) | 通用规则与错误恢复 |

## 跨 Skill 通用规则

1. **先读 `yulong-shared`**：首次使用、认证失败、权限错误、配置缺失、看到 `_notice` 字段时，先读共享规则。
2. **所有命令必须加 `--format json`**：Skill 解析统一 envelope 输出。
3. **禁止直接调用后端**：禁止使用 curl、HTTP API、浏览器直接访问御龙后端。
4. **禁止编造标识符**：用户 ID、组织 ID、部门 ID 等必须从命令返回中提取。
5. **危险操作需确认**：`yulong hr.knowledge.addKnowledge` 等危险操作必须执行三步确认（展示摘要 → 用户确认 → 加 `--yes`）。
6. **单次批量不超过 100 条**。

## 易混淆场景

### "部门/大区" vs "区域" vs "客户属地"

- 用户说"XX 大区"通常想按**部门**筛选，对应 `depId`，必须先查 `yulong project crmField dept`。
- 用户说"XX 区域"才指区域字典，对应 `regionId`，查 `yulong project crmField region`。
- 用户说"XX 省/市"指客户属地，对应 `areaId`，查 `yulong project crmField province`。
- **禁止**在部门字典找不到匹配时，自动把"XX 大区"当作"XX 区域"处理，必须追问用户确认。

### "收入清单"必须明确拆分前/后

用户说"收入清单"时，不能直接默认使用 `beforeSplit` 或 `afterSplit`，必须追问确认。

### "合作伙伴"必须明确生态/SP/SI

用户说"合作伙伴"时，必须追问是生态合作伙伴（`type=1`）还是 SP/SI 合作伙伴（`type=2`）。

### "通报" vs "通告" vs "新闻/公告"

- 当前仅支持**通报**（`type=32`）。
- "通告" → 明确告知仅支持通报，不支持通告。
- "新闻/公告/精选/研发运营速递" → 明确告知仅支持通报，其他类型暂不提供。

## 详细参考

- [`yulong-shared/SKILL.md`](../yulong-shared/SKILL.md) — 共享规则
- [`yulong-auth/SKILL.md`](../yulong-auth/SKILL.md) — 认证
- [`yulong-rbac/SKILL.md`](../yulong-rbac/SKILL.md) — 用户/角色/组织/权限
- [`yulong-project/SKILL.md`](../yulong-project/SKILL.md) — 商机/合同/收入/合作伙伴
- [`yulong-hr/SKILL.md`](../yulong-hr/SKILL.md) — 通报/知识库/文件
- [references/products/](./) — 各产品命令详细参考
- [references/global-reference.md](./global-reference.md) — 认证机制、全局 flag、输出格式
- [references/error-codes.md](./error-codes.md) — 错误码与调试流程
- [references/recovery-guide.md](./recovery-guide.md) — recovery 闭环规范
