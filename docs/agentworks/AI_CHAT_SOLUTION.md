# AgentWorks AI 对话式交互功能 - 完整实施方案

> **目标**：为 AgentWorks 产品接入 AI 大模型，实现无需前端界面操作的对话式产品使用体验
>
> **创建日期**：2025-12-11
>
> **状态**：待实施

---

## 一、AgentWorks 产品现状

### 1.1 产品定位
**达人代理项目管理系统**，服务 MCN 机构和广告代理商，管理达人资源、客户关系、项目执行和财务结算。

### 1.2 核心功能模块

| 模块 | 功能 | 主要操作 |
|------|------|---------|
| 达人管理 | 多平台达人资源 | 创建/编辑达人、价格管理、返点配置、表现数据 |
| 客户管理 | 客户及业务策略 | 客户CRUD、达人池管理、平台定价、KPI设置 |
| 项目管理 | 项目全流程 | 项目创建、合作记录、执行追踪、财务结算、效果验收 |
| 数据分析 | 多维度展示 | 全景视图、表现分析、数据导入导出 |

### 1.3 技术架构

```
前端: React 19 + TypeScript + Ant Design 6 + Tailwind CSS
      部署于 Cloudflare Pages

后端: 51个火山引擎云函数
      API Gateway: sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com

数据库: MongoDB (agentworks_db)
        火山引擎托管
```

### 1.4 数据库结构 (agentworks_db)

| 集合 | 文档数 | 用途 |
|------|--------|------|
| talents | 3 | 达人档案（oneId 跨平台管理） |
| talent_performance | 10 | 达人表现数据时序 |
| customers | 2 | 客户信息和业务策略 |
| customer_talents | 3 | 客户-达人关联（达人池） |
| projects | 2 | 项目管理 |
| collaborations | 1 | 合作订单记录 |
| agencies | 2 | 机构信息 |
| rebate_configs | 2 | 返点配置 |
| system_config | 5 | 系统配置（平台、标签） |

---

## 二、AI 对话功能设计

### 2.1 用户交互场景

```
场景一：数据查询
├── "帮我查一下抖音商城有多少达人"
├── "找粉丝超过200万、CPM低于20的抖音达人"
└── "测试项目的预算执行率是多少"

场景二：数据分析
├── "分析达人池的粉丝性别分布"
├── "哪些达人的互动率超过行业平均"
└── "这个月项目的整体财务情况"

场景三：业务操作（需确认）
├── "给抖音商城添加一个新达人"
├── "创建一个新的合作记录"
└── "更新这个合作的状态为已发布"

场景四：报表生成
├── "导出这个月所有项目的财务汇总"
└── "生成达人池分析报告"
```

### 2.2 信息流架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           完整信息流                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   用户 (中国大陆)                                                            │
│         │                                                                   │
│         ▼                                                                   │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │              AgentWorks 前端 (Cloudflare Pages)                  │      │
│   │         @ant-design/x 聊天组件 (Bubble + Sender)                 │      │
│   └──────────────────────────┬──────────────────────────────────────┘      │
│                              │ HTTPS                                        │
│                              ▼                                              │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │              火山引擎 API Gateway (现有)                          │      │
│   └──────────────────────────┬──────────────────────────────────────┘      │
│                              │                                              │
│                              ▼                                              │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │                   ai-chat 云函数 (新增)                          │      │
│   │  ┌─────────────────────────────────────────────────────────┐   │      │
│   │  │  1. 接收用户消息 + 历史上下文                             │   │      │
│   │  │  2. 构造 System Prompt + Tools 定义                      │   │      │
│   │  │  3. 调用豆包 1.6 API (Function Calling)                  │   │      │
│   │  │  4. 解析 AI 返回，执行工具函数                            │   │      │
│   │  │  5. 将工具结果返回 AI，生成最终回复                       │   │      │
│   │  │  6. 返回格式化的回复给前端                                │   │      │
│   │  └─────────────────────────────────────────────────────────┘   │      │
│   └──────────────────────────┬──────────────────────────────────────┘      │
│                              │                                              │
│         ┌────────────────────┼────────────────────┐                        │
│         ▼                    ▼                    ▼                        │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────────────┐               │
│  │ 豆包 1.6 API │    │ 现有51个    │    │    MongoDB       │               │
│  │ (火山方舟)   │    │ 云函数      │    │  agentworks_db   │               │
│  │             │    │             │    │                  │               │
│  │ doubao-1.6  │    │ getTalents  │    │ talents          │               │
│  │ -pro-32k    │    │ getProjects │    │ customers        │               │
│  │             │    │ customers   │    │ projects         │               │
│  │             │    │ ...         │    │ collaborations   │               │
│  └─────────────┘    └─────────────┘    └──────────────────┘               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 三、技术选型

### 3.1 AI 模型：豆包 1.6 (火山方舟)

| 选型理由 | 说明 |
|----------|------|
| 国内原生可用 | 无需代理，合规无风险 |
| 同一生态 | 已用火山引擎 MongoDB + API Gateway |
| 成本低 | 比 GPT-4 便宜 5-10 倍 |
| Function Calling | 完整支持工具调用 |
| 中文优化 | 中文理解能力强 |

**模型选择**：`doubao-1.6-pro-32k`

**API 端点**：`https://ark.cn-beijing.volces.com/api/v3/chat/completions`

**成本估算**：

| 模型 | 输入价格 | 输出价格 | 1000次对话/月 |
|------|---------|---------|--------------|
| doubao-1.6-pro-32k | ¥4/百万token | ¥8/百万token | 约 ¥50-100 |

### 3.2 前端组件：@ant-design/x

| 选型理由 | 说明 |
|----------|------|
| 官方出品 | Ant Design 团队专为 AI 场景设计 |
| 完美兼容 | 项目已使用 Ant Design 6 |
| 开箱即用 | Bubble、Sender、Welcome 等组件齐全 |
| 减少开发 | 无需从零开发聊天 UI |

**核心组件**：
- `Bubble` - 对话气泡（支持 Markdown、打字机效果）
- `Sender` - 输入框（支持附件、快捷键）
- `Welcome` - 欢迎页
- `Prompts` - 快捷提示
- `Conversations` - 多会话管理

**安装**：
```bash
npm install @ant-design/x
```

### 3.3 方案对比（已排除）

| 方案 | 结论 | 原因 |
|------|------|------|
| Coze 平台 | ❌ 不选 | 数据过第三方、定制性差 |
| GPT-4/Claude | ❌ 不选 | 国内访问受限、成本高 |
| 自研聊天组件 | ❌ 不选 | 开发量大、重复造轮子 |

---

## 四、功能详细设计

### 4.1 工具函数定义 (Function Calling)

```javascript
const tools = [
  // 达人查询
  {
    type: 'function',
    function: {
      name: 'searchTalents',
      description: '搜索达人列表，支持按平台、粉丝数、CPM、返点等筛选',
      parameters: {
        type: 'object',
        properties: {
          platform: { type: 'string', enum: ['douyin', 'xiaohongshu'], description: '平台' },
          keyword: { type: 'string', description: '达人名称关键词' },
          minFans: { type: 'number', description: '最小粉丝数' },
          maxCpm: { type: 'number', description: '最大CPM' },
          customerId: { type: 'string', description: '客户编码，查询该客户达人池' }
        }
      }
    }
  },

  // 客户查询
  {
    type: 'function',
    function: {
      name: 'getCustomerInfo',
      description: '获取客户详情，包括达人池数量、业务策略、KPI配置等',
      parameters: {
        type: 'object',
        properties: {
          customerName: { type: 'string', description: '客户名称' },
          customerId: { type: 'string', description: '客户编码如CUS20250001' }
        }
      }
    }
  },

  // 项目查询
  {
    type: 'function',
    function: {
      name: 'getProjectStatus',
      description: '获取项目执行状态，包括预算、执行率、合作达人数、财务指标',
      parameters: {
        type: 'object',
        properties: {
          projectName: { type: 'string', description: '项目名称' },
          projectId: { type: 'string', description: '项目ID' }
        }
      }
    }
  },

  // 合作记录查询
  {
    type: 'function',
    function: {
      name: 'getCollaborations',
      description: '获取项目的合作记录列表',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: '项目ID' },
          status: { type: 'string', description: '状态筛选' }
        },
        required: ['projectId']
      }
    }
  },

  // 达人表现数据
  {
    type: 'function',
    function: {
      name: 'getTalentPerformance',
      description: '获取达人的表现数据，包括粉丝画像、互动率、CPM等',
      parameters: {
        type: 'object',
        properties: {
          talentName: { type: 'string', description: '达人名称' },
          oneId: { type: 'string', description: '达人oneId' },
          platform: { type: 'string', description: '平台' }
        }
      }
    }
  },

  // 统计分析
  {
    type: 'function',
    function: {
      name: 'getAnalytics',
      description: '获取统计分析数据',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['talent_pool', 'project_financial', 'kpi_achievement'],
            description: '分析类型'
          },
          customerId: { type: 'string', description: '客户编码' },
          projectId: { type: 'string', description: '项目ID' }
        }
      }
    }
  }
];
```

### 4.2 System Prompt 设计

```
你是 AgentWorks 智能助手，帮助用户管理达人、客户和项目。

## 角色定位
- 专业的达人代理业务助手
- 熟悉 MCN 机构和广告代理商的工作流程
- 能够快速查询和分析业务数据

## 输出规范
1. 使用简洁专业的语言
2. 金额显示：以"分"存储，展示时转换为"元"，超过1万用"万"，超过1亿用"亿"
3. 表格数据用 Markdown 表格展示
4. 关键数据用 **加粗** 突出
5. 百分比保留1位小数

## 业务术语
- oneId: 达人跨平台统一标识
- CPM: 千次播放成本（Cost Per Mille）
- 返点: 达人合作的返现比例
- 执行率: 已执行金额/预算
- 达人池: 客户关联的可合作达人列表

## 平台说明
- douyin: 抖音
- xiaohongshu: 小红书

## 回复示例
用户: 查一下测试项目的执行情况
回复:
**测试项目** 执行概况：

| 指标 | 数值 |
|------|------|
| 预算 | 1亿 |
| 已执行 | 1330万 |
| 执行率 | 13.3% |
| 合作达人 | 1人 |
| 状态 | 执行中 |

需要查看详细的合作记录吗？
```

### 4.3 前端 UI 设计

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  AgentWorks                                              [👤] [⚙️] [🤖]    │
├────────────┬────────────────────────────────────────────────────────────────┤
│            │                                                                │
│  📊 首页    │                      主内容区                                  │
│  👤 达人    │                                                                │
│  🏢 客户    │                                                                │
│  📁 项目    │                                                                │
│  📈 分析    │                                                                │
│            │                                                                │
└────────────┴────────────────────────────────────────────────────────────────┘
                                                                    │
                                              点击 🤖 按钮展开 ──────┘
                                                                    │
                                                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  AgentWorks                                              [👤] [⚙️] [🤖]    │
├────────────┬──────────────────────────────────────┬─────────────────────────┤
│            │                                      │ 💬 AI 助手         [✕] │
│  📊 首页    │           主内容区                   │─────────────────────────│
│  👤 达人    │                                      │  🤖 你好！我是 AI 助手  │
│  🏢 客户    │                                      │  我可以帮你：           │
│  📁 项目    │                                      │  • 查询达人信息         │
│  📈 分析    │                                      │  • 分析项目数据         │
│            │                                      │  • 管理合作记录         │
│            │                                      │─────────────────────────│
│            │                                      │ [查达人池] [项目进度]   │
│            │                                      │─────────────────────────│
│            │                                      │                         │
│            │                                      │      用户消息... 👤     │
│            │                                      │                         │
│            │                                      │ 🤖 AI 回复...           │
│            │                                      │    (Markdown 渲染)      │
│            │                                      │                         │
│            │                                      │─────────────────────────│
│            │                                      │ [输入消息...]       📤  │
└────────────┴──────────────────────────────────────┴─────────────────────────┘
```

---

## 五、文件结构

### 5.1 新增文件清单

```
前端 (frontends/agentworks/src/)
├── components/
│   └── AIChat/                      # 新增目录
│       ├── AIChatPanel.tsx          # 主聊天面板组件
│       ├── AIChatButton.tsx         # 悬浮按钮组件
│       ├── ChatMessages.tsx         # 消息列表组件
│       ├── QuickPrompts.tsx         # 快捷提示组件
│       └── types.ts                 # 类型定义
├── api/
│   └── aiChat.ts                    # 新增: AI 聊天 API 调用
├── hooks/
│   └── useAIChat.ts                 # 新增: 聊天状态管理 Hook
└── components/Layout/
    └── MainLayout.tsx               # 修改: 集成 AI 聊天入口

云函数 (functions/)
└── ai-chat/                         # 新增目录
    ├── index.js                     # 主入口函数
    ├── tools.js                     # 工具函数定义
    ├── prompts.js                   # System Prompt 配置
    ├── executor.js                  # 工具执行器
    └── package.json                 # 依赖配置
```

### 5.2 依赖安装

```bash
# 前端
cd frontends/agentworks
npm install @ant-design/x

# 云函数
cd functions/ai-chat
npm init -y
npm install node-fetch
```

---

## 六、核心代码实现

### 6.1 云函数: ai-chat/index.js

```javascript
const { tools, systemPrompt } = require('./tools');
const { executeFunction } = require('./executor');

const VOLC_API_KEY = process.env.VOLC_ARK_API_KEY;
const VOLC_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const MODEL = 'doubao-1.6-pro-32k';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

function success(data) {
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ success: true, ...data })
  };
}

function error500(message) {
  return {
    statusCode: 500,
    headers: corsHeaders,
    body: JSON.stringify({ success: false, error: message })
  };
}

exports.handler = async (event, context) => {
  // CORS 预检
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    const { messages } = JSON.parse(event.body);

    // 1. 调用豆包 API
    const response = await fetch(VOLC_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VOLC_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        tools: tools,
        tool_choice: 'auto'
      })
    });

    const result = await response.json();
    const assistantMessage = result.choices[0].message;

    // 2. 处理工具调用
    if (assistantMessage.tool_calls) {
      const toolResults = [];

      for (const toolCall of assistantMessage.tool_calls) {
        const { name, arguments: args } = toolCall.function;
        const toolResult = await executeFunction(name, JSON.parse(args));
        toolResults.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          content: JSON.stringify(toolResult)
        });
      }

      // 3. 生成最终回复
      const finalResponse = await fetch(VOLC_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${VOLC_API_KEY}`
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
            assistantMessage,
            ...toolResults
          ]
        })
      });

      const finalResult = await finalResponse.json();
      return success({ reply: finalResult.choices[0].message.content });
    }

    // 直接回复（不需要工具）
    return success({ reply: assistantMessage.content });

  } catch (error) {
    console.error('AI Chat Error:', error);
    return error500(error.message);
  }
};
```

### 6.2 云函数: ai-chat/executor.js

```javascript
const API_BASE = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';

async function callAPI(endpoint, params = {}) {
  const url = new URL(`${API_BASE}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.append(key, value);
    }
  });

  const response = await fetch(url.toString());
  return response.json();
}

async function executeFunction(name, args) {
  switch (name) {
    case 'searchTalents':
      return callAPI('/getTalents', {
        dbVersion: 'v2',
        platform: args.platform,
        searchTerm: args.keyword,
        customerId: args.customerId
      });

    case 'getCustomerInfo':
      if (args.customerName) {
        return callAPI('/customers', { name: args.customerName });
      }
      return callAPI('/customers', { id: args.customerId });

    case 'getProjectStatus':
      return callAPI('/getProjects', {
        dbVersion: 'v2',
        projectId: args.projectId,
        view: 'full'
      });

    case 'getCollaborations':
      return callAPI('/getCollaborators', {
        dbVersion: 'v2',
        projectId: args.projectId,
        status: args.status
      });

    case 'getTalentPerformance':
      return callAPI('/talentPerformance', {
        oneId: args.oneId,
        platform: args.platform
      });

    case 'getAnalytics':
      // 根据分析类型调用不同的 API
      if (args.type === 'talent_pool' && args.customerId) {
        return callAPI('/customerTalents', { customerId: args.customerId });
      }
      if (args.type === 'project_financial' && args.projectId) {
        return callAPI('/getProjects', { projectId: args.projectId, view: 'full' });
      }
      return { error: 'Unknown analytics type' };

    default:
      return { error: `Unknown function: ${name}` };
  }
}

module.exports = { executeFunction };
```

### 6.3 前端组件: AIChatPanel.tsx

```tsx
import { useState, useRef, useEffect } from 'react';
import { Bubble, Sender, Welcome, Prompts } from '@ant-design/x';
import { UserOutlined, RobotOutlined, CloseOutlined } from '@ant-design/icons';
import { post } from '@/api/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function AIChatPanel({ visible, onClose }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    { key: '1', label: '📊 查看达人池', description: '查询客户的达人资源' },
    { key: '2', label: '📈 项目进度', description: '查看项目执行情况' },
    { key: '3', label: '🔍 找达人', description: '按条件搜索达人' },
  ];

  const handleSend = async (content: string) => {
    if (!content.trim() || loading) return;

    const userMessage: Message = { role: 'user', content };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await post<{ reply: string }>('/ai-chat', {
        messages: newMessages
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.reply
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '抱歉，出现了错误，请稍后重试。'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handlePromptClick = (key: string) => {
    const prompts: Record<string, string> = {
      '1': '帮我查看抖音商城的达人池情况',
      '2': '测试项目的执行进度如何',
      '3': '帮我找CPM低于20的抖音达人',
    };
    handleSend(prompts[key] || '');
  };

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!visible) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl flex flex-col z-50 border-l">
      {/* 头部 */}
      <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        <span className="font-medium flex items-center gap-2">
          <RobotOutlined /> AI 助手
        </span>
        <button onClick={onClose} className="hover:bg-white/20 p-1 rounded">
          <CloseOutlined />
        </button>
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <>
            <Welcome
              icon={<RobotOutlined style={{ fontSize: 40, color: '#1890ff' }} />}
              title="AgentWorks AI 助手"
              description="我可以帮你查询达人、分析项目、管理合作记录"
              className="mb-4"
            />
            <Prompts
              items={quickPrompts}
              onItemClick={(item) => handlePromptClick(item.key)}
            />
          </>
        ) : (
          messages.map((msg, index) => (
            <Bubble
              key={index}
              placement={msg.role === 'user' ? 'end' : 'start'}
              content={msg.content}
              avatar={msg.role === 'user'
                ? { icon: <UserOutlined /> }
                : { icon: <RobotOutlined />, style: { background: '#1890ff' } }
              }
              loading={loading && index === messages.length - 1 && msg.role === 'assistant'}
              className="mb-3"
            />
          ))
        )}
        {loading && messages[messages.length - 1]?.role === 'user' && (
          <Bubble
            placement="start"
            content=""
            avatar={{ icon: <RobotOutlined />, style: { background: '#1890ff' } }}
            loading
            className="mb-3"
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div className="p-4 border-t">
        <Sender
          placeholder="输入消息，按 Enter 发送..."
          onSubmit={handleSend}
          loading={loading}
          disabled={loading}
        />
      </div>
    </div>
  );
}
```

### 6.4 前端组件: AIChatButton.tsx

```tsx
import { RobotOutlined } from '@ant-design/icons';

interface AIChatButtonProps {
  onClick: () => void;
}

export function AIChatButton({ onClick }: AIChatButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600
                 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200
                 flex items-center justify-center text-xl hover:scale-110 z-40"
      title="AI 助手"
    >
      <RobotOutlined />
    </button>
  );
}
```

### 6.5 集成到 MainLayout

```tsx
// frontends/agentworks/src/components/Layout/MainLayout.tsx

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../Sidebar/Sidebar';
import { AIChatPanel } from '../AIChat/AIChatPanel';
import { AIChatButton } from '../AIChat/AIChatButton';

export function MainLayout() {
  const [showAIChat, setShowAIChat] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* AI 聊天面板 */}
      <AIChatPanel
        visible={showAIChat}
        onClose={() => setShowAIChat(false)}
      />

      {/* 悬浮按钮 */}
      {!showAIChat && (
        <AIChatButton onClick={() => setShowAIChat(true)} />
      )}
    </div>
  );
}
```

---

## 七、实施计划

### 7.1 开发阶段

| 阶段 | 任务 | 工作量 | 产出 |
|------|------|--------|------|
| **Phase 1** | 环境准备 | 0.5天 | API Key、依赖安装 |
| **Phase 2** | 云函数开发 | 2天 | ai-chat 函数完成 |
| **Phase 3** | 前端组件 | 1.5天 | 聊天面板完成 |
| **Phase 4** | 集成联调 | 1天 | 端到端测试通过 |
| **总计** | | **5天** | MVP 版本上线 |

### 7.2 详细任务清单

```
Phase 1: 环境准备 (0.5天)
├── [ ] 开通火山方舟，获取 API Key
├── [ ] 配置环境变量 VOLC_ARK_API_KEY
├── [ ] 安装 @ant-design/x 依赖
└── [ ] 创建 ai-chat 云函数目录

Phase 2: 云函数开发 (2天)
├── [ ] 实现 index.js 主入口
├── [ ] 实现 tools.js 工具定义
├── [ ] 实现 prompts.js System Prompt
├── [ ] 实现 executor.js 工具执行器
├── [ ] 对接现有 API (getTalents, getProjects, customers, getCollaborators)
├── [ ] 错误处理和日志
├── [ ] 本地测试
└── [ ] 部署到火山引擎

Phase 3: 前端组件 (1.5天)
├── [ ] AIChatPanel.tsx 主组件
├── [ ] AIChatButton.tsx 悬浮按钮
├── [ ] types.ts 类型定义
├── [ ] api/aiChat.ts API 调用
├── [ ] 集成到 MainLayout
└── [ ] 样式调整和响应式

Phase 4: 集成联调 (1天)
├── [ ] 端到端测试
├── [ ] 各场景验证（查询、分析）
├── [ ] 性能测试
├── [ ] Bug 修复
└── [ ] 文档更新
```

### 7.3 后续迭代（可选）

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 流式输出 | P1 | 打字机效果，体验更好 |
| 多轮对话优化 | P1 | 上下文记忆增强 |
| 会话历史 | P2 | 保存历史对话到本地/服务器 |
| 写操作支持 | P2 | 创建达人、合作等（需二次确认） |
| 语音输入 | P3 | 语音转文字 |
| 飞书/企微接入 | P3 | 多渠道支持 |

---

## 八、成本预估

### 8.1 开发成本
- 人力：5 人天
- 无额外基础设施费用（复用现有火山引擎）

### 8.2 运营成本（豆包 API）

| 使用量 | 月成本 |
|--------|--------|
| 100 次/天 | ¥15-30 |
| 500 次/天 | ¥75-150 |
| 1000 次/天 | ¥150-300 |

---

## 九、风险和应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| AI 回答不准确 | 用户体验差 | 优化 Prompt、添加反馈机制 |
| API 延迟高 | 响应慢 | 流式输出、加载动画 |
| 成本超预期 | 预算超支 | 设置调用频率限制 |
| 数据安全 | 敏感数据泄露 | 仅传必要数据、脱敏处理 |

---

## 十、总结

本方案采用 **豆包 1.6 API + @ant-design/x** 技术栈，实现 AgentWorks 的 AI 对话式交互功能：

| 优势 | 说明 |
|------|------|
| ✅ 成本低 | 复用现有架构，API 费用低廉 |
| ✅ 开发快 | 5天完成 MVP |
| ✅ 体验好 | 现成 UI 组件，Markdown 渲染 |
| ✅ 可扩展 | Function Calling 支持任意业务操作 |
| ✅ 合规 | 数据不出境，国内原生服务 |

---

## 附录

### A. 相关文档
- [火山方舟文档](https://www.volcengine.com/docs/82379)
- [Ant Design X 文档](https://x.ant.design)
- [豆包 API 定价](https://www.volcengine.com/pricing?product=doubao)

### B. 环境变量配置
```bash
# 火山引擎云函数环境变量
VOLC_ARK_API_KEY=your_api_key_here
```

### C. API Gateway 配置
需要在火山引擎 API Gateway 添加新的路由：
- 路径: `/ai-chat`
- 方法: `POST`
- 后端: `ai-chat` 云函数
