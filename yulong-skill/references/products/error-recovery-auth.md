# Auth 模块错误恢复

## CLI 错误类型

| `error.type` | 触发场景 | 恢复动作 |
|---|---|---|
| `auth_required` | token 过期、缺失、自动重登失败 | **本地模式**：执行 `yulong auth login --format json`，成功后重试原命令；**Token 模式**：向上游报告 token 失效，禁止执行 `auth login` |
| `permission_denied` | 缺少执行认证命令的权限 | 终止操作，说明缺失权限；本地模式下可尝试 `yulong auth refresh-permissions --format json` 后重试 |
| `backend_error` | 后端返回非 0 业务错误码 | 展示完整 `code` 和 `msg`，禁止自行替代方案 |
| `config_error` | 缺少 baseUrl、用户数据库路径等配置 | 检查 `config.json` / `config.local.json` / 环境变量 |

## 后端错误码

| 后端码 | 前端定义 | 含义 | 恢复动作 |
|---|---|---|---|
| `0` | `SUCCESS` | 成功 | 正常返回 `data` |
| `-1` | `ERROR` | 运行异常 | 展示完整错误信息，加 `--verbose` 查看 stderr，必要时人工排查 |
| `4` | `BUSINESS_ERROR` | 操作失败，业务异常 | 展示完整 `code` 和 `msg`，不猜测、不绕过 |
| `400001001` | `ACCOUNT_LOCKED` | 账户锁定，请联系管理员 | 告知用户联系管理员解锁账户 |
| `400001002` | `LOGINNAME_PASSWORD_WRONG` | 登录名或密码不正确 | 本地模式：提示用户检查御小龙登录状态或重新登录；Token 模式：由上游重新提供 token |
| `400001003` | `ACCOUT_NOT_ENABLE` | 账户未启用，请联系管理员 | 告知用户联系管理员启用账户 |
| `400001004` | `LOGIN_TOKEN_INVALID` | 刷新 refreshToken 已过期 | CLI 会尝试自动重登，失败则返回 `auth_required` |
| `400001006` | `ACCESS_TOKEN_INVALID` | token 已过期 | CLI 会尝试自动刷新，失败则返回 `auth_required` |
| `400001007` | `UNAUTHORIZED_ACCESS` | 访问未授权 | 返回 `permission_denied`，终止操作 |
| `400002001` | `CODE_OVERTIME` | 验证码失效 | 重新获取验证码 |
| `400002002` | `CODE_WRONG` | 验证码不匹配 | 提示用户重新输入验证码 |
| `400003001` | `CHANGE_INIT_PASSWORD` | 首次登录，请修改初始密码 | 引导用户到前端修改初始密码 |
| `400003002` | `PASSWORD_EXPIRED` | 登录密码已过期，请修改密码 | 引导用户到前端修改密码 |

## 常见现象

| 现象 | 可能原因 | 恢复动作 |
|---|---|---|
| `yulong auth login` 无响应或卡死 | 需要用户交互但前台执行阻塞 | 参考 `yulong-shared` 中的认证流程，必要时后台执行 |
| `auth status` 返回未登录 | token 已失效或从未登录 | 本地模式执行 `auth login`；Token 模式请求上游重新注入 token |
| `auth refresh-permissions` 失败 | token 失效或网络问题 | 先检查 `auth status`，再决定重新登录或检查网络 |

## 参考

- [`yulong-shared/SKILL.md`](../../yulong-shared/SKILL.md) — 认证模式与错误处理通则
- [global-reference.md](../global-reference.md) — 认证机制、全局 flag、输出格式
- [error-codes.md](../error-codes.md) — 全局错误类型
- [recovery-guide.md](../recovery-guide.md) — recovery 闭环规范
