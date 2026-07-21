# RBAC 模块命令参考

RBAC（Role-Based Access Control）模块提供御龙系统的用户、角色、组织和权限查询能力。本 Skill 当前主要开放用户分页查询能力与通讯录查询能力。

## 命令总览

| 命令 | 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|------|
| `yulong rbac user userPage` | POST | `/rbac/user/userPage` | 用户分页查询 | ✅ 已实现 |
| `yulong hr dept getDeptTree` | POST | `/hr/dept/getDeptTree` | 拉取组织树（通讯录左侧部门树） | ✅ 已实现 |
| `yulong hr employee addressBook` | POST | `/hr/employee/addressBook` | 通讯录人员列表 | ✅ 已实现 |

## user (用户)

### 权限与请求头

- 本地权限预检：`["unclaimed-business", "user"]`，满足**任意一个**即可
- 请求头：默认自动带上 `X-ResourceMark: user`
- 如用户无上述任一权限，CLI 会直接返回 `permission_denied`，不会调用后端

### 用户分页查询

```bash
# 基础分页
yulong rbac user userPage --json '{"currentPage":1,"pageSize":10}' --format json

# 按登录名精确匹配
yulong rbac user userPage --json '{"currentPage":1,"pageSize":10,"loginName":"xfh"}' --format json

# 按真实姓名精确匹配
yulong rbac user userPage --json '{"currentPage":1,"pageSize":10,"realName":"徐富华"}' --format json

# 按组织过滤
yulong rbac user userPage --json '{"currentPage":1,"pageSize":10,"orgId":"ae6475ff-019d-4f23-adfc-66ae6ebff5a2"}' --format json
```

参数（对应后端 `/rbac/user/userPage` 实际字段 `PubUserQueryDto`）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `currentPage` | number | 否 | 当前页码，从 1 开始（默认 1） |
| `pageSize` | number | 否 | 每页条数（默认 10） |
| `doSearchTotal` | boolean | 否 | 是否查询总条数（默认 true） |
| `orgId` | string | 否 | 组织 id，按组织过滤 |
| `loginName` | string | 否 | 登录账号，精确匹配 |
| `realName` | string | 否 | 真实姓名，精确匹配 |
| `enable` | boolean | 否 | 是否启用 |
| `showIsCollect` | boolean | 否 | 是否显示收藏标记，默认 false |

> 注意：后端实际接收的字段是 `currentPage` / `pageSize`。传入 `page` / `size` 会被忽略。
> 接口没有通用 `keyword` 字段；如需搜索，使用 `loginName` 或 `realName`。

返回值（节选）：

```json
{
  "ok": true,
  "data": {
    "currentPage": 1,
    "pageSize": 10,
    "total": 1798,
    "records": [
      {
        "id": "20826",
        "loginName": "xfh",
        "realName": "徐富华",
        "mobile": "13372522201",
        "email": "18905719098@189.cn",
        "enable": true,
        "userOrgList": [
          {
            "orgId": "ae6475ff-019d-4f23-adfc-66ae6ebff5a2",
            "orgName": "研发部",
            "main": true
          }
        ]
      }
    ]
  }
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 用户主键 id |
| `loginName` | string | 登录账号 |
| `realName` | string | 真实姓名 |
| `mobile` | string | 手机号 |
| `email` | string | 邮箱 |
| `enable` | boolean | 是否启用 |
| `userOrgList` | array | 用户所属组织列表 |
| `userOrgList[].orgId` | string | 组织 id |
| `userOrgList[].orgName` | string | 组织名称 |
| `userOrgList[].main` | boolean | 是否主组织 |

## 意图映射

- "查询用户列表" / "用户分页" / "列出用户" → `yulong rbac user userPage`
- "搜索用户" → `yulong rbac user userPage` 并构造 `loginName` / `realName` 参数

## 错误处理

| 错误 | 原因 | 恢复动作 |
|---|---|---|
| `permission_denied` | 用户缺少 `unclaimed-business` 和 `user` 任一权限 | 终止操作，说明缺失权限 |
| `backend_error` / 400 | 参数格式错误，如 `currentPage` 传了字符串 | 检查参数类型，参考 `--help` |
| 返回空列表 | 筛选条件过严或 `orgId` 无效 | 放宽条件或确认 orgId 正确 |

## 注意事项

- 该命令需要 `unclaimed-business` 或 `user` 任一权限，CLI 会先做本地权限预检
- 默认发送 `X-ResourceMark: user`
- 如需其他上下文，可显式覆盖 `--resource-mark`
- 单次 `pageSize` 建议不超过 100

## 通讯录

通讯录页面由两部分组成：左侧组织树 + 右侧人员列表。对应 CLI 命令 `yulong hr dept getDeptTree` 和 `yulong hr employee addressBook`。

### 组织树

```bash
# 拉取通讯录可见的组织树
yulong hr dept getDeptTree --json '{"isAll":1}' --format json
```

参数：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `isAll` | number | 否 | 传 `1` 表示按通讯录数据权限拉取全部可见部门 |
| `name` | string | 否 | 按部门名称模糊搜索 |
| `firstLevelDept` | boolean | 否 | 是否只返回一级部门 |

权限要求：`["all"]` 且 `match_mode = 'all'`，表示任意已登录用户均可访问。

返回值：树形部门数组，节点字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `deptId` | string | 部门 id |
| `deptName` | string | 部门名称 |
| `deptNo` | string | 部门编号（UUID），传给通讯录查询用 |
| `deptNum` | number | 部门人数 |
| `deptType` | number | 部门类型：0-公司，1-部门，2-二级部门 |
| `children` | array | 子部门树 |

### 人员列表

```bash
# 查全公司通讯录（第一页）
yulong hr employee addressBook --json '{"pageNum":1,"pageSize":10}' --format json

# 按部门查（deptNo / deptType 须从 getDeptTree 节点原样传入）
yulong hr employee addressBook --json '{"pageNum":1,"pageSize":10,"deptNo":"532a5198-2b2c-4b9f-9c16-86c8c04b1820","deptType":1}' --format json

# 按二级/三级子部门查（deptType 通常为 2）
yulong hr employee addressBook --json '{"pageNum":1,"pageSize":10,"deptNo":"2031895180279717889","deptType":2}' --format json

# 按姓名搜索
yulong hr employee addressBook --json '{"pageNum":1,"pageSize":10,"name":"张"}' --format json
```

参数：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `pageNum` | number | 否 | 页码，从 1 开始（默认 1） |
| `pageSize` | number | 否 | 每页条数（默认 10） |
| `name` | string | 否 | 姓名/ID 模糊搜索 |
| `deptNo` | string | 否 | 部门编号，从 `hr.dept.getDeptTree` 节点 `deptNo` 获取 |
| `deptType` | number | 否 | 部门类型：0-公司，1-部门，2-二级部门；与 `deptNo` 配套使用，须从 `hr.dept.getDeptTree` 节点原样传入 |
| `isContractType` | number | 否 | 是否是合同制：1-是 2-否 |

> 注意：
> - 后端分页字段是 `pageNum` / `pageSize`，不是 `currentPage` / `pageSize`。
> - 按部门查询时，`deptNo` 和 `deptType` 必须同时传入，且都从 `hr.dept.getDeptTree` 返回的对应节点原样取值，不可省略或自行推断。

请求头：本命令默认发送 `X-ResourceMark: addressbook`（由 `api_permissions.resource_mark` 配置）。

权限要求：`["addressbook"]`，满足**任意一个**即可。

返回值：

```json
{
  "ok": true,
  "data": {
    "current": 1,
    "size": 10,
    "total": 1159,
    "pages": 116,
    "records": [
      {
        "employeeId": "15820335",
        "name": "叶刚跃",
        "positionName": "党委书记/信产公司总经理",
        "mobile": "仅归属部门可见",
        "email": "ygy.zj@chinatelecom.cn",
        "deptNo": "0acf4821-2b76-404d-8c45-b99d4ccbe548",
        "deptName": "公司领导",
        "sex": "男"
      }
    ]
  }
}
```

响应字段说明：

| 字段 | 类型 | 说明 |
|------|------|------|
| `employeeId` | string | 员工 id |
| `name` | string | 姓名 |
| `positionName` | string | 岗位名称 |
| `mobile` | string | 手机号，可能脱敏为"仅归属部门可见" |
| `email` | string | 邮箱 |
| `deptNo` | string | 部门编号 |
| `deptName` | string | 部门名称 |
| `sex` | string | 性别 |

### 意图映射

- "查通讯录" / "通讯录" / "查同事" / "找某人" → 先 `getDeptTree` 取组织树，再按需 `addressBook`
- "XX 部门的通讯录" / "XX 部门有哪些人" / "XX 科室有哪些人" → 在 `getDeptTree` 返回的组织树中匹配部门，取节点中的 `deptNo` 和 `deptType` 一并传入 `addressBook`
- "找叫 XXX 的人" / "搜索 XXX" → 直接用 `addressBook` 的 `name` 参数

### 错误处理

| 错误 | 原因 | 恢复动作 |
|---|---|---|
| `permission_denied` | 缺少 `addressbook` 权限 | 终止操作，说明缺失权限 |
| `backend_error` / `-1` | 必填参数缺失或格式错误 | 检查是否传了 `pageNum`/`pageSize`，`deptNo` 是否为字符串 |
| 返回空列表 | 部门下无人或姓名无匹配 | 放宽搜索条件或确认部门编号 |
