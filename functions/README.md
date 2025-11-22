# 云函数代码 (Cloud Functions)

> 本目录包含所有部署在**火山引擎云函数**的后端 API 代码

## 🔍 快速导航

**想要查找特定的云函数？**

👉 **[docs/INDEX.md](./docs/INDEX.md)** - 所有 51 个云函数的完整索引和分类

| 文档 | 说明 |
|------|------|
| 📖 [完整索引](./docs/INDEX.md) | 按功能分类的所有云函数列表 |
| 📚 [文档导航](./docs/INDEX_DOCS.md) | 所有文档的统一入口 |
| 🚀 [部署指南](./docs/DEPLOYMENT_GUIDE.md) | 云函数部署完整教程 |
| 🔄 [升级方案](./docs/upgrades/UPGRADE_PLAN.md) | v1 → v2 升级总览 |
| 📊 本文档 (README.md) | 云函数开发和代码规范 |

---

## 📁 目录说明

本目录存放所有云函数的源代码，每个云函数一个独立文件夹。

**📊 函数统计**：51 个云函数，涵盖达人管理、项目管理、自动化、数据分析等11个功能分类

### 目录结构

```
functions/
├── README.md                    # 本文件
│
├── 项目管理相关/
│   ├── getProjects/            # 获取项目列表
│   ├── addProject/             # 新增项目
│   ├── updateProject/          # 更新项目
│   ├── deleteProject/          # 删除项目
│   └── getProjectPerformance/  # 项目执行数据
│
├── 达人管理相关/
│   ├── getTalents/             # 获取达人列表
│   ├── getTalentsByIds/        # 批量查询达人
│   ├── getTalentsSearch/       # 达人搜索
│   ├── getTalentHistory/       # 达人合作历史
│   ├── updateTalent/           # 更新达人
│   ├── deleteTalent/           # 删除达人
│   ├── bulkCreateTalents/      # 批量创建达人
│   └── bulkUpdateTalents/      # 批量更新达人
│
├── 合作订单相关/
│   ├── getCollaborators/       # 获取合作列表
│   ├── addCollaborator/        # 新增合作
│   ├── updateCollaborator/     # 更新合作
│   └── deleteCollaborator/     # 删除合作
│
├── 项目日报相关/
│   └── handleProjectReport/    # 项目日报数据处理
│
├── 自动化任务相关/
│   ├── automation-tasks/       # 任务管理
│   ├── automation-jobs-create/ # 创建任务
│   ├── automation-workflows/   # 工作流引擎
│   └── TaskGeneratorCron/      # 定时任务
│
├── 飞书集成相关/
│   ├── syncFromFeishu/         # 从飞书同步数据
│   ├── feishu-callback-handler/# 飞书回调处理
│   └── feishu-notifier/        # 飞书消息推送
│
├── 文件管理相关/
│   ├── uploadFile/             # 文件上传
│   ├── deleteFile/             # 文件删除
│   └── previewFile/            # 文件预览
│
├── 数据导出相关/
│   ├── exportComprehensiveData/# 综合数据导出
│   └── getFieldMetadata/       # 字段元数据
│
└── 其他/
    └── ...                     # 其他云函数
```

## 🚀 部署流程

### 方式 1: 通过 VSCode 插件部署（推荐）

1. **安装火山引擎 VSCode 插件**
   - 在 VSCode 扩展市场搜索"火山引擎"或"Volcengine"
   - 安装官方插件

2. **配置插件**
   - 登录火山引擎账号
   - 选择对应的云函数服务

3. **部署函数**
   - 在 `functions/[function-name]/` 目录右键
   - 选择"部署到火山引擎"
   - 选择对应的云函数

### 方式 2: 手动部署

1. **从 GitHub 拉取代码**
   ```bash
   git pull origin main
   ```

2. **复制到本地火山云项目目录**
   ```bash
   cp -r functions/getProjects/* ~/volcengine-functions/getProjects/
   ```

3. **通过 VSCode 或火山云控制台部署**

### 方式 3: 火山云控制台

1. 登录火山引擎控制台
2. 进入云函数服务
3. 选择对应函数
4. 上传代码包或在线编辑

## 📝 云函数标准结构

每个云函数目录应包含以下文件：

```
[function-name]/
├── index.js           # 函数入口（必需）
├── package.json       # 依赖配置（必需）
├── README.md          # 函数说明（推荐）
└── utils.js           # 工具函数（可选）
```

### index.js 示例

```javascript
/**
 * 云函数名称：getProjects
 * 功能：获取项目列表
 * 版本：v1.0
 */

exports.handler = async (event) => {
    try {
        // 解析请求参数
        const params = JSON.parse(event.body || '{}');

        // 业务逻辑
        // ...

        // 返回结果
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                data: results
            })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};
```

### package.json 示例

```json
{
    "name": "getProjects",
    "version": "1.0.0",
    "description": "获取项目列表",
    "main": "index.js",
    "dependencies": {
        "mongodb": "^4.0.0"
    }
}
```

### README.md 示例

```markdown
# getProjects

获取项目列表的云函数

## API 端点
\`\`\`
POST /getProjects
\`\`\`

## 请求参数
- `status` (string, optional) - 项目状态筛选
- `page` (number, optional) - 页码
- `limit` (number, optional) - 每页数量

## 返回结果
\`\`\`json
{
    "success": true,
    "data": [...]
}
\`\`\`

## 版本历史
- v1.0 (2025-01-01) - 初始版本
```

## 🔧 开发规范

### 1. 命名规范
- 文件夹名：小驼峰命名（如 `getProjects`）
- 函数名：与文件夹名一致
- 版本号：遵循语义化版本 (semver)

### 2. 错误处理
- 所有函数必须包含 try-catch 错误处理
- 返回统一的错误格式

### 3. 日志规范
- 使用 `console.log` 记录关键操作
- 使用 `console.error` 记录错误信息

### 4. 环境变量
云函数需要的环境变量：
```bash
MONGODB_URI=mongodb://...          # MongoDB 连接字符串
DB_NAME=kol_data                   # 数据库名称
TOS_ACCESS_KEY=...                 # 对象存储访问密钥
TOS_SECRET_KEY=...                 # 对象存储密钥
FEISHU_APP_ID=...                  # 飞书应用 ID
FEISHU_APP_SECRET=...              # 飞书应用密钥
```

## 📊 已部署云函数清单

| 函数名 | 功能 | 版本 | 状态 |
|--------|------|------|------|
| getProjects | 获取项目列表 | v1.0 | ✅ 运行中 |
| getTalents | 获取达人列表 | v3.3 | ✅ 运行中 |
| **getTalentsSearch** | **高级达人搜索（双数据库）** | **v9.0** | ✅ 运行中 |
| getCollaborators | 获取合作列表 | v1.0 | ✅ 运行中 |
| handleProjectReport | 项目日报处理 | v2.0 | ✅ 运行中 |
| syncFromFeishu | 飞书数据同步 | v12.1 | ✅ 运行中 |
| fieldMappingManager | 字段映射管理 | v1.0 | ✅ 运行中 |
| dimensionConfigManager | 维度配置管理 | v1.0 | ✅ 运行中 |
| **customers** | **客户管理 RESTful API** | **v1.0** | 🆕 待部署 |
| ... | ... | ... | ... |

### customers v1.0 (RESTful API)

**核心特性**：
- 完整的 RESTful API 设计（GET/POST/PUT/DELETE）
- 双ID支持：MongoDB ObjectId 和业务编码（CUS20240001）
- 自动生成客户编码
- 价格策略管理（支持多业务类型）
- 支付系数自动计算
- 价格历史记录
- 软删除机制

**API 端点**（火山引擎兼容）：
```bash
GET    /customers          # 获取客户列表
GET    /customers?id=xxx   # 获取客户详情
POST   /customers          # 创建客户
PUT    /customers          # 更新客户（body含id）
DELETE /customers?id=xxx   # 删除客户（软删除）
```

### getTalentsSearch v9.0 (双数据库版)

**核心特性**：
- 支持 `dbVersion` 参数切换数据库：`v1` (kol_data) / `v2` (agentworks_db)
- 自动字段映射（nickname↔name, xingtuId↔platformAccountId 等）
- Dashboard 统计（层级分布、CPM分布、性别比例分布）
- 灵活筛选操作符（>, <, between, contains 等）
- AND/OR 筛选逻辑

**使用方式**：
```javascript
// byteproject (默认 v1)
POST /talents/search
{ "search": "达人名", "tiers": ["头部"] }

// agentworks (v2)
POST /talents/search
{ "dbVersion": "v2", "platform": "douyin", "search": "达人名" }
```

> 完整列表参见主 README.md

## 📚 相关文档

- [API 文档](../docs/api/API_REFERENCE.md) - 完整的 API 接口文档
- [数据库 Schema](../database/schemas/) - MongoDB 数据结构
- [前端调用示例](../common/app-core.js) - 前端如何调用云函数

## 🔗 外部链接

- [火山引擎云函数文档](https://www.volcengine.com/docs/6459)
- [原云函数仓库](https://github.com/zyg0000000/my-cloud-functions) - 仅供历史参考

## ⚠️ 注意事项

1. **本目录仅用于代码管理和版本控制**
2. **实际部署在火山引擎云函数平台**
3. **代码修改后需要手动部署到火山云**
4. **环境变量在火山云控制台配置，不在代码中硬编码**
5. **敏感信息不要提交到 GitHub**

---

**最后更新**: 2024-11-22
**维护者**: 开发团队

---

## 🆕 最新更新 (2024-11-22)

### customers v1.0 - 客户管理 RESTful API（Phase 1 完成）
- ✅ 后端：RESTful API 云函数开发完成
- ✅ 前端：Pro Components + Tailwind 混合方案
- 🔄 状态：待部署到火山引擎

**详细进度**：[客户管理开发进度](../docs/customer-management/PROGRESS.md)
