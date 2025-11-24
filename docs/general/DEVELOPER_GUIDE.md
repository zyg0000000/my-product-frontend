# 开发者指南

> **完整的开发指南**：涵盖环境搭建、代码规范、开发流程、部署等所有开发相关内容

---

## 📋 目录

1. [环境搭建](#环境搭建)
2. [项目结构](#项目结构)
3. [开发工作流](#开发工作流)
4. [代码规范](#代码规范)
5. [Git 工作流](#git-工作流)
6. [部署流程](#部署流程)
7. [数据导出字段添加](#数据导出字段添加)
8. [架构升级](#架构升级)
9. [AI 协作开发](#ai-协作开发)

---

## 环境搭建

### 前置要求

- **浏览器**: Chrome、Firefox、Safari、Edge（支持 ES6 模块）
- **Node.js**: v14+ （仅用于本地开发工具，前端不依赖 Node.js）
- **Git**: 版本控制
- **代码编辑器**: VS Code（推荐）

### 克隆仓库

```bash
git clone https://github.com/zyg0000000/my-product-frontend.git
cd my-product-frontend
```

### 本地开发

#### 方法 1: Python HTTP 服务器

```bash
# Python 3
cd frontends/byteproject
python -m http.server 8000
```

#### 方法 2: Node.js HTTP 服务器

```bash
# 安装 http-server
npm install -g http-server

# 启动服务器
cd frontends/byteproject
http-server -p 8000
```

#### 访问应用

打开浏览器访问：`http://localhost:8000/index.html`

---

## 项目结构

### Monorepo v3.0 结构

```
my-product-frontend/  (Monorepo v3.0)
├── frontends/                      # 前端项目
│   ├── README.md                   # 前端项目说明
│   └── byteproject/                # 当前产品
│       ├── *.html                  # 页面文件
│       ├── *.js                    # 页面脚本
│       ├── sidebar.js              # 侧边栏组件
│       ├── common/                 # 公共代码
│       │   └── app-core.js         # 核心 API 调用
│       ├── automation_suite/       # 自动化套件
│       ├── data_export_center/     # 数据导出中心
│       ├── execution_board/        # 执行看板
│       ├── order_list/             # 订单列表
│       ├── performance/            # 性能分析
│       ├── project_analysis/       # 项目分析
│       ├── project_automation/     # 项目自动化
│       ├── project_report/         # 项目日报
│       ├── rebate_management/      # 返点管理
│       ├── talent_pool/            # 达人池
│       ├── talent_schedule/        # 达人档期
│       ├── talent_selection/       # 达人选择
│       ├── task_center/            # 任务中心
│       ├── works_management/       # 作品管理
│       └── legacy/                 # 旧版代码（备份）
│
├── functions/                      # 云函数源码
│   ├── README.md                   # 云函数开发指南
│   ├── INDEX.md                    # 51个云函数完整索引
│   ├── DEPLOYMENT_GUIDE.md         # 部署详细教程
│   ├── _template/                  # 云函数模板
│   └── [51个云函数目录]/
│
├── database/                       # 数据库 Schema
│   ├── README.md                   # Schema 文档
│   ├── INDEX.md                    # Schema 文件索引
│   ├── MAC_SETUP.md                # Mac 环境设置
│   ├── schemas/                    # 12 个 Schema 定义
│   ├── scripts/                    # Schema 同步工具
│   └── migrations/                 # 数据迁移脚本
│
└── docs/                           # 项目文档
    ├── api/                        # API 文档
    ├── architecture/               # 架构文档
    ├── features/                   # 功能文档
    ├── archive/                    # 归档文档
    └── releases/                   # 发布说明
```

### 模块化架构

大部分复杂页面已经过模块化重构，拆分为多个职责清晰的模块：

**示例**（order_list 页面）：
```
order_list/
├── main.js              # 主控制器
├── tab-basic.js         # 基本信息 Tab
├── tab-effect.js        # 效果数据 Tab
├── tab-financial.js     # 财务信息 Tab
└── tab-performance.js   # 性能数据 Tab
```

---

## 开发工作流

### 1. 新功能开发

#### Step 1: 创建功能分支

```bash
git checkout -b feature/your-feature-name
```

#### Step 2: 开发功能

1. 在 `frontends/byteproject/` 中修改前端代码
2. 如需修改云函数，在 `functions/` 中修改
3. 如需修改数据库，更新 `database/schemas/`

#### Step 3: 本地测试

```bash
# 启动本地服务器
cd frontends/byteproject
python -m http.server 8000

# 在浏览器中测试
# http://localhost:8000/index.html
```

#### Step 4: 提交代码

```bash
git add .
git commit -m "feat: 添加新功能"
git push origin feature/your-feature-name
```

#### Step 5: 创建 Pull Request

在 GitHub 上创建 PR，等待审核和合并。

### 2. Bug 修复

#### Step 1: 创建修复分支

```bash
git checkout -b fix/bug-description
```

#### Step 2: 定位问题

1. 使用浏览器开发者工具（F12）
2. 查看控制台错误信息
3. 检查网络请求（Network tab）
4. 使用断点调试

#### Step 3: 修复并测试

1. 修改代码
2. 本地测试验证修复
3. 确保没有引入新问题

#### Step 4: 提交修复

```bash
git add .
git commit -m "fix: 修复XX问题"
git push origin fix/bug-description
```

---

## 代码规范

### 命名规范

**JavaScript**：
- 变量/函数：小驼峰 `getUserInfo()`
- 类名：大驼峰 `class DataManager {}`
- 常量：全大写下划线 `const API_BASE_URL = '...'`

**HTML/CSS**：
- HTML ID: kebab-case `id="user-profile"`
- CSS 类名: kebab-case `class="btn-primary"`

### 文件组织

**单文件组件**：
- 每个页面一个 HTML 文件
- 对应的 JS 文件或模块目录

**模块化页面**：
```
page_name/
├── main.js              # 主控制器
├── tab-xxx.js           # Tab 模块
├── modal-xxx.js         # 弹窗模块
└── utils.js             # 工具函数
```

### 注释规范

```javascript
/**
 * 函数说明
 * @param {string} userId - 用户ID
 * @param {Object} options - 配置选项
 * @returns {Promise<Object>} 用户信息
 */
async function getUserInfo(userId, options = {}) {
    // 实现代码
}
```

### 代码格式化

**缩进**: 使用 4 个空格（或 2 个空格，保持一致）
**分号**: 建议添加（避免ASI问题）
**引号**: 统一使用单引号或双引号

---

## Git 工作流

### 分支策略

- **main**: 主分支，始终保持可部署状态
- **feature/xxx**: 新功能分支
- **fix/xxx**: Bug 修复分支
- **claude/xxx-sessionid**: AI 协作开发分支

### 提交消息规范

```
<type>: <subject>

<body>

<footer>
```

**Type 类型**：
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具链相关

**示例**：
```bash
git commit -m "feat: 添加达人筛选功能

- 新增高级筛选组件
- 支持多条件组合筛选
- 优化筛选性能

Closes #123"
```

### 常用Git命令

```bash
# 查看状态
git status

# 查看差异
git diff

# 查看提交历史
git log --oneline -10

# 撤销未提交的修改
git restore <file>

# 撤销已暂存的修改
git restore --staged <file>

# 合并分支
git merge feature/xxx

# 变基（保持提交历史线性）
git rebase main
```

---

## 部署流程

### 前端部署（Cloudflare Pages）

#### 自动部署

- **main 分支**: 推送后自动部署到生产环境
- **功能分支**: 自动创建预览环境

#### 手动触发部署

1. 登录 Cloudflare Pages
2. 选择项目
3. 点击"Retry deployment"

#### 配置说明

**byteproject 产品**：
- 项目名称：byteproject
- 根目录：`frontends/byteproject`
- 构建命令：(空，纯静态)
- 输出目录：`/`

### 后端部署（火山引擎云函数）

#### 部署流程

1. **提交代码到 GitHub**
   ```bash
   cd /path/to/my-cloud-functions
   git add .
   git commit -m "feat: 添加新云函数"
   git push
   ```

2. **VSCode 拉取代码**
   - 打开 VSCode
   - 拉取最新代码到本地

3. **使用火山引擎插件部署**
   - 打开要部署的云函数目录
   - 右键选择"Deploy to Volcengine"
   - 等待部署完成

详细部署指南：[functions/DEPLOYMENT_GUIDE.md](../functions/DEPLOYMENT_GUIDE.md)

### 数据库（MongoDB）

#### Schema 同步

```bash
cd database
./scripts/sync-schema.sh --all
```

详细同步指南：[database/SCHEMA_SYNC_GUIDE.md](../database/SCHEMA_SYNC_GUIDE.md)

---

## 数据导出字段添加

### 完整流程（2步）

#### Step 1: 更新后端元数据 API

**文件**: `my-cloud-functions/getFieldMetadata/index.js`

```javascript
collaboration: {
    '合作信息': [
        // ... 现有字段 ...
        {
            id: 'newFieldId',
            label: '新字段名称',
            backendKey: '新字段名称',
            dataType: 'string'
        },
    ],
}
```

#### Step 2: 更新后端数据导出 API

**文件**: `my-cloud-functions/exportComprehensiveData/index.js`

```javascript
switch (field) {
    // ... 现有映射 ...
    case 'newFieldId':
        projectStage['新字段名称'] = '$databaseFieldName';
        break;
}
```

#### Step 3: 部署云函数

```bash
cd my-cloud-functions
git add .
git commit -m "feat: 添加 xxx 字段到数据导出"
git push

# 使用 VSCode 插件部署云函数
```

#### Step 4: 验证

1. 刷新前端页面
2. 打开"管理导出维度"弹窗
3. 确认新字段可见
4. 生成预览，验证数据正确

---

## 架构升级

### 页面模块化重构

如需对现有页面进行模块化重构，请参考：
- 📖 [架构升级指南](./architecture/ARCHITECTURE_UPGRADE_GUIDE.md)
- 📖 [页面模块化策略](./architecture/PAGE_MODULARIZATION_STRATEGY.md)

### 重构步骤

1. **分析页面**：识别功能模块边界
2. **规划模块**：设计模块划分方案
3. **创建模块**：逐个实现模块
4. **集成测试**：确保功能正常
5. **部署上线**：合并到主分支

---

## AI 协作开发

### 使用 Claude Code

本项目采用 **人机协作** 开发模式，使用 Claude Code 进行编码实现。

### 工作流程

1. **AI 创建分支**
   ```bash
   git checkout -b claude/feature-name-sessionid
   ```

2. **AI 持续开发**
   - 编写代码
   - 提交变更
   - 推送到远程

3. **人工审核**
   - 查看代码变更
   - 测试功能
   - 提出修改意见

4. **合并到主分支**
   - 人工创建 PR
   - 审核通过后合并

### 最佳实践

**明确任务边界**：
```
✅ 好的指令："请按照 docs/ARCHITECTURE_UPGRADE_GUIDE.md 的步骤升级 talent_pool.js"
❌ 模糊指令："帮我优化一下代码"
```

**引用项目文档**：
```
"请先读取 docs/ARCHITECTURE_UPGRADE_GUIDE.md，然后..."
"参考 order_list/main.js 的结构，创建..."
```

**分阶段推进**：
- 第一步：规划设计
- 第二步：核心功能
- 第三步：测试修复
- 第四步：部署上线

---

## 🔗 相关文档

### 核心文档
- [README.md](../README.md) - 项目概述
- [故障排查手册](./TROUBLESHOOTING.md) - 常见问题解决
- [FAQ](./FAQ.md) - 常见问题

### 功能文档
- [多价格类型系统](./features/MULTI_PRICE_SYSTEM.md)
- [项目日报功能](./features/PROJECT_REPORT.md)
- [自动化功能](./features/AUTOMATION.md)

### API 文档
- [云函数 API 参考](./api/API_REFERENCE.md)
- [后端 API v4.0](./api/backend-api-v4.0-README.md)

### 数据库文档
- [Database README](../database/README.md)
- [Schema 文件索引](../database/INDEX.md)

---

**最后更新**: 2025-11-11
**文档版本**: v1.0
