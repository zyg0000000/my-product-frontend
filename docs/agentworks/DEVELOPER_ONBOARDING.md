# AgentWorks 开发者入职指南

> 新开发者快速上手指南

## 📋 入职检查清单

### 第一天：环境准备

- [ ] **账号权限**
  - [ ] GitHub 仓库访问权限
  - [ ] Cloudflare Pages 管理权限
  - [ ] 火山引擎云函数访问权限
  - [ ] MongoDB 数据库访问权限
  - [ ] 飞书工作区权限

- [ ] **开发环境**
  - [ ] 安装 Node.js >= 20.19
  - [ ] 安装 Git
  - [ ] 安装 VS Code 或其他 IDE
  - [ ] 克隆项目仓库
  - [ ] 安装依赖 `npm install`

- [ ] **必读文档**
  - [ ] [项目 README](../../README.md)
  - [ ] [文档中心](../README.md)
  - [ ] [产品总览](./README.md)
  - [ ] [开发规范](./DEVELOPMENT_GUIDELINES.md)

### 第二天：熟悉项目

- [ ] **项目理解**
  - [ ] 了解产品定位和核心价值
  - [ ] 理解技术架构
  - [ ] 熟悉项目结构
  - [ ] 了解数据库设计

- [ ] **本地运行**
  - [ ] 启动前端开发服务器
  - [ ] 测试 API 调用
  - [ ] 浏览各个功能页面

- [ ] **代码阅读**
  - [ ] 阅读核心组件代码
  - [ ] 理解状态管理方式
  - [ ] 了解 API 调用规范

### 第三天：开始开发

- [ ] **小任务练习**
  - [ ] 修复一个简单的 bug
  - [ ] 添加一个小功能
  - [ ] 创建 PR 并通过 Review

---

## 🎯 需要了解的关键信息

### 产品相关

#### 1. 产品定位
- **目标用户**：MCN 机构、品牌方、营销团队
- **核心功能**：多平台达人管理、价格管理、返点系统
- **支持平台**：抖音、小红书、B站、快手

#### 2. 业务流程
<!-- 请产品经理补充 -->
```
待补充：
1. 达人入库流程
2. 价格更新流程
3. 返点计算流程
4. 项目合作流程
```

#### 3. 数据权限
<!-- 请产品经理补充 -->
```
待补充：
1. 谁可以编辑达人信息
2. 谁可以修改价格
3. 谁可以设置返点
4. 数据可见性规则
```

---

### 技术架构

#### 1. 前端技术栈
- **框架**：React 19 + TypeScript 5
- **构建**：Vite 7
- **UI 库**：Ant Design 5 + Ant Design Pro Components
- **样式**：Tailwind CSS 3
- **路由**：React Router 7
- **状态**：React Hooks + Context

#### 2. 后端技术栈
- **运行时**：Node.js
- **架构**：Serverless（云函数）
- **数据库**：MongoDB Atlas
- **API 网关**：火山引擎 API Gateway

#### 3. 部署架构
```
前端：Cloudflare Pages（静态站点）
后端：火山引擎云函数（Serverless）
数据库：MongoDB Atlas（云数据库）
存储：TOS 对象存储（文件上传）
```

---

### 开发流程

#### 1. 分支策略
```
main - 生产分支（自动部署）
  └── feature/* - 功能分支
  └── fix/* - 修复分支
  └── docs/* - 文档分支
```

#### 2. 提交规范
```bash
<type>(<scope>): <subject>

# 类型
feat: 新功能
fix: 修复
docs: 文档
style: 格式
refactor: 重构
perf: 性能
test: 测试
chore: 构建

# 示例
feat(talent): 新增达人批量导入
fix(rebate): 修复返点计算bug
docs(readme): 更新部署文档
```

#### 3. PR 流程
1. 创建功能分支
2. 开发并本地测试
3. 运行检查脚本 `npm run check`
4. 创建 PR（使用模板）
5. 等待 Code Review
6. 修复 Review 意见
7. 合并到 main

---

### 关键开发规范

#### 1. 云函数开发
```javascript
/**
 * 云函数名称
 * @version 1.0.0
 * @date 2025-11-24
 * @changelog
 * - v1.0.0 (2025-11-24): 初始版本
 */

const VERSION = '1.0.0';

export default async function handler(request) {
  console.log(`[v${VERSION}] 开始处理请求`);
  // ...
}
```

#### 2. React 组件开发
```typescript
// 使用 TypeScript
interface Props {
  data: Talent[];
  onSelect: (talent: Talent) => void;
}

export const TalentList: React.FC<Props> = ({ data, onSelect }) => {
  // 使用 ProTable
  return (
    <ProTable<Talent>
      dataSource={data}
      columns={columns}
      onRow={(record) => ({
        onClick: () => onSelect(record)
      })}
    />
  );
};
```

#### 3. 部署前检查
```bash
# 必须执行并通过
npm run pre-deploy

# 或使用脚本
../../scripts/pre-deploy-check.sh
```

---

## 🔑 环境变量配置

### 本地开发环境
创建 `frontends/agentworks/.env.local`：
```env
VITE_API_BASE_URL=https://your-api-gateway.com
VITE_ENV=development
```

### Cloudflare Pages 环境变量
<!-- 请技术负责人补充 -->
```
待补充：
- API_BASE_URL 的具体值
- 其他必需的环境变量
- 如何配置环境变量
```

---

## 🔐 敏感信息管理

### 禁止硬编码
```typescript
// ❌ 错误：硬编码敏感信息
const API_KEY = 'sk-xxx123456';

// ✅ 正确：使用环境变量
const API_KEY = import.meta.env.VITE_API_KEY;
```

### .gitignore 检查
确保以下文件不会提交：
- `.env.local`
- `.env.production`
- `node_modules/`
- `dist/`
- 任何包含密钥的文件

---

## 📞 获取帮助

### 遇到技术问题
1. 查看 [故障排查手册](../general/TROUBLESHOOTING.md)
2. 搜索项目文档
3. 询问团队成员
4. 创建 GitHub Issue

### 遇到业务问题
1. 查看产品文档
2. 询问产品经理
3. 参考历史需求文档

---

## 📚 推荐学习资源

### 官方文档
- [React 官方文档](https://react.dev/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)
- [Ant Design](https://ant.design/)
- [Ant Design Pro Components](https://procomponents.ant.design/)
- [Tailwind CSS](https://tailwindcss.com/)

### 项目文档
- [系统架构](./ARCHITECTURE.md)
- [UI/UX 规范](./UI_UX_GUIDELINES.md)
- [组件库手册](./COMPONENT_LIBRARY.md)

---

## ❓ 需要补充的信息

以下信息需要由项目负责人补充：

### 业务流程类
- [ ] 达人入库的完整流程
- [ ] 价格更新的审批流程
- [ ] 返点计算的具体规则
- [ ] 项目合作的业务流程

### 技术细节类
- [ ] API 网关的完整 URL 和配置
- [ ] MongoDB 连接字符串配置方式
- [ ] 火山引擎云函数部署流程
- [ ] TOS 对象存储的使用方式

### 权限管理类
- [ ] 各角色的具体权限列表
- [ ] 如何申请生产环境权限
- [ ] 数据访问权限矩阵
- [ ] 敏感操作的审批流程

### 部署运维类
- [ ] 生产环境部署流程
- [ ] 回滚操作步骤
- [ ] 监控和日志查看方式
- [ ] 紧急故障处理流程

### 测试相关
- [ ] 测试环境访问方式
- [ ] 测试数据准备方法
- [ ] 自动化测试运行方式
- [ ] 性能测试基准

---

## 📝 反馈

如果你在使用本文档过程中发现问题或有改进建议，请：
1. 创建 GitHub Issue
2. 联系文档维护者
3. 直接提交 PR 更新

---

**维护者**: AgentWorks Team
**最后更新**: 2025-11-24
**状态**: 🚧 持续完善中

🤖 Generated with [Claude Code](https://claude.com/claude-code)
