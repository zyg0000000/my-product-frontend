# 自动化功能详解

> **页面文件**: `frontends/agentworks/src/pages/Automation/`
> **更新时间**: 2025-12-24
> **架构**: 工作流管理 + ECS 服务器执行

---

## 概述

AgentWorks 自动化模块用于批量执行重复性数据采集任务，包括截图抓取、数据提取等。采用工作流引擎驱动，支持多平台、多场景的自动化操作。

### 核心特性

- **多平台支持**: 抖音（星图）、小红书（蒲公英）等平台
- **工作流管理**: 完整的 CRUD 操作，可视化编辑
- **ECS 云端执行**: 服务器部署 Puppeteer 执行器
- **配置驱动**: 输入参数从平台配置动态获取

---

## 模块结构

```
src/pages/Automation/
├── AutomationDashboard.tsx    # 控制台（服务器状态、Cookie 管理）
└── Workflows/
    ├── WorkflowList.tsx       # 工作流列表
    ├── WorkflowEditor.tsx     # 工作流编辑器
    └── WorkflowExecuteModal.tsx # 执行弹窗

src/components/automation/
├── ServerStatus.tsx           # 服务器状态卡片
├── SessionManager.tsx         # 会话管理卡片
└── WorkflowExecutor.tsx       # 工作流执行器

src/hooks/
└── useWorkflows.ts            # 工作流数据管理 Hook

src/types/
└── workflow.ts                # 工作流类型定义
```

---

## 工作流数据模型

### 类型定义

```typescript
// src/types/workflow.ts
interface Workflow {
  _id: string;
  name: string;
  description?: string;
  type?: 'screenshot' | 'data_scraping' | 'composite';

  // 多平台支持
  platform: Platform;

  // 输入配置（配置驱动）
  inputConfig: WorkflowInputConfig;

  // 步骤定义
  steps: WorkflowStep[];

  // 状态
  isActive: boolean;

  createdAt: string;
  updatedAt: string;
}

interface WorkflowInputConfig {
  key: string;              // 参数键名（如 xingtuId）
  label: string;            // 显示标签
  placeholder?: string;
  platform?: Platform;      // 关联平台
  idSource: 'talent' | 'collaboration' | 'custom';
  idField?: string;         // 对应的数据库字段
  required?: boolean;
}
```

### 预定义输入配置

```typescript
// WORKFLOW_INPUT_CONFIGS
{
  xingtuId: {
    key: 'xingtuId',
    label: '星图ID',
    platform: 'douyin',
    idSource: 'talent',
    idField: 'platformAccountId',  // 从 talent.platformAccountId 取值
  },
  douyinTaskId: {
    key: 'taskId',
    label: '星图任务ID',
    platform: 'douyin',
    idSource: 'collaboration',
    idField: 'taskId',
  },
  douyinVideoId: {
    key: 'videoId',
    label: '抖音视频ID',
    platform: 'douyin',
    idSource: 'collaboration',
    idField: 'videoId',
  },
}
```

---

## 工作流步骤类型

| 动作类型 | 说明 | 主要参数 |
|---------|------|---------|
| `Go to URL` | 导航到 URL | url |
| `waitForSelector` | 等待元素出现 | selector, timeout |
| `click` | 点击元素 | selector |
| `screenshot` | 截图 | saveAs, stitched |
| `wait` | 等待时间 | milliseconds |
| `scrollPage` | 滚动页面 | - |
| `extractData` | 提取数据 | selector, dataName |
| `compositeExtract` | 复合提取 | template, sources |
| `type` | 输入文本 | selector, text |
| `evaluate` | 执行脚本 | script |

### URL 变量替换

工作流 URL 支持变量占位符，执行时自动替换：

| 占位符 | 说明 | 来源 |
|--------|------|------|
| `{{xingtuId}}` | 星图ID | task.xingtuId 参数 |
| `{{taskId}}` | 任务ID | task.taskId 参数 |
| `{{videoId}}` | 视频ID | task.videoId 参数 |

---

## ECS 服务器

### 服务器信息

| 配置项 | 值 |
|--------|-----|
| 公网 IP | `14.103.18.8` |
| API 端口 | `3001` |
| 项目目录 | `/opt/puppeteer-executor/` |

### API 接口

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/status` | 服务器状态 |
| GET | `/api/cookie-status` | Cookie 状态 |
| GET | `/api/workflows` | 获取工作流列表 |
| POST | `/api/task/execute` | 执行任务 |
| POST | `/api/task/batch` | 批量执行 |
| POST | `/api/cookie/upload` | 上传 Cookie |

### Cookie 刷新

Cookie 过期后需要手动刷新：

```bash
# 1. 本地运行登录脚本
cd /Users/yigongzhang/字节专用程序/截图套件
node refresh-cookie.js

# 2. 在浏览器中完成登录
# 3. 脚本自动上传 Cookie 到 ECS
```

详细说明参考: `截图套件/ECS-操作说明.md`

---

## 前端组件

### AutomationDashboard

ECS 服务控制中心，显示：
- 服务器运行状态和内存使用
- Cookie 会话状态和有效期
- 快速统计卡片
- 工作流执行器

### WorkflowList

工作流管理列表，支持：
- 按平台筛选
- 搜索工作流
- 启用/停用工作流
- 编辑和删除

### WorkflowEditor

可视化工作流编辑器，功能：
- 拖拽排序步骤
- 动作库选择
- 参数配置表单
- 步骤预览

### WorkflowExecuteModal

执行弹窗组件，用于：
- 选择工作流
- 输入参数
- 查看执行结果

---

## ID 架构说明

AgentWorks 统一使用 `platformAccountId` 作为平台账号 ID 的存储字段：

```
AgentWorks 达人数据:
├── platformAccountId: "7069698789983911971"  ← 星图ID（必填）
└── platformSpecific:
    └── uid: "827303091503240"                ← 抖音UID（可选）

工作流执行时:
AgentWorks 从 talent.platformAccountId 获取值
  → 传给 ECS: { xingtuId: "xxx" }
  → ECS 替换 {{xingtuId}} 变量
```

---

## 数据库

### 工作流集合

- **AgentWorks**: `agentworks_db.automation-workflows`
- **ByteProject**: `kol_data.automation-workflows`（独立管理）

### 云函数 API

```
GET    /automation-workflows?platform=douyin   # 按平台筛选
POST   /automation-workflows                    # 创建
PUT    /automation-workflows?id=xxx            # 更新
DELETE /automation-workflows?id=xxx            # 删除
```

---

## 待开发功能

### P0 - 高优先级

1. **工作流管理页面优化**
   - 移除渐变统计卡片
   - 简化筛选栏布局
   - 简化工作流卡片样式

2. **达人详情页集成工作流执行**
   - 添加「爬取数据」按钮
   - 自动填充 platformAccountId
   - 支持选择工作流类型

### P1 - 中优先级

3. **滑块验证自动处理**
4. **执行失败自动重试**

### P2 - 低优先级

5. **告警通知**（Cookie 过期、连续失败）
6. **多平台扩展**（小红书蒲公英）

---

## 相关文档

- [ECS 操作说明](../../../../截图套件/ECS-操作说明.md)
- [待办开发计划](../../../../截图套件/待办-开发计划.md)
- [云函数 API 文档](../api/API_REFERENCE.md)

---

## 报名管理 - 飞书表格生成

### 概述

报名管理模块支持将抓取的达人数据生成飞书表格，以及追加新数据到已有表格。

### 生成表格

选择已抓取成功的达人，点击「生成飞书表格」：
1. 选择报告模板
2. 输入表格名称
3. 可选：指定保存目录
4. 生成后自动打开飞书文档

### 追加数据到已有表格

在「已生成表格」区域点击「追加」按钮：
1. 自动筛选可追加的达人（已抓取成功且未在该表格中）
2. 勾选要追加的达人
3. 点击「追加」按钮写入飞书表格
4. 数据追加到表格末尾，保持格式一致

### 数据模型

```typescript
// 生成的表格记录
interface GeneratedSheet {
    _id: string;
    projectId: string;
    type: 'registration';
    fileName: string;
    sheetUrl: string;
    sheetToken: string;
    templateId: string;
    templateName: string;
    talentCount: number;
    collaborationIds: string[];   // 包含的达人ID列表
    createdAt: Date;
}

// 追加请求
interface AppendToSheetRequest {
    sheetId: string;           // generated_sheets 记录 ID
    sheetToken: string;        // 飞书表格 Token
    templateId: string;        // 报告模板 ID
    projectId: string;         // 项目 ID
    collaborationIds: string[]; // 要追加的合作 ID 列表
}
```

### 相关文件

- **前端组件**: `RegistrationTab/GeneratedSheetsTable.tsx`, `AppendToSheetModal.tsx`
- **云函数**: `syncFromFeishu/utils.js` - `appendToRegistrationSheet()`
- **类型定义**: `types/registration.ts`

---

**最后更新**: 2025-12-29
**文档版本**: v2.1
