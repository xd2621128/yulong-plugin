---
name: yulong-skill
description: 管理浙江省公众信息产业有限公司 OA 系统「御龙」的 API 能力。当用户提到御龙、信产、浙江信产、OA、浙江省公众信息产业有限公司，或需要查询御龙系统中的用户/角色/组织/权限、商机列表、收入清单、合同/签约清单、合作伙伴/生态合作伙伴/SP/SI合作伙伴、通报、知识库、通用文件上传/下载、进行认证登录、命令发现时调用。
cli_version: ">=0.1.0"
---

# 御龙 API Skill

御龙是浙江省公众信息产业有限公司的 OA 系统。本 Skill 通过 `yulong` CLI 二进制调用御龙网站 API，处理与浙江信产 OA 相关的用户、角色、组织、权限等查询与管理请求。

## CLI 位置

本 Skill 通过 `yulong` CLI 二进制调用御龙 API。

- **默认 PATH 入口**：`~/.local/bin/yulong`（wrapper 脚本）
- **默认二进制位置**：`~/.local/lib/yulong/yulong`
- **Skill 配置**：`config.json` 中的 `cliPath`（默认 `~/.local/bin/yulong`）

调用时优先使用 `yulong`；若 PATH 中没有，则使用 `~/.local/bin/yulong`。如果两者都不存在，说明 CLI 未安装，需从部署包解压安装：

```bash
# macOS ARM64
unzip /path/to/yulong-deploy-mac.zip -d ~/.local/lib
mkdir -p ~/.local/bin
cp ~/.local/lib/yulong-deploy-mac/yulong ~/.local/lib/yulong/yulong
cp ~/.local/lib/yulong-deploy-mac/config.json ~/.local/lib/yulong/config.json
mkdir -p ~/.local/lib/yulong/data
cp ~/.local/lib/yulong-deploy-mac/data/users.db ~/.local/lib/yulong/data/users.db

cat > ~/.local/bin/yulong <<'EOF'
#!/bin/bash
set -e
export YULONG_HOME="${YULONG_HOME:-$HOME/.config/yulong}"
exec "$HOME/.local/lib/yulong/yulong" "$@"
EOF
chmod +x ~/.local/bin/yulong
```

## 严格禁止 (NEVER DO)

- 禁止使用 curl、HTTP API、浏览器直接访问御龙后端
- 禁止编造用户 ID、组织 ID 等标识符，必须从命令返回中提取
- 禁止猜测字段名/参数值，操作前必须先查询确认
- 禁止对未在 `yulong schema` 中出现的命令自行构造调用

## 严格要求 (MUST DO)

- 所有命令必须加 `--format json` 以获取可解析输出
- 危险操作必须先向用户确认，用户同意后才加 `--yes` 执行
- 调用业务命令前，优先检查 `yulong auth status` 确认已登录
- 单次批量操作不超过 100 条记录
- 所有命令严格遵循参考文档中规定的参数格式

## 产品总览

| 模块 | 用途 | 参考文件 |
|------|------|----------|
| `auth` | 认证：登录、登出、状态查看、token 注入 | [global-reference.md](./references/global-reference.md) |
| `rbac` | 用户/角色/组织/权限管理 | [rbac.md](./references/products/rbac.md) |
| `business` | 商机列表：全量商机查询 | [business.md](./references/products/business.md) |
| `contract` | 合同/签约清单查询 | [contract.md](./references/products/contract.md) |
| `income` | 收入清单：拆分前/拆分后收入清单查询 | [income.md](./references/products/income.md) |
| `partner` | 合作伙伴列表：生态合作伙伴 / SP/SI合作伙伴 | [partner.md](./references/products/partner.md) |
| `article` | 通报：已发布通报查询、详情、附件下载 | [article.md](./references/products/article.md) |
| `file` | 通用文件上传 / 下载 | [file.md](./references/products/file.md) |
| `knowledge` | 知识库：组织树、分类字典、新增知识库 | [knowledge.md](./references/products/knowledge.md) |

## 特殊命令

| 命令 | 用途 |
|------|------|
| `yulong schema` | 列出所有**已对当前用户开放**的命令（本地权限满足，或 `required_permissions` 为 `["all"]` 且 `match_mode` 为 `all`）；`required_permissions=[]` 一律视为未开放 |
| `yulong <cmd> --help` | 查看某个命令的用法 |

## 意图判断决策树

用户提到"御龙/信产/浙江信产/OA/浙江省公众信息产业有限公司/公众信息" 或相关系统名 → 进入御龙 Skill 意图判断
用户提到"登录/token/认证/重新登录" → `auth login`
用户提到"退出/登出" → `auth logout`
用户提到"登录状态/token 状态" → `auth status`
用户提到"刷新权限/更新权限/权限缓存" → `auth refresh-permissions`
用户提到"用户/人员/员工/查人" → `rbac user`
用户提到"用户列表/用户分页/列出用户" → `rbac user userPage`
用户提到"商机/商机列表/查商机/全量商机" → `project business`
用户提到"合同清单/签约清单/查合同/原合同" → `project origin-contract forward list`
用户提到"拆分前收入清单/拆分前的收入清单" → `project edaLabel beforeSplit`
用户提到"拆分后收入清单/拆分后的收入清单" → `project edaLabel afterSplit`
用户提到"收入清单"（未明确拆分前/后） → **必须追问用户确认是拆分前还是拆分后**
用户提到"合作伙伴/生态合作伙伴/SP/SI合作伙伴" → `project partner page`（生态 `type=1`，SP/SI `type=2`）
用户提到"合作伙伴"（未明确生态/SP/SI） → **必须追问用户确认是生态合作伙伴还是 SP/SI 合作伙伴**
用户提到"部门/大区/XX 大区 + 合作伙伴" → 先查 `project crmField dept`，再 `project partner page`；若部门字典中无匹配，必须追问用户确认
用户提到"通报/查通报" → `hr article findReportPage`
用户提到"查看通报 xxx" / "通报 xxx 详情" / "id 为 xxx 的通报" → `hr article detail <id>`
用户提到"下载通报附件" / "把附件发我" → 先 `hr article detail <id>`，再 `hr file download <fileId>`
用户提到"新闻/公告/通告/精选/研发运营速递" → 明确告知当前 Skill 仅支持通报，其他类型暂不提供
用户提到"知识库/新增知识库/发布知识库/添加知识库" → `hr knowledge addKnowledge`
用户提到"查知识库分类/知识库分类字典" → `hr knowledge classifyList`
用户提到"知识库分享范围/知识库组织树" → `hr knowledge getOrgTree`
用户提到"部门/大区/XX 大区 + 知识库" → 先查 `hr knowledge getOrgTree`，再 `hr knowledge addKnowledge`；若组织树中无匹配，必须追问用户确认
用户提到"部门/大区/XX 大区 + 拆分前收入清单" → 先查 `project crmField dept`，再 `project edaLabel beforeSplit`；若部门字典中无匹配，必须追问用户确认
用户提到"部门/大区/XX 大区 + 拆分后收入清单" → 先查 `project crmField dept`，再 `project edaLabel afterSplit`；若部门字典中无匹配，必须追问用户确认
用户提到"部门/大区/XX 大区 + 收入清单"（未明确拆分前/后） → 先追问拆分前/后，再查 `project crmField dept`，最后调用对应收入清单命令
用户提到"区域/XX 区域 + 拆分前收入清单" → 先查 `project crmField region`，再 `project edaLabel beforeSplit`
用户提到"区域/XX 区域 + 拆分后收入清单" → 先查 `project crmField region`，再 `project edaLabel afterSplit`
用户提到"客户属地/省/市 + 拆分前收入清单" → 先查 `project crmField province`，再 `project edaLabel beforeSplit`
用户提到"客户属地/省/市 + 拆分后收入清单" → 先查 `project crmField province`，再 `project edaLabel afterSplit`
用户提到"产品田/营销田总监/研发田 + 拆分前收入清单" → 先查对应字典，再 `project edaLabel beforeSplit`
用户提到"产品田/营销田总监/研发田 + 拆分后收入清单" → 先查对应字典，再 `project edaLabel afterSplit`
用户提到"部门/大区/XX 大区 + 合同/签约清单" → 先查 `project crmField dept`，再 `project origin-contract forward list`；若部门字典中无匹配，必须追问用户确认
用户提到"区域/XX 区域 + 商机" → 先查 `project crmField region`，再 `project business list`
用户提到"区域/XX 区域 + 合同/签约清单" → 先查 `project crmField region`，再 `project origin-contract forward list`
用户提到"客户属地/省/市 + 商机" → 先查 `project crmField province`，再 `project business list`
用户提到"客户属地/省/市 + 合同/签约清单" → 先查 `project crmField province`，再 `project origin-contract forward list`
用户提到"产品田/营销田总监 + 商机" → 先查对应 `project crmField ...`，再 `project business list`
用户提到"产品田/营销田总监/研发田 + 合同/签约清单" → 先查对应字典，再 `project origin-contract forward list`
用户提到"有哪些命令/能做什么" → `yulong schema`

更多细节见 [intent-guide.md](./references/intent-guide.md)。

> **注意**：用户说"XX 大区"通常想按**部门**筛选，但部门字典里的 `dname` 不一定就叫"XX 大区"（可能是"XX 事业部/产品部/营销中心"等），必须以 `project crmField dept` 的查询结果为准；找不到匹配时必须追问用户，禁止自动把"大区"当作"区域"。

## 危险操作确认

当前已登记的危险操作：

- `hr.knowledge.addKnowledge`：新增知识库，会向组织范围内发布内容

执行危险操作必须执行三步确认：

```
Step 1 → 展示操作摘要（操作类型 + 目标对象 + 影响范围）
Step 2 → 用户明确回复确认（如 "确认" / "好的"）
Step 3 → 加 --yes 执行命令
```

## 核心流程

1. **意图分类**：判断用户请求的核心动词/动作属于哪一类
2. **歧义处理与信息追问**：如果指令模糊或涉及多个模块，严禁猜测，必须追问澄清
3. **精准命令映射**：意图清晰后，参考产品总览和意图决策树选择命令
4. **执行**：构造正确的 `yulong` CLI 命令，必须带 `--format json`，解析 envelope 输出

## 命令发现

产品参考文档中的 flag 列表仅供参考，权威调用信息来自 CLI 本身：

```bash
# 列出所有命令
yulong schema --format json

# 查看某个命令用法
yulong rbac user userPage --help
```

## 错误处理

1. 遇到错误，加 `--verbose` 重试一次，查看 stderr 日志
2. 认证失败（`error.type === "auth_required"`）→ 执行 `yulong auth login --format json`，成功后重试原命令
3. 权限不足（`error.type === "permission_denied"`）→ 终止并说明缺失权限；如怀疑缓存过期，可先执行 `yulong auth refresh-permissions --format json` 刷新权限缓存后再试，仍然失败则执行 `yulong auth login --format json`
4. 后端业务错误（`error.type === "backend_error"`）→ 展示完整错误码和消息，禁止自行替代方案
5. 仍然失败，参考 [recovery-guide.md](./references/recovery-guide.md)

## 详细参考

- [references/products/rbac.md](./references/products/rbac.md) — RBAC 模块命令详细参考
- [references/products/partner.md](./references/products/partner.md) — 合作伙伴列表命令详细参考
- [references/products/article.md](./references/products/article.md) — 通报命令详细参考
- [references/products/file.md](./references/products/file.md) — 通用文件上传/下载详细参考
- [references/products/knowledge.md](./references/products/knowledge.md) — 知识库命令详细参考
- [references/intent-guide.md](./references/intent-guide.md) — 意图路由指南
- [references/global-reference.md](./references/global-reference.md) — 认证机制、全局 flag、输出格式
- [references/error-codes.md](./references/error-codes.md) — 错误码与调试流程
- [references/recovery-guide.md](./references/recovery-guide.md) — recovery 闭环规范
