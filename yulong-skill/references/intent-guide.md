# 御龙 Skill 意图路由指南

御龙是浙江省公众信息产业有限公司的 OA 系统。当用户提到以下任一关键词时，应进入御龙 Skill：

- 御龙
- 浙江省公众信息产业有限公司 / 浙江信产 / 信产公司
- 浙江信产 OA / 公众信息 OA / 御龙 OA
- pubinfo-hr / pubinfo OA

## 当前支持的意图

| 用户说法 | 对应命令 | 说明 |
|---------|---------|------|
| "查询御龙用户列表" / "御龙用户分页" / "查一下御龙用户" / "列出御龙用户" | `yulong rbac user userPage` | 用户分页查询 |
| "御龙用户详情" / "查看某个御龙用户" | `yulong rbac user info` | 暂不可用，需先实现 |
| "御龙登录" / "重新登录御龙" / "获取御龙 token" | `yulong auth login` | 第三方登录 |
| "退出御龙" / "御龙登出" | `yulong auth logout` | 清除本地 token |
| "御龙登录状态" / "御龙 token 状态" | `yulong auth status` | 查看 token 是否有效 |
| "刷新御龙权限" / "更新权限缓存" / "御龙权限" | `yulong auth refresh-permissions` | 不重新登录，单独刷新权限缓存 |
| "御龙有哪些命令" / "御龙能做什么" | `yulong schema` | 命令发现 |
| "查询商机列表" / "查一下商机" / "列出所有商机" / "全量商机" | `yulong project business list` | 全量商机列表查询 |
| "按部门/大区查商机" / "XX 大区的商机" | 先 `project crmField dept`，再 `project business list` | 用户说"XX 大区"通常想按部门筛选，但实际部门名称不一定是"XX 大区"；必须在 dept 字典中匹配，找不到时追问用户 |
| "按区域查商机" / "XX 区域的商机" | 先 `project crmField region`，再 `project business list` | 区域是 region 字典，只有用户明确说"区域"时才走这条 |
| "按客户属地查商机" / "XX 省的商机" | 先 `project crmField province`，再 `project business list` | 客户属地是 areaId |
| "按产品田查商机" | 先 `project crmField productField`，再 `project business list` | 产品田是 productField |
| "按营销田总监查商机" | 先 `project crmField marketField`，再 `project business list` | marketLeader 是 majordomoId |
| "按时间查商机" / "XX 年的商机" | `yulong project business list` + 时间范围 | 按预签/转化/更新时间筛选 |
| "查询合同清单" / "查询签约清单" / "查一下合同" / "列出所有合同" / "原合同转发列表" | `yulong project origin-contract forward list` | "合同清单"与"签约清单"是同一命令 |
| "按部门/大区查合同清单" / "XX 大区的合同清单" / "XX 大区的签约清单" | 先 `project crmField dept`，再 `project origin-contract forward list` | 用户说"XX 大区"通常想按部门筛选，但实际部门名称不一定是"XX 大区"；必须在 dept 字典中匹配，找不到时追问用户 |
| "按区域查合同清单" / "XX 区域的合同清单" / "XX 区域的签约清单" | 先 `project crmField region`，再 `project origin-contract forward list` | 区域是 region 字典，只有用户明确说"区域"时才走这条 |
| "按客户属地查合同清单" / "XX 省的合同清单" / "XX 省的签约清单" | 先 `project crmField province`，再 `project origin-contract forward list` | 客户属地是 areaId |
| "按产品田查合同清单" / "按产品田查签约清单" | 先 `project crmField productField`，再 `project origin-contract forward list` | productField |
| "按营销田总监查合同清单" / "按营销田总监查签约清单" | 先 `project crmField marketField`，再 `project origin-contract forward list` | marketLeader 是 majordomoId |
| "按研发田查合同清单" / "按研发田查签约清单" | 先 `project system pm-index listRDField`，再 `project origin-contract forward list` | rdField |
| "按时间查合同清单" / "XX 年的合同清单" / "XX 年的签约清单" | `yulong project origin-contract forward list` + 时间范围 | 按归档时间筛选 |
| "查询拆分前收入清单" / "拆分前的收入清单" / "拆分前收入" | `yulong project edaLabel beforeSplit` | 明确指定拆分前 |
| "查询拆分后收入清单" / "拆分后的收入清单" / "拆分后收入" | `yulong project edaLabel afterSplit` | 明确指定拆分后 |
| "按部门/大区查拆分前收入清单" / "XX 大区的拆分前收入清单" | 先 `project crmField dept`，再 `project edaLabel beforeSplit` | 用户说"XX 大区"通常想按部门筛选，但实际部门名称不一定是"XX 大区"；必须在 dept 字典中匹配，找不到时追问用户 |
| "按部门/大区查拆分后收入清单" / "XX 大区的拆分后收入清单" | 先 `project crmField dept`，再 `project edaLabel afterSplit` | 用户说"XX 大区"通常想按部门筛选，但实际部门名称不一定是"XX 大区"；必须在 dept 字典中匹配，找不到时追问用户 |
| "按区域查拆分前收入清单" / "XX 区域的拆分前收入清单" | 先 `project crmField region`，再 `project edaLabel beforeSplit` | 区域是 region 字典 |
| "按区域查拆分后收入清单" / "XX 区域的拆分后收入清单" | 先 `project crmField region`，再 `project edaLabel afterSplit` | 区域是 region 字典 |
| "按客户属地查拆分前收入清单" / "XX 省的拆分前收入清单" | 先 `project crmField province`，再 `project edaLabel beforeSplit` | 客户属地是 areaId |
| "按客户属地查拆分后收入清单" / "XX 省的拆分后收入清单" | 先 `project crmField province`，再 `project edaLabel afterSplit` | 客户属地是 areaId |
| "按产品田查拆分前收入清单" / "按产品田查拆分后收入清单" | 先 `project crmField productField`，再对应收入清单命令 | productField |
| "按营销田总监查拆分前收入清单" / "按营销田总监查拆分后收入清单" | 先 `project crmField marketField`，再对应收入清单命令 | marketLeader 是 majordomoId |
| "按研发田查拆分前收入清单" / "按研发田查拆分后收入清单" | 先 `project system pm-index listRDField`，再对应收入清单命令 | rdField |
| "按时间查收入清单" / "XX 年 XX 月的拆分前收入清单" / "XX 年 XX 月的拆分后收入清单" | `project edaLabel beforeSplit/afterSplit` + `incomeTimeBegin/End` | 按收入月份筛选 |
| "收入清单"（未明确拆分前/后） | — | **必须追问用户确认是拆分前还是拆分后** |
| "查询合作伙伴列表" / "查合作伙伴" / "列出合作伙伴" / "生态合作伙伴" | `yulong project partner page` | 生态合作伙伴传 `type=1` |
| "SP/SI合作伙伴" / "查 SP/SI" / "SP/SI" | `yulong project partner page` | SP/SI 合作伙伴传 `type=2` |
| "按部门/大区查合作伙伴" / "XX 大区的合作伙伴" | 先 `project crmField dept`，再 `project partner page` | 用户说"XX 大区"通常想按部门筛选，但实际部门名称不一定是"XX 大区"；必须在 dept 字典中匹配，找不到时追问用户 |
| "按时间查合作伙伴" / "XX 年引入的合作伙伴" | `yulong project partner page` + `introduceTimeBegin/End` | 按引入时间筛选 |
| "合作伙伴变动" / "新增/退出合作伙伴统计" | `yulong project partner page` + 时间范围 + 本地分析 | 按 `partner.md` 中「统计与变动分析」处理 |
| "合作伙伴"（未明确生态/SP/SI） | — | **必须追问用户确认是生态合作伙伴还是 SP/SI 合作伙伴** |
| "通报列表" / "查通报" / "最近通报" | `yulong hr article findReportPage` | 默认按发布时间倒序查前 10 条 |
| "通告" | — | 明确告知当前 Skill 仅支持通报，不支持通告；如用户想查通报，请使用"通报"重新提问 |
| "查看通报 xxx" / "通报 xxx 详情" / "id 为 xxx 的通报" | `yulong hr article detail <id>` | id 从列表或用户话语中提取 |
| "下载通报附件" / "把附件发我" | `hr article detail <id>` → `hr file download <fileId>` | 先取 attachments 再逐个下载 |
| "按标题查通报" | `yulong hr article findReportPage` + `title` | 模糊匹配标题 |
| "按时间查通报" | `yulong hr article findReportPage` + `scopeStartTimeStr/scopeEndTimeStr` | 按发布时间范围筛选 |
| "新闻/公告/通告/精选/研发运营速递" | — | 明确告知当前 Skill 仅支持通报，其他类型暂不提供 |
| "新增知识库" / "发布知识库" / "添加知识库" | `yulong hr knowledge addKnowledge` | 危险操作，需二次确认；必填字段缺失时必须追问 |
| "知识库组织树" / "知识库分享范围" | `yulong hr knowledge getOrgTree` | 获取可选组织范围 |
| "知识库分类" / "知识库分类字典" | `yulong hr knowledge classifyList` | 模板下载 / 常见问题解答类型需要 |

## 决策树

```
用户请求
  ├─ 提到 "御龙/浙江信产/浙江省公众信息产业有限公司/pubinfo-hr/公众信息 OA/御龙 OA" → 进入御龙 Skill
  │    ├─ 提到 "登录/token/认证" → auth 子命令
  │    │    ├─ "退出/登出" → auth logout
  │    │    ├─ "状态" → auth status
  │    │    ├─ "刷新权限/更新权限" → auth refresh-permissions
  │    │    └─ 其他 → auth login
  │    ├─ 提到 "用户/人员/员工" → rbac user
  │    │    ├─ "列表/分页/查询/列出" → rbac user userPage
  │    │    ├─ "详情/查看/信息" → rbac user info（未实现，追问）
  │    │    └─ "新增/添加/删除/编辑" → 对应 action（未实现，告知）
  │    ├─ 提到 "商机/商机列表/查商机/全量商机" → project business
  │    │    ├─ 提到 "部门/大区/XX 大区" → 先 project crmField dept，再 project business list
  │    │    ├─ 提到 "区域/XX 区域" → 先 project crmField region，再 project business list
  │    │    ├─ 提到 "客户属地/省/市" → 先 project crmField province，再 project business list
  │    │    ├─ 提到 "产品田" → 先 project crmField productField，再 project business list
  │    │    ├─ 提到 "营销田总监" → 先 project crmField marketField，再 project business list
  │    │    ├─ 提到 "时间/年份/日期" → project business list + 时间范围
  │    │    └─ 其他 → project business list（追问具体筛选条件）
  │    ├─ 提到 "合同清单/签约清单/原合同" → project origin-contract forward list
  │    │    ├─ 提到 "部门/大区/XX 大区" → 先 project crmField dept，再 project origin-contract forward list
  │    │    ├─ 提到 "区域/XX 区域" → 先 project crmField region，再 project origin-contract forward list
  │    │    ├─ 提到 "客户属地/省/市" → 先 project crmField province，再 project origin-contract forward list
  │    │    ├─ 提到 "产品田" → 先 project crmField productField，再 project origin-contract forward list
  │    │    ├─ 提到 "营销田总监" → 先 project crmField marketField，再 project origin-contract forward list
  │    │    ├─ 提到 "研发田" → 先 project system pm-index listRDField，再 project origin-contract forward list
  │    │    ├─ 提到 "时间/年份/日期" → project origin-contract forward list + 时间范围
  │    │    └─ 其他 → project origin-contract forward list（追问具体筛选条件）
  │    ├─ 提到 "拆分前收入清单/拆分前收入" → project edaLabel beforeSplit
  │    │    ├─ 提到 "部门/大区/XX 大区" → 先 project crmField dept，再 project edaLabel beforeSplit
  │    │    ├─ 提到 "区域/XX 区域" → 先 project crmField region，再 project edaLabel beforeSplit
  │    │    ├─ 提到 "客户属地/省/市" → 先 project crmField province，再 project edaLabel beforeSplit
  │    │    ├─ 提到 "产品田" → 先 project crmField productField，再 project edaLabel beforeSplit
  │    │    ├─ 提到 "营销田总监" → 先 project crmField marketField，再 project edaLabel beforeSplit
  │    │    ├─ 提到 "研发田" → 先 project system pm-index listRDField，再 project edaLabel beforeSplit
  │    │    ├─ 提到 "时间/年份/日期/月份" → project edaLabel beforeSplit + incomeTime 范围
  │    │    └─ 其他 → project edaLabel beforeSplit（追问具体筛选条件）
  │    ├─ 提到 "拆分后收入清单/拆分后收入" → project edaLabel afterSplit
  │    │    ├─ 提到 "部门/大区/XX 大区" → 先 project crmField dept，再 project edaLabel afterSplit
  │    │    ├─ 提到 "区域/XX 区域" → 先 project crmField region，再 project edaLabel afterSplit
  │    │    ├─ 提到 "客户属地/省/市" → 先 project crmField province，再 project edaLabel afterSplit
  │    │    ├─ 提到 "产品田" → 先 project crmField productField，再 project edaLabel afterSplit
  │    │    ├─ 提到 "营销田总监" → 先 project crmField marketField，再 project edaLabel afterSplit
  │    │    ├─ 提到 "研发田" → 先 project system pm-index listRDField，再 project edaLabel afterSplit
  │    │    ├─ 提到 "时间/年份/日期/月份" → project edaLabel afterSplit + incomeTime 范围
  │    │    └─ 其他 → project edaLabel afterSplit（追问具体筛选条件）
  │    ├─ 提到 "收入清单/收入"（未明确拆分前/后） → 追问用户确认具体页签
  │    ├─ 提到 "合作伙伴/生态合作伙伴/SP/SI合作伙伴" → project partner page
  │    │    ├─ 提到 "部门/大区/XX 大区" → 先 project crmField dept，再 project partner page
  │    │    ├─ 提到 "时间/年份/日期/月份" → project partner page + introduceTime 范围
  │    │    ├─ 提到 "变动/新增/退出/统计" → project partner page + 时间范围 + 本地分析
  │    │    └─ 其他 → project partner page（追问具体筛选条件或确认页签）
  │    ├─ 提到 "合作伙伴"（未明确生态/SP/SI） → 追问用户确认具体页签
  │    ├─ 提到 "通报/查通报" → hr article findReportPage
  │    │    ├─ 提到 "查看/详情/id 为 xxx" → hr article detail <id>
  │    │    ├─ 提到 "下载附件" → hr article detail <id>，再 hr file download <fileId>
  │    │    ├─ 提到 "标题" → hr article findReportPage + title
  │    │    ├─ 提到 "时间/日期" → hr article findReportPage + scopeStartTimeStr/scopeEndTimeStr
  │    │    └─ 其他 → hr article findReportPage（追问具体筛选条件）
  │    ├─ 提到 "通告" → 明确告知当前 Skill 仅支持通报，不支持通告；如用户想查通报，请使用"通报"重新提问
  │    ├─ 提到 "新闻/公告/精选/研发运营速递" → 明确告知当前 Skill 仅支持通报，其他类型暂不提供
  │    ├─ 提到 "知识库/新增知识库/发布知识库/添加知识库" → hr knowledge addKnowledge
  │    │    ├─ 提到 "组织树/分享范围/范围" → hr knowledge getOrgTree
  │    │    ├─ 提到 "分类/分类字典" → hr knowledge classifyList
  │    │    ├─ 提到 "部门/大区/XX 大区" → 先 hr knowledge getOrgTree，再 hr knowledge addKnowledge；组织树中无匹配时必须追问
  │    │    └─ 其他 → 追问标题、类型、正文、分享范围等必填信息
  │    ├─ 提到 "命令/能做什么" → yulong schema
  │    └─ 其他 → 追问具体业务模块
  └─ 未提到御龙相关关键词 → 不触发本 Skill
```

## 易混淆场景

### "商机" 相关

- "商机列表" / "查一下商机" / "查商机" / "全量商机" → `project business list`
- "XX 大区的商机" → 先 `project crmField dept` 查部门 ID，再 `project business list`（用户说"XX 大区"通常想按部门筛选，但实际部门名称不一定是"XX 大区"；必须在 dept 字典中匹配，找不到时追问用户）
  - 若部门字典中找不到包含"XX"的部门，必须追问用户确认具体部门或是否指"XX 区域"
  - 禁止直接假设"大区"="区域"并去查 region 字典
- "XX 区域的商机" → 先 `project crmField region` 查区域 ID，再 `project business list`
- "XX 省/市的商机" → 先 `project crmField province` 查客户属地 ID，再 `project business list`
- "按产品田查商机" → 先 `project crmField productField`，再 `project business list`
- "按营销田总监查商机" → 先 `project crmField marketField`，再 `project business list`
- "按时间查商机" → `project business list` + 对应时间范围字段
- "商机详情" / "某个商机" → 暂不支持，需先确认是否有详情接口

### "合同/签约清单" 相关

- "合同清单" / "签约清单" / "查合同" / "原合同转发列表" → `project origin-contract forward list`
  - "合同清单"和"签约清单"是同一命令，不要当作两个功能
- "XX 大区的合同清单" / "XX 大区的签约清单" → 先 `project crmField dept` 查部门 ID，再 `project origin-contract forward list`（用户说"XX 大区"通常想按部门筛选，但实际部门名称不一定是"XX 大区"；必须在 dept 字典中匹配，找不到时追问用户）
  - 若部门字典中找不到包含"XX"的部门，必须追问用户确认具体部门或是否指"XX 区域"
  - 禁止直接假设"大区"="区域"并去查 region 字典
- "XX 区域的合同清单" / "XX 区域的签约清单" → 先 `project crmField region` 查区域 ID，再 `project origin-contract forward list`
- "XX 省/市的合同清单" / "XX 省/市的签约清单" → 先 `project crmField province` 查客户属地 ID，再 `project origin-contract forward list`
- "按产品田查合同清单" / "按产品田查签约清单" → 先 `project crmField productField`，再 `project origin-contract forward list`
- "按营销田总监查合同清单" / "按营销田总监查签约清单" → 先 `project crmField marketField`，再 `project origin-contract forward list`
- "按研发田查合同清单" / "按研发田查签约清单" → 先 `project system pm-index listRDField`，再 `project origin-contract forward list`
- "按时间查合同清单" / "按时间查签约清单" / "XX 年的合同清单" / "XX 年的签约清单" → `project origin-contract forward list` + 归档时间范围
- "合同详情" / "某个合同" → 暂不支持，需先确认是否有详情接口

### "收入清单" 相关

- "拆分前收入清单" / "拆分前的收入清单" / "拆分前收入" → `project edaLabel beforeSplit`
- "拆分后收入清单" / "拆分后的收入清单" / "拆分后收入" → `project edaLabel afterSplit`
- "XX 大区的拆分前收入清单" → 先 `project crmField dept` 查部门 ID，再 `project edaLabel beforeSplit`（用户说"XX 大区"通常想按部门筛选，但实际部门名称不一定是"XX 大区"；必须在 dept 字典中匹配，找不到时追问用户）
  - 若部门字典中找不到包含"XX"的部门，必须追问用户确认具体部门或是否指"XX 区域"
  - 禁止直接假设"大区"="区域"并去查 region 字典
- "XX 大区的拆分后收入清单" → 先 `project crmField dept` 查部门 ID，再 `project edaLabel afterSplit`（用户说"XX 大区"通常想按部门筛选，但实际部门名称不一定是"XX 大区"；必须在 dept 字典中匹配，找不到时追问用户）
  - 若部门字典中找不到包含"XX"的部门，必须追问用户确认具体部门或是否指"XX 区域"
- "XX 区域的拆分前收入清单" → 先 `project crmField region` 查区域 ID，再 `project edaLabel beforeSplit`
- "XX 区域的拆分后收入清单" → 先 `project crmField region` 查区域 ID，再 `project edaLabel afterSplit`
- "XX 省/市的拆分前收入清单" → 先 `project crmField province` 查客户属地 ID，再 `project edaLabel beforeSplit`
- "XX 省/市的拆分后收入清单" → 先 `project crmField province` 查客户属地 ID，再 `project edaLabel afterSplit`
- "按产品田查拆分前收入清单" / "按产品田查拆分后收入清单" → 先 `project crmField productField`，再对应收入清单命令
- "按营销田总监查拆分前收入清单" / "按营销田总监查拆分后收入清单" → 先 `project crmField marketField`，再对应收入清单命令
- "按研发田查拆分前收入清单" / "按研发田查拆分后收入清单" → 先 `project system pm-index listRDField`，再对应收入清单命令
- "按时间查收入清单" / "XX 年 XX 月的拆分前收入清单" / "XX 年 XX 月的拆分后收入清单" → `project edaLabel beforeSplit/afterSplit` + `incomeTimeBegin/End`
- "收入清单" / "查收入"（未明确拆分前/后） → **必须追问用户确认是拆分前还是拆分后**
- "收入数据核对" / "核对收入" → 暂不支持，需先确认是否开放 `project.edaLabel.dataCheck`

### "合作伙伴" 相关

- "生态合作伙伴" / "查生态合作伙伴" → `project partner page` + `type=1`
- "SP/SI合作伙伴" / "查 SP/SI" / "SP/SI" → `project partner page` + `type=2`
- "合作伙伴列表" / "查合作伙伴" / "列出合作伙伴" → `project partner page`（如未明确类型，需追问）
- "XX 大区的合作伙伴" → 先 `project crmField dept` 查部门 ID，再 `project partner page`（用户说"XX 大区"通常想按部门筛选，但实际部门名称不一定是"XX 大区"；必须在 dept 字典中匹配，找不到时追问用户）
  - 若部门字典中找不到包含"XX"的部门，必须追问用户确认具体部门
  - 禁止直接假设"大区"="区域"并去查 region 字典
- "按时间查合作伙伴" / "XX 年引入的合作伙伴" → `project partner page` + `introduceTimeBegin/End`
- "合作伙伴变动" / "新增/退出合作伙伴统计" → `project partner page` + 时间范围 + 本地分析
  - 新增：按 `introduceTimeBegin/End` 查询
  - 退出：API 无 `quitTime` 筛选，需拉取较大范围数据后本地过滤
  - `status` 字段为后端字符串，Agent 必须从实际响应中观察取值，禁止猜测
- "合作伙伴"（未明确生态/SP/SI） → **必须追问用户确认是生态合作伙伴还是 SP/SI 合作伙伴**
- "合作伙伴详情" / "某个合作伙伴" → 暂不支持，需先确认是否有详情接口

- "查用户列表" → `rbac user userPage`
- "我的信息" / "我是谁" → 暂不支持，需实现 `rbac user info` 或 `auth me`
- "用户权限" → 暂不支持，权限缓存由 CLI 内部管理

### "通报" 相关

- "通报列表" / "查通报" / "最近通报" → `hr article findReportPage`
- "通告" → 明确告知当前 Skill 仅支持通报，不支持通告；如用户想查通报，请使用"通报"重新提问
- "查看通报 xxx" / "通报 xxx 详情" / "id 为 xxx 的通报" → `hr article detail <id>`
- "下载通报附件" / "把附件发我" → 先 `hr article detail <id>` 取 `attachments`，再对每个附件 `hr file download <fileId>`（详见 [file.md](../products/file.md)）
- "按标题查通报" → `hr article findReportPage` + `title`
- "按时间查通报" → `hr article findReportPage` + `scopeStartTimeStr/scopeEndTimeStr`
- "新闻/公告/通告/精选/研发运营速递" → 明确告知当前 Skill 仅支持通报，其他类型暂不提供
- 正文 `content` 是 HTML，Agent 必须原样输出，禁止剥离字体、字号、颜色、图片等样式
- 通报（type=32）需要按红头公文样式 reconstruct：报头图片、通报编号、红色分隔线、标题、正文

### "知识库" 相关

- "新增知识库" / "发布知识库" / "添加知识库" → `hr knowledge addKnowledge`
  - 危险操作，必须先向用户展示摘要并取得明确确认，再加 `--yes` 执行
  - 必填字段（`title`、`type`、`content`、`scopeOrgId`）缺失时必须追问，禁止猜测
- "知识库组织树" / "知识库分享范围" → `hr knowledge getOrgTree`
- "知识库分类" / "知识库分类字典" → `hr knowledge classifyList`
  - 仅当 `type` 为 `16`（模板下载）或 `17`（常见问题解答）时才需要选择分类
- "XX 部门 / XX 大区的知识库" → 先 `hr knowledge getOrgTree` 匹配组织名称，再 `hr knowledge addKnowledge`
  - 组织树中找不到匹配时必须追问用户，禁止自动把"大区"当作其他筛选维度
- 知识库 `type` 取值：11-政策法规、12-公司文件、13-项目资料、14-行业知识、15-绩效考核、16-模板下载、17-常见问题解答、18-财务知识中心、19-产品大采购

### "登录" 相关

- "登录" → `auth login`
- "重新登录" → `auth login`
- "token 还有效吗" → `auth status`
- "退出" → `auth logout`
- "刷新权限" / "更新权限缓存" → `auth refresh-permissions`

## 信息缺失时的追问

当用户意图指向具体业务操作但缺少必要参数时，必须追问：

| 命令 | 缺失信息 | 追问示例 |
|------|---------|---------|
| `rbac user userPage` | 分页参数 | "请提供页码 currentPage 和每页条数 pageSize" |
| `rbac user info` | 用户 ID | "请提供要查询的用户 ID" |
| `project business list`（涉及部门/大区） | 部门名称 | "请提供具体部门/大区名称，我先查询对应 deptId；若部门字典中无匹配，会再向您确认" |
| `project business list`（涉及区域） | 区域名称 | "请提供具体区域名称，我先查询对应 regionId" |
| `project business list`（涉及客户属地） | 省/市/区 | "请提供具体客户属地，我先查询对应 areaId" |
| `project business list`（涉及产品田/营销田） | 产品田/营销田名称 | "请提供具体名称，我先查询对应字典 ID" |
| `project business list`（仅时间/关键字） | 分页参数、时间范围 | "请提供页码、每页条数，以及时间范围" |
| `project origin-contract forward list`（涉及部门/大区） | 部门名称 | "请提供具体部门/大区名称，我先查询对应 deptId；若部门字典中无匹配，会再向您确认" |
| `project origin-contract forward list`（涉及区域） | 区域名称 | "请提供具体区域名称，我先查询对应 regionId" |
| `project origin-contract forward list`（涉及客户属地） | 省/市/区 | "请提供具体客户属地，我先查询对应 areaId" |
| `project origin-contract forward list`（涉及产品田/营销田/研发田） | 产品田/营销田/研发田名称 | "请提供具体名称，我先查询对应字典 ID" |
| `project origin-contract forward list`（仅时间/关键字） | 分页参数、时间范围 | "请提供页码、每页条数，以及归档时间范围" |
| `project edaLabel beforeSplit` / `project edaLabel afterSplit`（涉及部门/大区） | 部门名称 + 页签确认 | "请确认是拆分前还是拆分后的收入清单，并提供具体部门/大区名称，我先查询对应 deptId" |
| `project edaLabel beforeSplit` / `project edaLabel afterSplit`（涉及区域） | 区域名称 + 页签确认 | "请确认是拆分前还是拆分后的收入清单，并提供具体区域名称，我先查询对应 regionId" |
| `project edaLabel beforeSplit` / `project edaLabel afterSplit`（涉及客户属地） | 省/市/区 + 页签确认 | "请确认是拆分前还是拆分后的收入清单，并提供具体客户属地，我先查询对应 areaId" |
| `project edaLabel beforeSplit` / `project edaLabel afterSplit`（涉及产品田/营销田/研发田） | 产品田/营销田/研发田名称 + 页签确认 | "请确认是拆分前还是拆分后的收入清单，并提供具体名称，我先查询对应字典 ID" |
| `project edaLabel beforeSplit` / `project edaLabel afterSplit`（仅时间/关键字） | 页签确认、分页参数、时间范围 | "请确认是拆分前还是拆分后的收入清单，并提供页码、每页条数以及收入月份范围" |
| `project partner page`（涉及部门/大区） | 页签确认、部门名称 | "请确认是生态合作伙伴还是 SP/SI 合作伙伴，并提供具体部门/大区名称，我先查询对应 deptId" |
| `project partner page`（仅时间/关键字/变动统计） | 页签确认、分页参数、时间范围 | "请确认是生态合作伙伴还是 SP/SI 合作伙伴，并提供页码、每页条数以及引入时间范围" |
| `project partner page`（统计变动） | 时间范围、页签确认 | "请确认是生态合作伙伴还是 SP/SI 合作伙伴，以及需要统计哪个时间范围的变动" |
| `hr article findReportPage` | 分页参数、筛选条件 | "请提供页码、每页条数，以及标题关键字或发布时间范围" |
| `hr article detail` | 文章 id | "请提供要查看的通报/文章 id" |
| `hr file download` | 文件 id / 附件 | "请提供附件 fileId，或先通过 hr article detail 获取 attachments" |
| `hr knowledge addKnowledge` | 标题、类型、正文、分享范围 | "请提供知识库标题、类型（如政策法规/公司文件等）、正文内容以及分享范围组织" |
| `hr knowledge addKnowledge`（模板下载/常见问题解答） | 分类 | "请提供分类名称，我先查询 classifyList 对应 code" |
| `hr knowledge addKnowledge`（涉及组织） | 组织名称 | "请提供具体组织名称，我先查询 getOrgTree 对应 orgNumId" |

## 长链路通用处理原则

长链路（如"通报 → 附件 → 知识库"）是多个单命令的组合，Skill 不会为每种组合预写专属流程。执行时必须遵守以下原则：

1. **拆分为已知单命令**：按依赖顺序调用已开放的 CLI 命令，不自行构造未经验证的组合路径。
2. **单点失败即停止**：任一中间步骤返回错误（尤其是 `backend_error` / 500）时，停止整条链路并向用户说明，禁止自动 fallback 或跳过失败步骤。
3. **附件跨模块必须重新上传**：从 A 模块迁移附件到 B 模块时，禁止直接复用原 `fileId` 或 `colRealpath`；必须先 `hr.file.download` 到本地，再 `hr.file.upload` 重新上传获取新 `fileId`。
4. **歧义必须追问**：遇到占位日期（如"20xx年xx月"）、模糊时间范围（如"最早到去年十月"）、批量选择、合并/分条目标未明确时，必须向用户澄清，禁止猜测。
5. **危险操作遵循确认流程**：长链路中若包含 `hr.knowledge.addKnowledge` 等危险命令，必须展示摘要、取得用户明确确认、加 `--yes` 后再执行。

> Skill 文档重点维护单命令语义和少量通用模式（附件处理、字典查询、危险操作确认），由 LLM 根据具体提示词组合成长链路。

## 不支持的请求

若用户请求对应的功能尚未实现或未在 `yulong schema` 中出现：
1. 明确告知该功能暂未实现
2. 可提供当前已支持的命令列表
3. 禁止猜测参数或构造未验证的命令
