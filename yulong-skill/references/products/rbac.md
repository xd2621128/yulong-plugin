# RBAC 模块命令参考

## 命令总览

| 命令 | 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|------|
| `rbac user userPage` | POST | `/rbac/user/userPage` | 用户分页查询 | ✅ 已实现 |
| `rbac user info` | — | — | 用户详情 | ⏳ 未实现 |
| `rbac user add` | — | — | 新增用户 | ⏳ 未实现 |
| `rbac user update` | — | — | 更新用户 | ⏳ 未实现 |
| `rbac user delete` | — | — | 删除用户 | ⏳ 未实现 |

## user (用户)

### 用户分页查询

```
Usage:
  yulong rbac user userPage --json '{"currentPage":1,"pageSize":10}'
Example:
  yulong rbac user userPage --json '{"currentPage":1,"pageSize":10}' --format json
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

## 意图映射

- "查询用户列表" / "用户分页" / "列出用户" → `rbac user userPage`
- "搜索用户" → `rbac user userPage` 并构造 `loginName` / `realName` 参数
- "用户详情" → `rbac user info`（未实现，需追问）

## 注意事项

- 该命令需要 `user` 权限，CLI 会先做本地权限预检
- 默认发送 `X-ResourceMark: user`
- 如需其他上下文，可显式覆盖 `--resource-mark`
