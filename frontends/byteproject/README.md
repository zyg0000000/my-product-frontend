# 前端项目 (Frontend Projects)

> 本目录包含所有前端产品的代码

## 📁 项目列表

### byteproject（当前产品）

**项目路径**：`frontends/byteproject/`
**产品描述**：ByteProject - KOL 项目管理系统
**技术栈**：HTML5, JavaScript (Vanilla JS), Tailwind CSS
**部署平台**：Cloudflare Pages
**访问地址**：[生产环境域名]

**主要功能模块**：
- 项目中心 (index.html)
- 达人管理 (talent_pool.html, talent_selection.html)
- 合作订单 (order_list.html)
- 项目分析 (project_analysis.html, performance.html)
- 自动化工作流 (automation_suite.html)
- 数据导出中心 (data_export_center.html)
- 执行看板 (execution_board.html)
- 飞书集成 (feishu_sync.html)
- 项目日报 (project_report.html)
- 返点管理 (rebate_management.html)
- 作品管理 (works_management.html)
- 任务中心 (task_center.html)
- 达人档期 (talent_schedule.html)
- 项目自动化 (project_automation.html)
- 映射模板 (mapping_templates.html)
- 后台管理 (admin.html)

**目录结构**：
```
byteproject/
├── index.html                 # 项目中心（主页）
├── admin.html                 # 后台管理
├── *.html                     # 各功能页面
├── *.js                       # 页面对应的 JS 文件
├── sidebar.js                 # 侧边栏公共组件
├── common/                    # 公共代码
│   └── app-core.js           # 核心 API 调用
├── automation_suite/          # 自动化套件
├── data_export_center/        # 数据导出中心
├── execution_board/           # 执行看板
├── order_list/                # 订单列表
├── performance/               # 性能分析
├── project_analysis/          # 项目分析
├── project_automation/        # 项目自动化
├── project_report/            # 项目日报
├── rebate_management/         # 返点管理
├── talent_pool/               # 达人池
├── talent_schedule/           # 达人档期
├── talent_selection/          # 达人选择
├── task_center/               # 任务中心
├── works_management/          # 作品管理
└── legacy/                    # 旧版代码（备份）
```

---

## 🚀 添加新前端项目

### 1. 创建项目目录

```bash
mkdir frontends/your-product-name
```

### 2. 开发你的前端代码

```bash
cd frontends/your-product-name
# 开发你的 HTML、CSS、JavaScript
```

### 3. 配置 Cloudflare Pages

**创建新的 Cloudflare Pages 项目**：
- 项目名称：your-product-name
- 连接仓库：my-product-frontend
- 分支：main
- **根目录**：`frontends/your-product-name`
- 构建命令：(空，纯静态)
- 输出目录：`/`

### 4. 配置域名

在 Cloudflare Pages 项目设置中配置自定义域名。

---

## 🔗 共享资源

所有前端项目共享以下后端资源：

### 云函数 (functions/)
- 51 个云函数提供统一的后端 API
- 部署在火山引擎云函数平台
- 详见：[functions/INDEX.md](../functions/INDEX.md)

### 数据库 Schema (database/)
- MongoDB 数据库结构定义
- 12 个集合的完整 Schema
- 详见：[database/README.md](../database/README.md)

---

## 📖 开发规范

### 目录组织

每个前端项目应该：
- ✅ 完全独立，不依赖其他前端项目
- ✅ 使用清晰的目录结构
- ✅ 包含必要的 README.md 说明
- ✅ 独立的 Cloudflare Pages 部署

### 代码规范

- 使用语义化的 HTML
- JavaScript 采用模块化组织
- CSS 使用 Tailwind CSS 或其他框架
- 接口调用统一使用云函数

### API 调用

所有前端项目调用后端 API 的方式：

```javascript
// 调用云函数
const response = await fetch('https://your-api.volcengine.com/getTalents', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        page: 1,
        limit: 20
    })
});
const data = await response.json();
```

---

## 🔄 部署流程

### 开发环境

1. 本地开发和测试
2. 使用浏览器直接打开 HTML 文件测试

### 生产环境

1. 提交代码到 GitHub main 分支
2. Cloudflare Pages 自动检测变更
3. 自动构建和部署
4. 访问生产域名验证

---

## ⚠️ 注意事项

1. **独立部署**
   - 每个前端项目有独立的 Cloudflare Pages 配置
   - 修改一个项目不影响其他项目

2. **共享后端**
   - 所有前端共用 functions/ 和 database/
   - 后端 API 变更需要考虑所有前端的兼容性

3. **代码复用**
   - 如果需要复用代码，直接复制到各自项目
   - 不使用跨项目的相对路径引用

4. **版本管理**
   - 所有前端项目在同一个 Git 仓库
   - 使用统一的版本号和发布节奏

---

## 📊 项目状态

| 项目名 | 状态 | 部署平台 | 域名 | 最后更新 |
|--------|------|---------|------|---------|
| byteproject | ✅ 运行中 | Cloudflare Pages | [域名] | 2025-11-11 |
| [未来项目] | ⏸️ 计划中 | - | - | - |

---

**最后更新**：2025-11-11
**维护者**：开发团队
