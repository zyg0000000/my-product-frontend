# 权限预留规范 (Permission Reservation Specification)

> 本文档定义了 AgentWorks 系统数据层的权限预留字段规范，确保所有集合在设计时预留必要的权限相关字段，为后续权限系统实现做好准备。

---

## 1. 核心概念

### 1.1 权限维度

| 维度 | 字段名 | 说明 | 示例 |
|------|--------|------|------|
| 用户 | `userId` | 操作用户的唯一标识 | `"user_001"` |
| 部门 | `departmentId` | 用户所属部门 | `"dept_sales"` |
| 组织 | `organizationId` | 用户所属组织（多租户场景） | `"org_default"` |
| 角色 | `roleId` | 用户角色（通过用户表关联） | `"role_admin"` |

### 1.2 可见性级别

```typescript
type Visibility = 'private' | 'department' | 'organization' | 'public';
```

| 级别 | 说明 |
|------|------|
| `private` | 仅创建者可见 |
| `department` | 同部门可见 |
| `organization` | 同组织可见 |
| `public` | 全局可见（默认） |

---

## 2. 数据层预留字段

### 2.1 所有集合必须包含的字段

```typescript
interface BaseDocument {
  // 审计字段（必须）
  createdBy: string;       // 创建人 userId
  updatedBy: string;       // 最后更新人 userId
  createdAt: Date;         // 创建时间
  updatedAt: Date;         // 更新时间
}
```

### 2.2 资源类集合额外包含的字段

```typescript
interface ResourceDocument extends BaseDocument {
  // 权限隔离字段（预留，当前可为 null）
  organizationId?: string | null;  // 所属组织
  departmentId?: string | null;    // 所属部门
  visibility?: Visibility;          // 可见性级别（默认 'public'）
}
```

### 2.3 关联类集合的字段

```typescript
interface RelationDocument extends BaseDocument {
  // 关联记录的权限预留
  addedBy: string;                  // 添加人 userId
  organizationId?: string | null;   // 组织隔离
  departmentId?: string | null;     // 部门隔离
}
```

---

## 3. 集合权限字段规范

### 3.1 customers（客户）

```javascript
{
  // 现有字段
  code: "CUS202401001",
  name: "客户名称",

  // 权限预留字段
  organizationId: null,      // 预留：组织隔离
  departmentId: null,        // 预留：部门隔离
  visibility: "public",      // 预留：可见性

  // 审计字段
  createdBy: "user_001",
  updatedBy: "user_001",
  createdAt: ISODate(),
  updatedAt: ISODate()
}
```

### 3.2 customer_talents（客户达人池）

```javascript
{
  // 现有字段
  customerId: "CUS202401001",
  talentOneId: "talent_00000123",
  platform: "douyin",

  // 权限预留字段
  organizationId: null,      // 预留：组织隔离
  departmentId: null,        // 预留：部门隔离

  // 审计字段
  addedBy: "user_001",       // 已有
  addedAt: ISODate(),        // 已有
  updatedBy: "user_001",     // 新增
  updatedAt: ISODate()       // 新增
}
```

### 3.3 talents（达人）

```javascript
{
  // 现有字段
  oneId: "talent_00000123",
  platform: "douyin",
  name: "达人昵称",

  // 权限预留字段
  organizationId: null,      // 预留：组织隔离（达人一般是公司级资源）

  // 审计字段
  createdBy: "system",       // 创建来源
  updatedBy: "user_001",
  createdAt: ISODate(),
  updatedAt: ISODate()
}
```

### 3.4 projects（项目）

```javascript
{
  // 现有字段
  projectId: "PRJ202401001",
  name: "项目名称",

  // 权限预留字段
  organizationId: null,      // 预留：组织隔离
  departmentId: null,        // 预留：部门隔离
  ownerId: "user_001",       // 项目负责人
  visibility: "department",  // 项目可见性

  // 审计字段
  createdBy: "user_001",
  updatedBy: "user_001",
  createdAt: ISODate(),
  updatedAt: ISODate()
}
```

### 3.5 cooperations（合作记录）

```javascript
{
  // 现有字段
  cooperationId: "...",
  projectId: "PRJ202401001",

  // 权限预留字段
  organizationId: null,
  departmentId: null,

  // 审计字段
  createdBy: "user_001",
  updatedBy: "user_001",
  createdAt: ISODate(),
  updatedAt: ISODate()
}
```

---

## 4. API 层预留

### 4.1 请求头规范

```typescript
interface PermissionHeaders {
  'user-id': string;              // 必填：当前用户ID
  'department-id'?: string;       // 可选：用户所属部门
  'organization-id'?: string;     // 可选：用户所属组织
}
```

### 4.2 云函数处理示例

```javascript
// 从请求头提取权限信息
const userId = headers['user-id'] || 'anonymous';
const departmentId = headers['department-id'] || null;
const organizationId = headers['organization-id'] || null;

// 写入文档时
const doc = {
  ...data,
  organizationId,
  departmentId,
  createdBy: userId,
  updatedBy: userId,
  createdAt: new Date(),
  updatedAt: new Date()
};

// 查询时（权限过滤预留）
const query = {
  ...userQuery,
  // 当权限系统启用时取消注释
  // organizationId: { $in: [organizationId, null] },
  // departmentId: { $in: [departmentId, null] }
};
```

---

## 5. 前端预留

### 5.1 用户上下文扩展

```typescript
interface UserContext {
  userId: string;
  userName: string;
  departmentId?: string;
  departmentName?: string;
  organizationId?: string;
  organizationName?: string;
  roles: string[];
  permissions: string[];
}
```

### 5.2 API 调用时传递权限头

```typescript
// api/base.ts
export async function callFunction(name: string, data: any) {
  const user = getCurrentUser();

  return fetch(`/api/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'user-id': user?.userId || '',
      'department-id': user?.departmentId || '',
      'organization-id': user?.organizationId || '',
    },
    body: JSON.stringify(data)
  });
}
```

---

## 6. 实施检查清单

### 6.1 云函数审计

| 云函数 | 权限字段状态 | 需要添加 |
|--------|-------------|----------|
| customerTalents | ✅ addedBy | organizationId, departmentId, updatedBy |
| customers | ✅ createdBy, updatedBy | organizationId, departmentId |
| talents | ❌ 部分缺失 | organizationId, createdBy, updatedBy |
| projects | 需检查 | organizationId, departmentId, ownerId |
| cooperations | 需检查 | organizationId, departmentId |

### 6.2 字段添加原则

1. **新增记录**：自动填充权限字段
2. **现有记录**：权限字段默认为 `null`（不影响查询）
3. **向后兼容**：查询时 `null` 值不做权限过滤

---

## 7. 注意事项

1. **当前阶段**：所有权限字段仅做预留，不进行实际权限过滤
2. **字段命名**：统一使用 `camelCase`
3. **默认值**：权限字段默认为 `null`，表示未设置（全局可见）
4. **可见性默认**：资源类文档默认 `visibility: 'public'`
5. **组织隔离**：当前单组织场景，`organizationId` 可暂时忽略

---

**文档版本**：v1.0
**创建时间**：2025-12-02
**维护者**：产品团队
