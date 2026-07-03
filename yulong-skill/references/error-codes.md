# 御龙 CLI 错误码与处理

## 错误类型（ErrorType）

CLI 统一 envelope 的 `error.type` 字段取值如下：

| 类型 | 触发场景 | Skill 处理方式 |
|------|---------|---------------|
| `auth_required` | token 过期、缺失、自动重登失败 | 本地模式：提示执行 `yulong auth login --format json`；Token 模式：向上游报告 token 失效，禁止执行 `auth login` |
| `permission_denied` | Skill/CLI 权限预检失败或后端返回 `400001007` | 终止操作，说明缺失权限，不发送到后端 |
| `backend_error` | 后端返回非 0 业务错误码 | 展示完整 `code` 和 `msg`，禁止自行尝试替代方案 |
| `network_error` | HTTP 超时、连接失败、DNS 错误 | 建议检查 `YULONG_BASE_URL` 和网络，加 `--verbose` 重试 |
| `config_error` | 缺少 baseUrl、用户数据库路径等配置 | 提示检查 `config.json` / `config.local.json` / 环境变量 |
| `validation_error` | 命令格式错误、JSON 参数解析失败 | 提示正确用法，参考 `yulong <cmd> --help` |
| `unknown_error` | 未分类错误 | 加 `--verbose` 重试，仍然失败则完整报告 |

## 后端错误码映射

| 后端码 | 含义 | CLI 处理 |
|--------|------|---------|
| `0` | 成功 | 正常返回 `data` |
| `400001004` | refreshToken / accessToken 过期 | 先尝试 refresh，refresh 失败则自动重登，再失败返回 `auth_required` |
| `400001006` | accessToken 过期（历史码，后端实际与 400001004 混用） | 同 400001004 |
| `400001007` | 访问未授权 | 返回 `permission_denied` |
| `400001001` | 账户锁定 | 返回 `backend_error` |
| `400001003` | 账户未启用 | 返回 `backend_error` |
| `-1` | 运行异常 | 返回 `backend_error` |
| `4` | 业务异常 | 返回 `backend_error` |

## 调试流程

1. 遇到错误，先用 `--verbose` 重试一次，查看 stderr 日志
2. 认证失败：
   - 检查 `yulong auth status --format json`
   - 若未登录 → `yulong auth login --format json`
   - 若登录仍失败 → 检查 `YULONG_BASE_URL` 和后端连通性
3. 权限不足：
   - 查看 `yulong schema --format json` 确认命令所需权限
   - 确认当前用户拥有相应权限
4. 后端业务错误：
   - 记录完整 `code`、`msg`、`hint`
   - 不猜测、不绕过，向用户报告
5. 网络错误：
   - 检查 `YULONG_BASE_URL` 是否可达
   - 检查 `--timeout` 是否需要调大

## 禁止行为

- 遇到 `auth_required` 时，不要用假 token 或绕过认证
- 遇到 `permission_denied` 时，不要尝试其他接口绕过
- 遇到 `backend_error` 时，不要自行构造请求重试
