# 御龙 Skill 模拟提示词测试报告

> 测试时间：2026-06-30  
> 修复时间：2026-06-30（问题 1、2、3 已修复）  
> 测试方式：以 `yulong-skill` 的 `SKILL.md` / `intent-guide.md` / 产品参考文档为行为基准，手动模拟用户提示词并执行对应 `yulong` CLI 命令，验证 Skill 意图路由、参数构造、后端调用结果是否符合预期。  
> 环境：`yulong-cli` v0.1.0（最新编译二进制已部署到 `~/.local/lib/yulong/yulong`），`~/.config/yulong/config.local.json` 中显式指定了绝对 `userDbPath`，token 已刷新且有效。

---

## 一、测试覆盖概览

| 维度 | 覆盖情况 |
|------|----------|
| 触发词与命令发现 | ✅ `御龙有哪些命令` → `yulong schema` |
| 认证相关 | ✅ `auth status` / `auth login` / `--json-file -` |
| 单意图查询 | ✅ 用户/商机/合同/收入/合作伙伴/通报/知识库 |
| 长意图（多条件） | ✅ 西北大区 + 2025-12 + 商机/收入/合同 |
| 多意图关联 | ✅ 通报列表 → 详情 → 附件下载；合作伙伴新增/退出统计 |
| 超长链路（通报 → 知识库） | ⚠️ 列表/详情正常，附件下载 500 中断，且存在多处歧义 |
| 歧义追问（手动判定） | ⚠️ 文档已规定，未通过自动 agent 验证 |
| 不支持请求 | ⚠️ 新闻/公告/通告、用户详情等按文档应明确拒绝 |
| 危险操作确认 | ⚠️ `hr.knowledge.addKnowledge` 仅做了 dry-run |
| 错误恢复 | ⚠️ 未触发 token 过期 / 权限不足场景 |

---

## 二、用例执行结果

### 2.1 基础命令可用性

| # | 用户提示词（模拟） | 期望命令 | 实际结果 | 结论 |
|---|-------------------|---------|---------|------|
| 1 | 御龙有哪些命令 | `yulong schema` | 返回 22 条已开放命令 | ✅ 通过 |
| 2 | 御龙登录状态 | `yulong auth status` | `authenticated`，token 有效 | ✅ 通过 |
| 3 | 查御龙用户列表 | `rbac user userPage` | total=1798，返回第一页 | ✅ 通过 |
| 4 | 查御龙商机 | `project business list` | total=8957 | ✅ 通过 |
| 5 | 查签约清单 | `project origin-contract forward list` | total=15362 | ✅ 通过 |
| 6 | 最近通报 | `hr article findReportPage` | total=8 | ✅ 通过 |
| 7 | 查生态合作伙伴 | `project partner page type=1` | total=384 | ✅ 通过 |
| 8 | 查 SP/SI 合作伙伴 | `project partner page type=2` | total=15 | ✅ 通过 |
| 9 | 查拆分前收入清单 | `project edaLabel beforeSplit` | total=10312 | ✅ 通过 |
| 10 | 查拆分后收入清单 | `project edaLabel afterSplit` | total=10312 | ✅ 通过 |

### 2.2 字典查询与按维度过滤

| # | 用户提示词（模拟） | 关键步骤 | 实际结果 | 结论 |
|---|-------------------|---------|---------|------|
| 11 | 西北大区的商机 | `crmField dept` → `business list` | 匹配到 `西北大区营销中心`，total=58 | ✅ 通过 |
| 12 | 西北区域的商机 | `crmField region` → `business list` | regionId=111，total=340 | ✅ 通过 |
| 13 | 浙江省的商机 | `crmField province` → `business list` | areaId=330000，total=5918 | ✅ 通过 |
| 14 | 按产品田查商机 | `crmField productField` → `business list` | productField=9571，total=51 | ✅ 通过 |
| 15 | 按营销田总监查商机 | `crmField marketField` → `business list` | marketLeader=12814896，total=81 | ✅ 通过 |
| 16 | 按研发田查合同 | `system pm-index listRDField` → `contract list` | rdField=9767，total=0 | ✅ 通过 |
| 17 | 西北大区 2025-12 签约清单 | `crmField dept` → `contract list` | total=14 | ✅ 通过 |
| 18 | 西北大区 2025-12 拆分前收入 | `crmField dept` → `edaLabel beforeSplit` | total=41 | ✅ 通过（需使用 `YYYY-MM-DD` 时间格式） |
| 19 | 系统集成事业部 2026 Q1 生态合作伙伴 | `crmField dept` → `partner page` | total=18 | ✅ 通过 |

### 2.3 多意图关联

| # | 用户提示词（模拟） | 关键步骤 | 实际结果 | 结论 |
|---|-------------------|---------|---------|------|
| 20 | 查最近通报，然后下载第一个通报的附件 | `findReportPage` → `detail` → `file download` | 列表/详情正常；`hr file download <fileId>` 返回 `[500] 文件下载失败` | ❌ 附件下载链路异常 |
| 21 | 统计 2026 Q1 生态合作伙伴变动 | `partner page`（introduceTime 范围）+ 本地过滤 quitTime | 新增 18 家；退出 0 家 | ✅ 通过 |
| 22 | 帮我查西北大区 2025 年 12 月的商机，再查同月的拆分前收入清单 | `business list` + `edaLabel beforeSplit` | 商机 58 条；收入 41 条 | ✅ 通过 |

### 2.4 歧义与不支持

| # | 用户提示词（模拟） | Skill 期望行为 | 实际可验证点 | 结论 |
|---|-------------------|---------------|-------------|------|
| 23 | 查收入清单 | 追问拆分前/后 | 仅意图判断，未执行命令 | ⚠️ 需 agent 语义验证 |
| 24 | 查合作伙伴 | 追问生态/SP/SI | 仅意图判断，未执行命令 | ⚠️ 需 agent 语义验证 |
| 25 | 查公告 / 新闻 / 研发运营速递 | 明确告知仅支持通报 | 仅意图判断，未执行命令 | ⚠️ 需 agent 语义验证 |
| 26 | 查华北区域的商机（ dept 字典无匹配） | 追问用户确认具体部门/区域 | `crmField dept` 查无 "华北" | ✅ 字典行为支持正确追问 |
| 27 | 新增知识库（缺少标题/类型/正文/范围） | 追问必填字段 | dry-run 可验证参数构造 | ⚠️ 需 agent 语义验证 |
| 28 | rbac role list 等未开放命令 | 禁止构造调用 | CLI 返回 `validation_error`：未找到路径映射 | ✅ CLI 已阻断 |

### 2.5 超长链路：通报导出并上传知识库

| # | 用户提示词（模拟） | 关键步骤 | 实际结果 | 结论 |
|---|-------------------|---------|---------|------|
| 29 | 通报里，《关于20xx年xx月项目动态跟踪情况的通报》，所有文本包括附件（最早到去年十月）需导出并传到知识库 | `findReportPage` → `detail` → `file download` → `knowledge addKnowledge` | 按标题关键字"项目动态跟踪"命中 4 条通报；详情/正文可正常获取；`hr file download` 仍返回 `[500] 文件下载失败`；知识库目标参数（标题/类型/范围/分类）均未提供 | ❌ 附件下载 500 导致链路中断；同时存在多处意图歧义 |

---

## 三、发现的问题

### 3.1 🔴 省份字典字段名与文档不符

- **文档**：`project crmField province` 返回 `{name, id}` 树，`areaId` 按 `name` 匹配。
- **实际**：返回字段是 `value`（如 `"浙江省"`），顶层节点的 `name` 为 `null`。
- **影响**：按 `name` 匹配省份/城市的 Skill 流程会失败，必须改为按 `value` 匹配。
- **复现**：`yulong project crmField province --format json`

### 3.2 🔴 收入清单时间格式与文档不符

- **文档**：`incomeTimeBegin/End` 格式为 `YYYY-MM`（如 `"2025-12"`）。
- **实际**：传 `YYYY-MM` 会返回 `[400] body数据格式不正确，无法完成序列化`；传 `YYYY-MM-DD` 才正常。
- **影响**：按文档构造的收入清单查询会 400。
- **复现**：`yulong project edaLabel beforeSplit --json '{"incomeTimeBegin":"2025-12","incomeTimeEnd":"2025-12"}'`

### 3.3 🔴 通报附件下载失败

- **命令**：`yulong hr file download <fileId>`
- **实际**：权限检查通过，但后端返回 `[500] 文件下载失败`。
- **影响**：“下载通报附件”这一完整 Skill 链路实际不可用。
- **复现**：取任意通报详情中的 `attachments` fileId 调用下载。

### 3.4 🟡 知识库 `scopeOrgId` 容易误用 `id`

- `hr knowledge getOrgTree` 每条组织同时返回 `id`（UUID）和 `orgNumId`（数字字符串）。
- `hr knowledge addKnowledge` 的 `scopeOrgId` 要求传 `orgNumId`。
- **风险**：Skill 在组织树中匹配到部门后，可能误把 `id` 当作 `scopeOrgId` 传入，导致发布范围错误。
- **建议**：在 `knowledge.md` 中加粗强调 `scopeOrgId = orgNumId`，并在示例中展示如何正确取值。

### 3.5 🟡 `hr.knowledge.addKnowledge` 帮助示例不具代表性

- `yulong hr knowledge addKnowledge --help` 的示例仍使用 `{"currentPage":1,"pageSize":10}`，不是真实必填参数示例。
- **建议**：将示例改为 `{"title":"...","type":12,"content":"...","scopeOrgId":"..."}`。

### 3.6 🟡 未登录 / 权限不足 / token 过期场景未实际验证

- 当前用户权限较多（830 个），未触发 `permission_denied`。
- token 已刷新，未验证 `auth_required` 自动重登流程。
- 这些属于 Skill 错误恢复规范的关键路径，建议后续专门构造场景验证。

### 3.7 🟡 无法直接对 Skill 层自动 agent 进行端到端语义测试

- 调用 `/yulong-skill` 技能后，当前 harness 仅回显了 Skill 指令文件，没有产生自动 agent 响应。
- 因此本次测试采用“按 Skill 指令手动执行 CLI”的方式，无法 100% 验证 LLM 的追问措辞、多轮上下文、字段提取等语义行为。
- 建议后续接入 Skill 的 runtime 测试（如通过 MCP server 或 Claude Code 的 skill runner）进行自动回归。

### 3.8 🔴 超长链路中追问点与阻塞点

- **提示词中的"20xx年xx月"是占位符**：实际搜索到 4 条不同月份的《关于 202X 年 X 月项目动态跟踪情况的通报》。Skill 必须追问用户具体指哪一期，禁止把全部结果默认当成目标。
- **"最早到去年十月"语义不明**：
  - 若指**发布时间范围**（`scopeStartTimeStr/scopeEndTimeStr`），则"去年十月"应为 `2025-10-01` 起；当前 4 条通报的 `scopeTime` 均在范围内。
  - 若指**报告内容统计周期**，则无法通过现有列表接口直接过滤，需要用户明确。
- **跨模块附件禁止直接复用**：从通报等模块迁移附件到知识库时，不能直接复用原 `fileId`/`colRealpath`，必须下载到本地后重新上传。当前因 `hr.file.download` 500，该步骤无法完成。
- **未明确合并还是分条入库**：4 期通报+附件是合成一条知识库，还是一期一条？目标标题、类型、分享范围、分类均未给出，Skill 必须逐项追问。
- **附件下载仍阻塞**：`hr file download <fileId>` 返回 `[500] 文件下载失败`，导致"导出附件并传到知识库"这一关键步骤无法完成。

---

## 四、改进建议

1. **修正 `income.md` 时间格式**：将 `incomeTimeBegin/End` 示例和说明改为 `YYYY-MM-DD`。
2. **修正 province 字典描述**：将 `{name, id}` 改为 `{value, id}`，并说明按 `value` 匹配省/市/区。
3. **修复或定位 `hr.file.download` 500 问题**：检查 CLI 二进制 base64 处理或后端文件存储服务。
4. **强化 `knowledge.md` 组织匹配说明**：明确 `scopeOrgId` 必须取 `orgNumId`，而非树节点 `id`。
5. **优化 CLI 命令级 help 示例**：对 `addKnowledge` 等危险/必填命令给出真实示例。
6. **补充自动回归测试**：
   - 将本次测试用例脚本化（Bash + jq），纳入 `bun test` 或 CI。
   - 增加对 400 / 401 / 403 / 500 返回码的断言。
   - 增加对字典字段名、时间格式等易变点的断言。
7. **考虑 province 字典顶层 `name` 为 null 的处理**：CLI 或 Skill 在展示/匹配时是否应回退到 `value`。
8. **在 `intent-guide.md` 增加「长链路通用处理原则」**：明确拆分为单命令、单点失败即停止、附件跨模块必须重新上传、歧义追问、危险操作确认等原则，避免为每种链路写专属文档。
9. **修正 `file.md` / `knowledge.md` 附件复用描述**：明确跨模块迁移附件必须下载后重新上传，禁止直接复用原 `fileId`/`colRealpath`。

---

## 六、修复记录

- ✅ 问题 1（收入清单时间格式）：已修改 `income.md` 与 `command-params.ts`，`incomeTimeBegin/End` 统一为 `YYYY-MM-DD`。
- ✅ 问题 2（省份字典字段名）：已修改 `business.md`、`contract.md`、`income.md` 中 `project crmField province` 的描述，明确树节点字段为 `value`（地区名称）和 `id`。
- ✅ 问题 3（knowledge help 示例 / scopeOrgId）：
  - CLI `hr.knowledge.addKnowledge --help` 示例已改为真实必填参数示例。
  - `knowledge.md` 已加粗说明 `scopeOrgId` 必须取 `orgNumId`，禁止误用树节点 `id`。
- ✅ 长链路通用处理原则：已在 `intent-guide.md` 增加「长链路通用处理原则」，明确拆分执行、单点失败停止、附件跨模块必须重新上传、歧义追问、危险操作确认等规则。
- ✅ 跨模块附件复用规则：已在 `file.md` / `knowledge.md` 明确，从 A 模块迁移附件到 B 模块时必须下载到本地后重新上传，禁止直接复用原 `fileId`/`colRealpath`。

---

## 七、结论

- **核心单意图与长意图命令均可正常执行**：商机、合同、收入、合作伙伴、通报列表、用户查询、字典查询等路径验证通过。
- **两条关键链路存在明确缺陷**：
  1. 收入清单时间格式文档与后端不一致，会导致查询失败。
  2. 通报附件下载返回 500，完整下载链路不通。
- **两处文档/字段映射存在隐患**：省份字典 `value` vs `name`、知识库 `scopeOrgId` vs `orgNumId`。
- 本次超长链路测试（通报 → 附件 → 知识库）进一步暴露：`hr.file.download` 500 问题仍是跨模块链路的最大阻塞点；同时占位符日期、模糊时间范围、批量目标选择等都需要 Skill 具备清晰的追问策略。
- 建议在修复上述问题后，补充自动化的 Skill runtime 回归测试，以覆盖 LLM 语义层行为。
