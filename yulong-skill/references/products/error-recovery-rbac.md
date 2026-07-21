# RBAC 模块错误恢复

## CLI 错误类型

| `error.type` | 触发场景 | 恢复动作 |
|---|---|---|
| `auth_required` | token 过期 | 按 [`yulong-shared`](../../yulong-shared/SKILL.md) 处理：本地模式 `auth login`，Token 模式上报上游 |
| `permission_denied` | 缺少 `unclaimed-business` 或 `user` 权限 | 终止操作，说明缺失权限 |
| `backend_error` | 后端返回非 0 业务错误码 | 展示完整 `code` 和 `msg`，禁止自行替代方案 |
| `validation_error` | JSON 参数格式错误 | 参考 `yulong rbac user userPage --help` 检查参数 |

## 后端错误码

| 后端码 | 含义 | 恢复动作 |
|---|---|---|
| `0` | 成功 | 正常返回 `data` |
| `-1` | 运行异常 | 加 `--verbose` 重试，仍然失败则人工排查 |
| `4` | 业务异常 | 展示完整 `code` 和 `msg` |
| `400001004` / `400001006` | token 过期 | CLI 自动刷新/重登，失败则 `auth_required` |
| `400001007` | 访问未授权 | 返回 `permission_denied` |

## 常见现象

| 现象 | 可能原因 | 恢复动作 |
|---|---|---|
| 返回 `permission_denied` | 用户缺少 `unclaimed-business` 和 `user` 任一权限 | 终止并说明缺失权限 |
| 部门管理命令返回 `permission_denied` | 缺少 `department` / `department_add` / `department_show` 权限 | 终止并说明缺失权限；本地模式可先 `auth refresh-permissions` |
| 提示"命令 xxx 尚未开放" | 该命令未配置权限要求，属于未开放命令 | 换用 `yulong schema` 中已开放的命令，禁止自行构造调用 |
| 部门写操作返回 `-1 运行异常` | 必填字段缺失（多为 `leaderId` 未传） | 对照 [department.md](./department.md) 检查必填项后重试 |
| 部门写操作返回 `data: null` | 正常，后端不回传 id | 用 `hr.dept.list` + `dname` 反查确认结果 |
| `hr.dept.judgeDel` 返回 `false` | 部门内仍有人员 | 告知用户不可删除，停止操作 |
| 岗位管理命令返回 `permission_denied` | 缺少 `post` / `post_add` / `post_edit` / `post_delete` / `post_export` 权限 | 终止并说明缺失权限；本地模式可先 `auth refresh-permissions` |
| `hr.post.addPost` 返回 `data: true` | 正常，后端不回传 id | 用 `hr.post.getPostTree` + `name` 反查确认结果 |
| `hr.post.getPostUserNum` 返回大于 0 | 该岗位节点下仍有在职人员 | 告知用户不可删除、先转移人员，停止操作 |
| 花名册命令返回 `permission_denied` | 缺少 `people_manage` / `people_add` / `people_edit` / `people_transfer` / `people_dimission` / `regular` / `regular_noAduit` 权限 | 终止并说明缺失权限；本地模式可先 `auth refresh-permissions` |
| `hr.employee.rosterList` / `count` 返回 0 条 | 当前用户无花名册数据权限（非接口异常） | 如实告知用户；只是查人改用 `hr.employee.addressBook` |
| `hr.employee.detail` 返回 `[4] 该员工未在职` | 员工已离职或 employeeId 无效 | 确认 employeeId 来源；离职员工不能再做在职操作 |
| `hr.employee.addEmployee` 返回 `[4] 获取钉钉token失败...` | 后端无法访问钉钉 API（环境问题） | 如实告知，非参数错误，不要盲目重试 |
| `hr.employee.removeChangeRecord` 返回 `[4] 该记录不可编辑` | 目标是带 `employeeChangeId` 的系统调动记录 | 告知用户系统记录不可改，只能维护手工新增的记录 |
| `hr.employee.updateAttachment` 后附件丢失 | 未整体提交 12 类附件，缺失类别被后端清空 | 用 `hr.employee.detail` 回显全部类别后整体提交修复；参考 [roster.md](./roster.md) |
| `hr.employee.importData` 后需要失败清单 | 响应 `data` 含 `fileId`/`name` | 用 `yulong hr file download <fileId> --format json` 下载并 base64 解码交付用户 |
| 返回空列表 | `orgId` 无效或筛选条件过严 | 确认 `orgId` 来自有效返回，或放宽条件 |
| `400 body 数据格式不正确，无法完成序列化` | 参数类型错误，如 `currentPage` 传了字符串 | 检查参数类型，确保数字字段传数字 |
| 搜索不到用户 | 使用 `loginName`/`realName` 精确匹配但输入不准确 | 改用更短的片段重试，或让用户确认账号/姓名 |

## 参考

- [rbac.md](./rbac.md) — RBAC 命令详细参考
- [department.md](./department.md) — 部门管理命令详细参考
- [roster.md](./roster.md) — 花名册管理命令详细参考
- [`yulong-shared/SKILL.md`](../../yulong-shared/SKILL.md) — 认证模式与错误处理通则
- [error-codes.md](../error-codes.md) — 全局错误类型
- [recovery-guide.md](../recovery-guide.md) — recovery 闭环规范
