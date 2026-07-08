---
name: yulong-project
version: "1.0.0"
description: 御龙项目/经营数据查询：商机列表、合同/签约清单、拆分前/后收入清单、合作伙伴、CRM 字典。当用户提到商机、合同、签约、收入清单、合作伙伴、生态合作伙伴、SP/SI 合作伙伴、部门/大区/区域/客户属地/产品田/营销田总监/研发田 筛选时使用。首次使用或遇到认证/权限错误时先读 yulong-shared。
cli_version: ">=0.1.0"
metadata:
  requires:
    bins: ["yulong"]
  cliHelp: "yulong project --help"
---

# 御龙项目 Skill

**执行本 Skill 前，必须先读 [`yulong-shared`](../yulong-shared/SKILL.md）中的认证模式、Token 模式、错误处理通则。**

## 何时使用

- 用户提到"商机 / 商机列表 / 查商机 / 全量商机"
- 用户提到"合同清单 / 签约清单 / 查合同 / 原合同"
- 用户提到"拆分前收入清单 / 拆分后收入清单 / 收入清单"
- 用户提到"合作伙伴 / 生态合作伙伴 / SP/SI 合作伙伴"
- 用户提到按"部门/大区/区域/客户属地/产品田/营销田总监/研发田"筛选上述数据

## 命令快速路由

| 用户目标 | 优先命令 | 说明 |
|---|---|---|
| 商机列表 | `yulong project business list --format json` | 可结合时间范围筛选 |
| 合同/签约清单 | `yulong project origin-contract forward list --format json` | "合同清单"与"签约清单"是同一命令 |
| 拆分前收入清单 | `yulong project edaLabel beforeSplit --format json` | 明确拆分前 |
| 拆分后收入清单 | `yulong project edaLabel afterSplit --format json` | 明确拆分后 |
| 生态合作伙伴 | `yulong project partner page --json '{"type":1,...}' --format json` | `type=1` |
| SP/SI 合作伙伴 | `yulong project partner page --json '{"type":2,...}' --format json` | `type=2` |
| 部门字典 | `yulong project crmField dept --format json` | 用于"XX 大区"筛选 |
| 区域字典 | `yulong project crmField region --format json` | 用于"XX 区域"筛选 |
| 客户属地字典 | `yulong project crmField province --format json` | 用于"XX 省/市"筛选 |
| 产品田字典 | `yulong project crmField productField --format json` | 用于产品田筛选 |
| 营销田总监字典 | `yulong project crmField marketField --format json` | 用于营销田总监筛选 |
| 研发田字典 | `yulong project system pm-index listRDField --format json` | 用于研发田筛选 |

## 字典联动规则

用户说"XX 大区"通常想按**部门**筛选，但部门字典里的 `dname` 不一定就叫"XX 大区"（可能是"XX 事业部/产品部/营销中心"等），必须以 `project crmField dept` 的查询结果为准；找不到匹配时必须追问用户，禁止自动把"大区"当作"区域"。

| 筛选维度 | 先查字典 | 再执行命令 |
|---|---|---|
| 部门/XX 大区 + 商机 | `project crmField dept` | `project business list` |
| 区域/XX 区域 + 商机 | `project crmField region` | `project business list` |
| 客户属地/省/市 + 商机 | `project crmField province` | `project business list` |
| 产品田 + 商机 | `project crmField productField` | `project business list` |
| 营销田总监 + 商机 | `project crmField marketField` | `project business list` |
| 部门/XX 大区 + 合同 | `project crmField dept` | `project origin-contract forward list` |
| 研发田 + 合同 | `project system pm-index listRDField` | `project origin-contract forward list` |
| 部门/XX 大区 + 收入清单 | `project crmField dept` | `project edaLabel beforeSplit/afterSplit` |
| 部门/XX 大区 + 合作伙伴 | `project crmField dept` | `project partner page` |

## 歧义处理

- "收入清单"未明确拆分前/后 → **必须追问用户确认是拆分前还是拆分后**
- "合作伙伴"未明确生态/SP/SI → **必须追问用户确认是生态合作伙伴还是 SP/SI 合作伙伴**
- 部门字典中找不到匹配时 → 追问用户确认具体部门或是否指"XX 区域"

## 详细参考

- [references/products/business.md](../references/products/business.md) — 商机命令详细参考
- [references/products/contract.md](../references/products/contract.md) — 合同/签约清单命令详细参考
- [references/products/income.md](../references/products/income.md) — 收入清单命令详细参考
- [references/products/partner.md](../references/products/partner.md) — 合作伙伴命令详细参考
- [references/intent-guide.md](../references/intent-guide.md) — 完整意图路由指南
- [references/global-reference.md](../references/global-reference.md) — 认证机制、全局 flag、输出格式
- [references/error-codes.md](../references/error-codes.md) — 错误码与调试流程
- [references/recovery-guide.md](../references/recovery-guide.md) — recovery 闭环规范
