/**
 * 命令级常用参数说明
 *
 * 用于 `--help` 输出。这里只放最常用、最容易出错的字段；
 * 完整字段以实际后端接口和 Skill 参考文档为准。
 */
export interface CommandParam {
  name: string;
  type: string;
  desc: string;
}

export const COMMAND_PARAMS: Record<string, CommandParam[]> = {
  'project.business.list': [
    { name: 'currentPage', type: 'number', desc: '页码，从 1 开始' },
    { name: 'pageSize', type: 'number', desc: '每页条数，建议不超过 100' },
    { name: 'keyword', type: 'string', desc: '关键字查询（商机名称/编码/客户名等）' },
    { name: 'depId', type: 'string[]', desc: '部门 ID 集合，需先调用 project crmField dept 查询' },
    { name: 'regionId', type: 'number', desc: '区域 ID（-1 表示空），需先调用 project crmField region 查询' },
    { name: 'areaId', type: 'string', desc: '客户属地叶子节点 ID，多个以英文逗号拼接（-1 表示空），需先调用 project crmField province 查询' },
    { name: 'productField', type: 'number[]', desc: '产品田叶子 ID 集合（-1 表示空），需先调用 project crmField productField 查询' },
    { name: 'marketLeader', type: 'string', desc: '营销田总监 ID（majordomoId，-1 表示空），需先调用 project crmField marketField 查询' },
    { name: 'businessType', type: 'number', desc: '商机类别：1-项目型商机 2-阿里云商机 3-运营型商机 4-原子能力型商机 5-SM型商机 6-其他账套商机' },
    { name: 'sendOrderStatus', type: 'number', desc: '派单状态：1-已接单 2-未接单 3-待指派 4-未派单' },
    { name: 'businessCategory', type: 'number', desc: '商机类型：1-产品类 2-集成类 3-空' },
    { name: 'businessLevel', type: 'number', desc: '商机级别：1-A级 2-B级 3-C级 4-空' },
    { name: 'businessProcess', type: 'number', desc: '商机阶段：501-考察建议 502-方案立项 503-财政评审 504-招投标' },
    { name: 'status', type: 'number[]', desc: '商机状态：2000-新增 2001-推进 2002-赢单' },
    { name: 'customerType', type: 'number', desc: '客户类型：0-空 1-民营上市/IPO企业 2-黑名单客商' },
    { name: 'customerCategory', type: 'number', desc: '客户类别：1-头部客户 2-蓝海客户 3-其他' },
    { name: 'origin', type: 'number', desc: '来源：-1-空 41-电信 42-渠道 45-自有' },
    { name: 'belong', type: 'number', desc: '项目归属：-1-空 11-省外项目（省级） 12-省外项目（市级） 21-省内项目（省级） 22-省内项目（市级） 23-省内项目（区县）' },
    { name: 'isScience', type: 'number', desc: '是否科创项目：-1-空 0-否 1-是' },
    { name: 'isSoftware', type: 'number', desc: '是否含软件开发：-1-空 0-否 1-是' },
    { name: 'isDestruction', type: 'number', desc: '是否解构：-1-空 0-否 1-是' },
    { name: 'midCheckStatus', type: 'number', desc: '中台把关状态：-1-空 0-中台未把关 1-中台已把关' },
    { name: 'isPredictValuable', type: 'number', desc: '是否预估有效：-1-空 0-否 1-是' },
    { name: 'riskAssessment', type: 'number', desc: '是否风险评估：0-否 1-是' },
    { name: 'whetherBid', type: 'number', desc: '是否投标：-1-空 0-否 1-是' },
    { name: 'bidResult', type: 'number', desc: '投标结果：-1-空 1-中标 2-未中标 3-流标 4-废标 5-未投标' },
    { name: 'bidDateBegin', type: 'string', desc: '投标时间开始（YYYY-MM-DD）' },
    { name: 'bidDateEnd', type: 'string', desc: '投标时间结束（YYYY-MM-DD）' },
    { name: 'preSignDateBegin', type: 'string', desc: '预签日期开始（YYYY-MM-DD）' },
    { name: 'preSignDateEnd', type: 'string', desc: '预签日期结束（YYYY-MM-DD）' },
    { name: 'createTimeBegin', type: 'string', desc: '转化时间开始（YYYY-MM-DD）' },
    { name: 'createTimeEnd', type: 'string', desc: '转化时间结束（YYYY-MM-DD）' },
    { name: 'maintainTimeBegin', type: 'string', desc: '维护时间开始（YYYY-MM-DD）' },
    { name: 'maintainTimeEnd', type: 'string', desc: '维护时间结束（YYYY-MM-DD）' },
    { name: 'interactTimeBegin', type: 'string', desc: '客触时间开始（YYYY-MM-DD）' },
    { name: 'interactTimeEnd', type: 'string', desc: '客触时间结束（YYYY-MM-DD）' },
    { name: 'updateTimeBegin', type: 'string', desc: '更新时间开始（YYYY-MM-DD）' },
    { name: 'updateTimeEnd', type: 'string', desc: '更新时间结束（YYYY-MM-DD）' },
    { name: 'winOrderTimeBegin', type: 'string', desc: '赢单时间开始（YYYY-MM-DD）' },
    { name: 'winOrderTimeEnd', type: 'string', desc: '赢单时间结束（YYYY-MM-DD）' },
    { name: 'outerMainBegin', type: 'number', desc: '外部主营金额开始' },
    { name: 'outerMainEnd', type: 'number', desc: '外部主营金额结束' },
    { name: 'preGrossBegin', type: 'number', desc: '预估毛利率开始（%）' },
    { name: 'preGrossEnd', type: 'number', desc: '预估毛利率结束（%）' },
    { name: 'isCostEstimate', type: 'number', desc: '是否已成本概算：0-未概算 1-已概算' },
    { name: 'productFieldStatus', type: 'number', desc: '产品田审批状态：1-待审批 2-审批退回 3-审批通过' },
    { name: 'levelProcessStatus', type: 'number', desc: '项目定级审批状态：1-待审批 2-修改通过 3-审批通过' },
    { name: 'sortField', type: 'string', desc: '排序字段' },
    { name: 'sort', type: 'boolean', desc: '排序方向：true 升序，false 降序' },
  ],
  'project.edaLabel.beforeSplit': [
    { name: 'currentPage', type: 'number', desc: '页码，从 1 开始' },
    { name: 'pageSize', type: 'number', desc: '每页条数，建议不超过 100' },
    { name: 'keyword', type: 'string', desc: '关键字查询（项目编号/名称/合同编号/商机编码/客户名等）' },
    { name: 'depId', type: 'string[]', desc: '部门 ID 集合，需先调用 project crmField dept 查询' },
    { name: 'regionId', type: 'number', desc: '区域 ID（-1 表示空），需先调用 project crmField region 查询' },
    { name: 'areaId', type: 'string', desc: '客户属地叶子节点 ID，多个以英文逗号拼接（-1 表示空），需先调用 project crmField province 查询' },
    { name: 'productField', type: 'number[]', desc: '产品田叶子 ID 集合（-1 表示空），需先调用 project crmField productField 查询' },
    { name: 'rdField', type: 'number[]', desc: '研发田 ID 集合（-1 表示空），需先调用 project system pm-index listRDField 查询' },
    { name: 'marketLeader', type: 'string', desc: '营销田总监 ID（majordomoId，-1 表示空），需先调用 project crmField marketField 查询' },
    { name: 'incomeTimeBegin', type: 'string', desc: '收入月份开始；后端按日期/日期时间解析，建议 YYYY-MM-DD' },
    { name: 'incomeTimeEnd', type: 'string', desc: '收入月份结束；后端按日期/日期时间解析，建议 YYYY-MM-DD' },
    { name: 'incomeType', type: 'number', desc: '收入类型（前端枚举，直接传值）：1-代收代付 2-内部其他 3-内部主营 4-弱电施工 5-外部其他 6-外部主营' },
    { name: 'edaType', type: 'number[]', desc: 'EDA 类型（前端 dict store）：1-信产账套 2-数智账套 3-天翼账套 4-无线账套 5-云技术账套 6-原子能力账套 7-合作分成 8-优化项目' },
    { name: 'contractYear', type: 'number', desc: '合同年份（YYYY）' },
    { name: 'state', type: 'number[]', desc: '属性（前端枚举，直接传值）：-1-空 0-增量本地 1-增量异地 2-存量本地 3-存量异地' },
    { name: 'sortField', type: 'string', desc: '排序字段' },
    { name: 'sort', type: 'boolean', desc: '排序方向：true 升序，false 降序' },
  ],
  'project.edaLabel.afterSplit': [
    { name: 'currentPage', type: 'number', desc: '页码，从 1 开始' },
    { name: 'pageSize', type: 'number', desc: '每页条数，建议不超过 100' },
    { name: 'keyword', type: 'string', desc: '关键字查询（项目编号/名称/合同编号/商机编码/客户名等）' },
    { name: 'depId', type: 'string[]', desc: '部门 ID 集合，需先调用 project crmField dept 查询' },
    { name: 'regionId', type: 'number', desc: '区域 ID（-1 表示空），需先调用 project crmField region 查询' },
    { name: 'areaId', type: 'string', desc: '客户属地叶子节点 ID，多个以英文逗号拼接（-1 表示空），需先调用 project crmField province 查询' },
    { name: 'productField', type: 'number[]', desc: '产品田叶子 ID 集合（-1 表示空），需先调用 project crmField productField 查询' },
    { name: 'rdField', type: 'number[]', desc: '研发田 ID 集合（-1 表示空），需先调用 project system pm-index listRDField 查询' },
    { name: 'marketLeader', type: 'string', desc: '营销田总监 ID（majordomoId，-1 表示空），需先调用 project crmField marketField 查询' },
    { name: 'incomeTimeBegin', type: 'string', desc: '收入月份开始；后端按日期/日期时间解析，建议 YYYY-MM-DD' },
    { name: 'incomeTimeEnd', type: 'string', desc: '收入月份结束；后端按日期/日期时间解析，建议 YYYY-MM-DD' },
    { name: 'incomeType', type: 'number', desc: '收入类型（前端枚举，直接传值）：1-代收代付 2-内部其他 3-内部主营 4-弱电施工 5-外部其他 6-外部主营' },
    { name: 'edaType', type: 'number[]', desc: 'EDA 类型（前端 dict store）：1-信产账套 2-数智账套 3-天翼账套 4-无线账套 5-云技术账套 6-原子能力账套 7-合作分成 8-优化项目' },
    { name: 'contractYear', type: 'number', desc: '合同年份（YYYY）' },
    { name: 'state', type: 'number[]', desc: '属性（前端枚举，直接传值）：-1-空 0-增量本地 1-增量异地 2-存量本地 3-存量异地' },
    { name: 'sortField', type: 'string', desc: '排序字段' },
    { name: 'sort', type: 'boolean', desc: '排序方向：true 升序，false 降序' },
  ],
  'project.partner.page': [
    { name: 'currentPage', type: 'number', desc: '页码，从 1 开始' },
    { name: 'pageSize', type: 'number', desc: '每页条数，建议不超过 100' },
    { name: 'keyword', type: 'string', desc: '关键字查询（合作伙伴名称）' },
    { name: 'type', type: 'number', desc: '合作伙伴类型：1-生态合作伙伴 2-SP/SI合作伙伴' },
    { name: 'deptId', type: 'string[]', desc: '引入部门 ID 集合，需先调用 project crmField dept 查询' },
    { name: 'introduceTimeBegin', type: 'string', desc: '引入时间开始（YYYY-MM）' },
    { name: 'introduceTimeEnd', type: 'string', desc: '引入时间结束（YYYY-MM）' },
    { name: 'sortField', type: 'string', desc: '排序字段：introduceTime / quitTime' },
    { name: 'sort', type: 'boolean', desc: '排序方向：true 升序，false 降序' },
    { name: 'doSearchTotal', type: 'boolean', desc: '是否查询总数（可选，默认由后端决定）' },
  ],
  'hr.article.findReportPage': [
    { name: 'currentPage', type: 'number', desc: '页码，从 1 开始' },
    { name: 'pageSize', type: 'number', desc: '每页条数，建议不超过 100' },
    { name: 'doSearchTotal', type: 'boolean', desc: '是否查询总数（可选）' },
    { name: 'title', type: 'string', desc: '标题关键字（模糊查询）' },
    { name: 'status', type: 'string', desc: '状态：1-已拟稿 2-审批中 3-已发布 4-已退回 5-已作废 6-已下线' },
    { name: 'scopeStartTimeStr', type: 'string', desc: '发布开始时间（YYYY-MM-DD）' },
    { name: 'scopeEndTimeStr', type: 'string', desc: '发布结束时间（YYYY-MM-DD）' },
    { name: 'top', type: 'boolean', desc: '是否置顶' },
    { name: 'expressTop', type: 'boolean', desc: '是否研发运营速递' },
  ],
  'hr.article.detail': [
    { name: 'id', type: 'string', desc: '通报/文章 id（必填，作为路径参数）' },
  ],
  'hr.file.download': [
    { name: 'id', type: 'string', desc: '文件 id（附件 colRealpath 的最后一段，或 fileId）' },
  ],
  'hr.file.upload': [
    { name: '--file', type: 'string', desc: '要上传的本地文件路径（必填）' },
  ],
  'hr.file.upload.return.attachment': [
    { name: '--file', type: 'string', desc: '要上传的本地文件路径（必填）' },
  ],
  'hr.knowledge.getOrgTree': [],
  'hr.knowledge.classifyList': [],
  'hr.knowledge.addKnowledge': [
    { name: 'title', type: 'string', desc: '知识库标题（必填，1-40 字）' },
    { name: 'type', type: 'number', desc: '知识库类型：11-政策法规 12-公司文件 13-项目资料 14-行业知识 15-绩效考核 16-模板下载 17-常见问题解答 18-财务知识中心 19-产品大采购' },
    { name: 'content', type: 'string', desc: '正文内容（必填，HTML 字符串）' },
    { name: 'scopeOrgId', type: 'string', desc: '分享范围，多个组织 orgNumId 用英文逗号拼接（必填，需先调用 hr.knowledge.getOrgTree 查询）' },
    { name: 'classification', type: 'number', desc: '分类 code（模板下载/常见问题解答类型必填，需先调用 hr.knowledge.classifyList 查询）' },
    { name: 'attachments', type: 'string', desc: '附件 JSON 字符串，格式 [{"colName":"文件名","colRealpath":"/pubinfo-hr/hr/file/download/{fileId}"}]' },
  ],
  'rbac.user.userPage': [
    { name: 'currentPage', type: 'number', desc: '页码，从 1 开始' },
    { name: 'pageSize', type: 'number', desc: '每页条数，建议不超过 100' },
    { name: 'keyword', type: 'string', desc: '用户名/工号/手机号等关键字' },
    { name: 'orgId', type: 'string', desc: '组织 ID' },
    { name: 'status', type: 'number', desc: '用户状态' },
  ],
  'hr.employee.addressBook': [
    { name: 'pageNum', type: 'number', desc: '页码，从 1 开始（默认 1）' },
    { name: 'pageSize', type: 'number', desc: '每页条数，建议不超过 100' },
    { name: 'name', type: 'string', desc: '姓名/ID 模糊搜索' },
    { name: 'deptNo', type: 'string', desc: '部门编号，从 hr.dept.getDeptTree 节点中获取' },
    { name: 'deptType', type: 'number', desc: '部门类型：0-公司，1-部门，2-二级部门；与 deptNo 配套使用，须从 hr.dept.getDeptTree 节点原样传入' },
    { name: 'isContractType', type: 'number', desc: '是否是合同制：1-是 2-否' },
  ],
  'hr.dept.getDeptTree': [
    { name: 'isAll', type: 'number', desc: '传 1 表示按通讯录数据权限拉取全部可见部门' },
    { name: 'name', type: 'string', desc: '按部门名称模糊搜索' },
    { name: 'firstLevelDept', type: 'boolean', desc: '是否只返回一级部门' },
  ],
  'hr.dept.listCompany': [],
  'hr.dept.getBusinessLine': [],
  'hr.dept.list': [
    { name: 'companyId', type: 'string', desc: '公司 id，从 hr.dept.listCompany 返回的 deptId 获取' },
    { name: 'dname', type: 'string', desc: '部门名称模糊搜索' },
    { name: 'leaderName', type: 'string', desc: '按部门经理姓名筛选' },
    { name: 'subLeaderName', type: 'string', desc: '按分管领导姓名筛选' },
    { name: 'businessLine', type: 'string', desc: '按业务线筛选，取值来自 hr.dept.getBusinessLine' },
    { name: 'leaderId', type: 'string', desc: '按部门经理 id 筛选' },
    { name: 'deptIdList', type: 'string[]', desc: '部门 id 集合，批量查询指定部门' },
  ],
  'hr.dept.detail': [
    { name: 'deptId', type: 'string', desc: '一级部门 id（必填，query 参数）' },
  ],
  'hr.dept.subDeptDetail': [
    { name: 'deptId', type: 'string', desc: '子部门 id（必填，query 参数）' },
  ],
  'hr.dept.judgeDel': [
    { name: 'deptId', type: 'string', desc: '部门 id（必填，query 参数）；返回 true 表示可删除（仅校验部门人数，不校验子部门）' },
  ],
  'hr.dept.add': [
    { name: 'deptName', type: 'string', desc: '部门名称（必填，最长 128 字）' },
    { name: 'leaderId', type: 'string', desc: '部门经理 id（必填，从 hr.public.getUserList 获取）' },
    { name: 'leaderName', type: 'string', desc: '部门经理姓名' },
    { name: 'parentId', type: 'string', desc: '上级部门/公司 id，从 hr.dept.listCompany 或 hr.dept.list 获取' },
    { name: 'parentName', type: 'string', desc: '上级部门/公司名称' },
    { name: 'nickName', type: 'string', desc: '部门简称' },
    { name: 'businessLine', type: 'string', desc: '所属业务线，取值来自 hr.dept.getBusinessLine' },
    { name: 'subLeaderId', type: 'string', desc: '分管领导 id' },
    { name: 'subLeaderName', type: 'string', desc: '分管领导姓名' },
    { name: 'deputyLeaders', type: 'array', desc: '部门副职列表，格式 [{"id":"用户id","name":"姓名"}]' },
    { name: 'deptSynthesis', type: 'array', desc: '部门综合列表，格式同 deputyLeaders' },
    { name: 'assistants', type: 'array', desc: '部门助理列表，格式同 deputyLeaders' },
    { name: 'establishTime', type: 'string', desc: '部门成立时间（YYYY-MM-DD）' },
    { name: 'deptIntro', type: 'string', desc: '部门介绍' },
  ],
  'hr.dept.edit': [
    { name: 'deptId', type: 'string', desc: '部门 id（必填，从 hr.dept.list 获取）' },
    { name: 'deptName', type: 'string', desc: '部门名称（必填）' },
    { name: 'leaderId', type: 'string', desc: '部门经理 id（必填）' },
    { name: 'leaderName', type: 'string', desc: '部门经理姓名' },
    { name: 'parentId', type: 'string', desc: '上级部门/公司 id' },
    { name: 'nickName', type: 'string', desc: '部门简称' },
    { name: 'businessLine', type: 'string', desc: '所属业务线' },
    { name: 'deptIntro', type: 'string', desc: '部门介绍' },
  ],
  'hr.dept.addSubDept': [
    { name: 'parentId', type: 'string', desc: '上级一级部门 id（必填，从 hr.dept.list 获取）' },
    { name: 'parentName', type: 'string', desc: '上级一级部门名称' },
    { name: 'dname', type: 'string', desc: '子部门名称（必填）' },
    { name: 'leaderId', type: 'string', desc: '子部门负责人 id（必填，从 hr.public.getUserList 获取）' },
    { name: 'leaderName', type: 'string', desc: '子部门负责人姓名' },
    { name: 'deptIntro', type: 'string', desc: '子部门介绍' },
    { name: 'members', type: 'array', desc: '成员列表，格式 [{"id":"用户id","name":"姓名"}]' },
  ],
  'hr.dept.editSubDept': [
    { name: 'deptId', type: 'string', desc: '子部门 id（必填）' },
    { name: 'parentId', type: 'string', desc: '上级一级部门 id' },
    { name: 'dname', type: 'string', desc: '子部门名称（必填）' },
    { name: 'leaderId', type: 'string', desc: '子部门负责人 id（必填）' },
    { name: 'leaderName', type: 'string', desc: '子部门负责人姓名' },
    { name: 'deptIntro', type: 'string', desc: '子部门介绍' },
  ],
  'hr.dept.del': [
    { name: 'deptId', type: 'string', desc: '部门 id（必填）；删除前先调 hr.dept.judgeDel 确认可删' },
  ],
  'hr.dept.hideDept': [
    { name: 'deptId', type: 'string', desc: '部门 id（必填）' },
    { name: 'isHide', type: 'number', desc: '1-隐藏 2-显示（必填）' },
  ],
  'hr.dept.editDeptSort': [
    { name: 'deptSort', type: 'array', desc: '排序列表（必填），格式 [{"deptId":"部门id"}]；数组顺序即新顺序（sortNum 字段会被后端忽略），须覆盖同一上级下的全部兄弟部门' },
  ],
  'hr.dept.export': [
    { name: 'companyId', type: 'string', desc: '公司 id，从 hr.dept.listCompany 获取' },
    { name: 'dname', type: 'string', desc: '部门名称模糊搜索' },
    { name: 'leaderName', type: 'string', desc: '按部门经理姓名筛选' },
    { name: 'businessLine', type: 'string', desc: '按业务线筛选' },
  ],
  'hr.dept.addOrUpdateBusinessLine': [
    { name: 'id', type: 'number', desc: '业务线 id；不传表示新增，传了表示编辑' },
    { name: 'name', type: 'string', desc: '业务线名称（必填）' },
  ],
  'hr.dept.removeBusinessLine': [
    { name: 'id', type: 'number', desc: '业务线 id（必填，从 hr.dept.getBusinessLine 获取）' },
  ],
  'hr.public.getUserList': [
    { name: 'name', type: 'string', desc: '姓名模糊搜索，传空字符串返回全部' },
    { name: 'deptId', type: 'string', desc: '按部门 id 过滤' },
    { name: 'companyId', type: 'string', desc: '按公司 id 过滤' },
  ],
  'project.origin-contract.forward.list': [
    { name: 'currentPage', type: 'number', desc: '页码，从 1 开始' },
    { name: 'pageSize', type: 'number', desc: '每页条数，建议不超过 100' },
    { name: 'keyword', type: 'string', desc: '关键字查询（合同名称/编号/客户名等）' },
    { name: 'depId', type: 'string[]', desc: '部门 ID 集合，需先调用 project crmField dept 查询' },
    { name: 'regionId', type: 'number', desc: '区域 ID，需先调用 project crmField region 查询' },
    { name: 'areaId', type: 'string', desc: '客户属地叶子节点 ID，多个以英文逗号拼接，需先调用 project crmField province 查询' },
    { name: 'productField', type: 'number[]', desc: '产品田叶子 ID 集合，需先调用 project crmField productField 查询' },
    { name: 'rdField', type: 'number[]', desc: '研发田 ID 集合，需先调用 project system pm-index listRDField 查询' },
    { name: 'marketLeader', type: 'string', desc: '营销田总监 ID（majordomoId），需先调用 project crmField marketField 查询' },
    { name: 'archiveTimeBegin', type: 'string', desc: '归档时间开始（YYYY-MM-DD）' },
    { name: 'archiveTimeEnd', type: 'string', desc: '归档时间结束（YYYY-MM-DD）' },
    { name: 'signType', type: 'number', desc: '签约类型（前端枚举，直接传值）：0-合同 1-框架 2-数智 3-天翼 4-PO订单 5-SM项目 6-原子能力' },
    { name: 'dataType', type: 'number', desc: '类别（前端枚举，直接传值）：1-信产 2-天翼 3-数智 4-无线 5-信产分公司 6-SM 7-无合同立项 8-原子能力 9-PO订单' },
    { name: 'isSplit', type: 'number', desc: '拆分状态（前端枚举，直接传值）：0-未拆分 1-已拆分' },
    { name: 'sortField', type: 'string', desc: '排序字段' },
    { name: 'sort', type: 'boolean', desc: '排序方向：true 升序，false 降序' },
  ],
  'project.crmField.query': [
    { name: 'field', type: 'string', desc: '字段 code，可选值：clue_scene/belong_domain/possess_method/income_type/project_origin/business_process/industry/project_belong；可直接作为位置参数传入' },
  ],
};

export function getCommandParams(commandName: string): CommandParam[] | undefined {
  return COMMAND_PARAMS[commandName];
}

/**
 * 命令级真实参数示例
 *
 * 用于 --help 输出。若存在则覆盖通用占位示例。
 */
const COMMAND_EXAMPLES: Record<string, string> = {
  'hr.knowledge.addKnowledge': '{"title":"知识库标题","type":12,"content":"正文内容","scopeOrgId":"1793907438427492353"}',
};

export function getCommandExample(commandName: string): string | undefined {
  return COMMAND_EXAMPLES[commandName];
}
