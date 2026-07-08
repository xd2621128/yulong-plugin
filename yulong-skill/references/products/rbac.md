# RBAC 模块命令参考

RBAC（Role-Based Access Control）模块提供御龙系统的用户、角色、组织和权限查询能力。本 Skill 当前主要开放用户分页查询能力。

## 命令总览

| 命令 | 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|------|
| `rbac user userPage` | POST | `/rbac/user/userPage` | 用户分页查询 | ✅ 已实现 |
| `rbac user info` | — | — | 用户详情 | ⏳ 未实现 |
| `rbac user add` | — | — | 新增用户 | ⏳ 未实现 |
| `rbac user update` | — | — | 更新用户 | ⏳ 未实现 |
| `rbac user delete` | — | — | 删除用户 | ⏳ 未实现 |

## 权限要求

- 本地权限预检：`["unclaimed-business", "user"]`，满足**任意一个**即可
- 请求头：默认自动带上 `X-ResourceMark: user`
- 如用户无上述任一权限，CLI 会直接返回 `permission_denied`，不会调用后端

## user (用户)

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

- "查询用户列表" / "用户分页" / "列出用户" → `rbac user userPage`
- "搜索用户" → `rbac user userPage` 并构造 `loginName` / `realName` 参数
- "用户详情" → `rbac user info`（未实现，需追问）

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
