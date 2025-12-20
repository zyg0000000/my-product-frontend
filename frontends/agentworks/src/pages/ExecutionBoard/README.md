# 执行看板 (ExecutionBoard)

跨项目发布计划管理系统。

## 文档

完整文档请查看: [docs/agentworks/features/projects/EXECUTION_BOARD.md](../../../../../docs/agentworks/features/projects/EXECUTION_BOARD.md)

## 快速说明

| 功能 | 说明 |
|------|------|
| 日历周视图 | 以周为单位展示发布计划，支持拖拽改期 |
| 全周期概览 | 项目周期内所有周的发布进度 |
| KPI 统计 | 发布率、延期数等关键指标 |
| 多维度筛选 | 客户、项目、平台、周期筛选 |

## 文件结构

```
ExecutionBoard/
├── ExecutionBoard.tsx    # 主页面
├── types.ts              # 类型定义
├── utils.ts              # 工具函数
├── components/           # UI 组件
└── hooks/                # 数据 Hooks
```
