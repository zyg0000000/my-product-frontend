# AgentWorks 更新日志 - 2025-12-29

## 概述

完成报名管理模块的「追加数据到已有表格」功能，支持将新抓取的达人数据追加到已生成的飞书表格中，避免重复创建表格。

---

## 新功能：追加达人数据到已有飞书表格

### 背景

之前用户每次生成飞书报名表只能新建表格，如果后续有新增达人需要添加到同一个表格，只能重新生成整张表格。现在支持选择已有表格，追加新的达人数据。

### 功能特性

1. **追加按钮**：在「已生成表格」列表中，每行增加「追加」按钮
2. **智能过滤**：自动过滤已在表格中的达人，只显示可追加的达人
3. **自动定位**：读取飞书表格现有数据行数，从末尾追加新数据
4. **数据同步**：追加成功后更新数据库中的 `collaborationIds` 和 `talentCount`

### 交互流程

1. 用户在「已生成表格」区域点击某表格的「追加」按钮
2. 弹出 `AppendToSheetModal`，显示：
   - 目标表格信息（名称、已有达人数）
   - 可追加的达人列表（已抓取成功且未在该表格中）
   - 支持全选和单选
3. 点击「追加」按钮，调用云函数写入飞书表格
4. 成功后自动刷新表格列表和达人列表

---

## 前置改动：达人-表格关联追踪

### 问题

原有的 `generated_sheets` 集合只保存 `talentCount`，没有保存 `collaborationIds`，导致：
- 无法反向查询「某达人在哪些表格中」
- 追加时无法自动过滤已在表格中的达人
- 达人列表无法显示「已在表格」标记

### 解决方案

1. **扩展数据结构**：`generateRegistrationSheet` 保存时增加 `collaborationIds` 字段
2. **历史数据迁移**：从 `requestKey` 解析并补足现有记录的 `collaborationIds`
3. **关联查询**：`listTalentsWithResults` 关联查询 `generated_sheets`，返回 `generatedSheets` 字段
4. **前端展示**：达人列表新增「已在表格」列，显示蓝色标签

---

## 文件变更

### 云函数

| 文件 | 改动内容 |
|------|----------|
| `functions/syncFromFeishu/utils.js` | 1. `generateRegistrationSheet` 保存 `collaborationIds`<br>2. 新增 `appendToRegistrationSheet` 函数 |
| `functions/registration-results/index.js` | `listTalentsWithResults` 关联查询 `generated_sheets` |

### 前端

| 文件 | 改动内容 |
|------|----------|
| `types/registration.ts` | 新增 `AppendToSheetRequest`、`AppendToSheetResponse`、`GeneratedSheetRef` 类型 |
| `api/registration.ts` | 新增 `appendToRegistrationSheet` API 函数 |
| `RegistrationTab.tsx` | 1. 达人列表新增「已在表格」列<br>2. 集成 `AppendToSheetModal` 组件 |
| `GeneratedSheetsTable.tsx` | 添加 `onAppendClick` 回调和「追加」按钮 |
| `AppendToSheetModal.tsx` | **新增**：追加数据弹窗组件 |

---

## 技术说明

### appendToRegistrationSheet 云函数

```javascript
async function appendToRegistrationSheet(payload) {
    // 1. 获取目标表格记录，检查已有的 collaborationIds
    // 2. 过滤掉已在表格中的达人
    // 3. 获取模板配置
    // 4. 获取飞书表格元信息（工作表 ID 和行数）
    // 5. 查询新增达人的报名结果
    // 6. 应用映射规则并构建数据
    // 7. 写入文本数据到飞书表格
    // 8. 写入图片数据
    // 9. 更新 generated_sheets 记录
}
```

### 请求参数

```typescript
interface AppendToSheetRequest {
    sheetId: string;           // generated_sheets 记录 ID
    sheetToken: string;        // 飞书表格 Token
    templateId: string;        // 报告模板 ID
    projectId: string;         // 项目 ID
    collaborationIds: string[]; // 要追加的合作 ID 列表
}
```

### 响应数据

```typescript
interface AppendToSheetResponse {
    appendedCount: number;     // 追加的达人数量
    skippedCount?: number;     // 跳过的达人数量（已在表格中）
    totalCount: number;        // 追加后的总达人数量
}
```

---

## 数据库修复

### 问题

历史数据迁移脚本解析 `requestKey` 时存在 bug，导致第一个 `collaborationId` 被错误地拼接了项目 ID 的一部分。

### 修复

手动修正受影响的记录：

```javascript
// 错误格式
"1766629521768_j9tvukz_collab_1766635373127_15j4nu9"

// 正确格式
"collab_1766635373127_15j4nu9"
```

---

## API 配置

追加操作使用与生成表格相同的 API 配置：

```typescript
{
    timeout: 120000,  // 2分钟超时（写入图片需要时间）
    skipRetry: true,  // 禁用重试（写操作不应重试）
}
```

---

## 测试要点

1. **追加按钮可见**：已生成表格列表中每行显示「追加」按钮
2. **智能过滤**：弹窗只显示已抓取成功且不在目标表格中的达人
3. **全选功能**：可以全选/取消全选可追加的达人
4. **追加成功**：飞书表格末尾追加新行，包含文本和图片
5. **数据同步**：追加后刷新页面，达人列表显示「已生成」标签
6. **防重复**：再次点击追加，已追加的达人不会显示在列表中

---

## 相关文档

- [报名管理功能](../features/AUTOMATION.md)
- [云函数 API 参考](../api/API_REFERENCE.md)
- [类型定义](../../../frontends/agentworks/src/types/registration.ts)

---

**开发者**: Claude Code
**日期**: 2025-12-29
**版本**: v3.7.0 (追加数据到已有表格)
