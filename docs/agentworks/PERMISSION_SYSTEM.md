# 权限系统设计 (Permission System Design)

## 📋 概述 Overview
统一管理AgentWorks系统中所有模块的权限控制点，为后续权限模块开发预留完整的权限体系。

## 🔐 权限命名规范 Permission Naming Convention
- 格式：`module.resource.action`
- 示例：`talent.basic.view`（查看达人基础信息）

## 📊 权限体系 Permission Structure

### 1. 达人管理模块 (Talent Management)

#### 基础信息权限
- `talent.basic.view` - 查看达人基础信息
- `talent.basic.create` - 创建新达人
- `talent.basic.edit` - 编辑达人信息
- `talent.basic.delete` - 删除达人
- `talent.basic.export` - 导出达人数据

#### 价格管理权限
- `talent.price.view` - 查看达人价格
- `talent.price.edit` - 编辑达人价格
- `talent.price.history` - 查看价格历史

#### 返点管理权限
- `talent.rebate.view` - 查看返点配置
- `talent.rebate.edit` - 调整返点率
- `talent.rebate.mode.switch` - 切换返点模式（独立/同步）
- `talent.rebate.history` - 查看返点历史
- `talent.rebate.sync` - 同步机构返点

### 2. 机构管理模块 (Agency Management)

#### 基础管理权限
- `agency.basic.view` - 查看机构列表
- `agency.basic.create` - 创建新机构
- `agency.basic.edit` - 编辑机构信息
- `agency.basic.delete` - 删除机构

#### 机构返点权限
- `agency.rebate.view` - 查看机构返点配置
- `agency.rebate.manage` - 管理机构统一返点
- `agency.rebate.sync` - 同步返点到达人
- `agency.rebate.batch` - 批量操作返点

### 3. 合作管理模块 (Cooperation Management)
- `cooperation.view` - 查看合作记录
- `cooperation.create` - 创建合作
- `cooperation.edit` - 编辑合作
- `cooperation.delete` - 删除合作
- `cooperation.approve` - 审批合作

### 4. 项目管理模块 (Project Management)
- `project.view` - 查看项目
- `project.create` - 创建项目
- `project.edit` - 编辑项目
- `project.delete` - 删除项目
- `project.assign` - 分配项目

### 5. 报表分析模块 (Analytics)
- `analytics.dashboard.view` - 查看仪表板
- `analytics.report.view` - 查看报表
- `analytics.report.export` - 导出报表
- `analytics.report.create` - 创建自定义报表

### 6. 系统管理模块 (System)
- `system.user.view` - 查看用户
- `system.user.manage` - 管理用户
- `system.role.view` - 查看角色
- `system.role.manage` - 管理角色
- `system.permission.manage` - 管理权限
- `system.config.view` - 查看系统配置
- `system.config.edit` - 编辑系统配置
- `system.log.view` - 查看系统日志

## 🎭 预设角色 (Preset Roles)

### 1. 超级管理员 (Super Admin)
- 拥有所有权限
- 权限码：`*`

### 2. 运营管理员 (Operation Admin)
- 达人管理全部权限
- 机构管理全部权限
- 合作管理全部权限
- 项目管理全部权限
- 报表查看和导出

### 3. 商务人员 (Business User)
- 达人基础信息查看
- 价格查看
- 返点查看
- 合作创建和编辑
- 项目查看

### 4. 财务人员 (Finance User)
- 达人价格查看
- 返点查看
- 合作查看
- 报表全部权限

### 5. 只读用户 (Read-only User)
- 所有 `.view` 权限
- 无编辑和删除权限

## 🔧 权限检查实现 Implementation

### 后端权限检查（云函数）
```typescript
// 权限中间件
export async function checkPermission(
  userId: string,
  permission: string
): Promise<boolean> {
  // TODO: 实现权限检查逻辑
  // 1. 获取用户角色
  // 2. 获取角色权限
  // 3. 检查是否包含所需权限
  return true;
}

// 使用示例
export async function adjustTalentRebate(params: any) {
  const hasPermission = await checkPermission(
    params.userId,
    'talent.rebate.edit'
  );

  if (!hasPermission) {
    throw new Error('无权限执行此操作');
  }

  // 业务逻辑...
}
```

### 前端权限控制（React）
```typescript
// 权限Hook
export function usePermission(permission: string): boolean {
  const user = useCurrentUser();
  // TODO: 实现权限判断逻辑
  return true;
}

// 权限组件
export function PermissionGuard({
  permission,
  children
}: {
  permission: string;
  children: React.ReactNode;
}) {
  const hasPermission = usePermission(permission);
  return hasPermission ? <>{children}</> : null;
}

// 使用示例
<PermissionGuard permission="talent.rebate.edit">
  <button>调整返点</button>
</PermissionGuard>
```

## 📝 权限配置存储

### 用户-角色-权限关系
```typescript
// users 集合
interface User {
  userId: string;
  roleIds: string[];  // 用户拥有的角色
}

// roles 集合
interface Role {
  roleId: string;
  roleName: string;
  permissions: string[];  // 角色拥有的权限
  isSystem: boolean;      // 是否系统预设角色
}

// permissions 集合（权限字典）
interface Permission {
  code: string;           // 权限码
  name: string;           // 权限名称
  module: string;         // 所属模块
  description: string;    // 权限描述
}
```

## 🚀 实施计划 Implementation Plan

### Phase 1: 基础框架
1. 建立权限表结构
2. 实现权限检查中间件
3. 创建权限管理界面

### Phase 2: 模块集成
1. 达人管理模块权限接入
2. 机构管理模块权限接入
3. 返点功能权限接入

### Phase 3: 高级功能
1. 动态权限配置
2. 权限审计日志
3. 权限委托机制

## 📌 注意事项 Notes

1. **向后兼容**：新增权限点时保持向后兼容
2. **最小权限原则**：默认拒绝，明确授权
3. **权限缓存**：合理缓存权限数据，提高性能
4. **审计追踪**：记录权限相关的所有操作

---
🤖 Generated with Claude Code