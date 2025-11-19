# 达人表现功能 - 剩余 Phase 3-6 任务清单

> **创建日期**: 2025-11-18
> **已完成**: Phase 1-2
> **待完成**: Phase 3-6 (7天)
> **建议**: 在新对话中继续

---

## ✅ 已完成（Phase 1-2）

- ✅ Phase 1: 数据库准备（0.5天）
- ✅ Phase 2: 云函数开发（2天）
  - syncFromFeishu v12.0
  - fieldMappingManager
  - dimensionConfigManager

---

## ⏳ 待完成（Phase 3-6）

### Phase 3: 配置管理界面（2天）

**路由**: `/settings/performance-config`

**组件**:
- [ ] FieldMappingManager.tsx（字段映射管理）
  - 映射规则列表（表格）
  - 添加/编辑/删除映射
  - 平台切换
  - 测试映射功能

- [ ] DimensionManager.tsx（维度配置管理）
  - 维度列表（可拖拽排序，使用 @dnd-kit/core）
  - 显示/隐藏切换
  - 添加/编辑/删除维度

**Hooks**:
- [ ] useFieldMapping.ts
- [ ] useDimensionConfig.ts

**API**: 已完成（api/performance.ts）

---

### Phase 4: 达人表现页面（2天）

**路由**: `/performance`

**页面**:
- [ ] PerformanceHome.tsx（主页面）
  - 平台 Tab 切换
  - 统计卡片
  - 表格容器

**组件**:
- [ ] PerformanceTable.tsx（核心组件）
  - 基于配置动态渲染列
  - 单元格格式化（text/number/percentage/date）
  - 排序功能
  - 加载状态
  - 空状态处理

**Hooks**:
- [ ] usePerformanceData.ts（基于 useTalentData 扩展）

**复用**:
- ✅ Pagination 组件
- ✅ Toast 组件
- ✅ useTalentData Hook

---

### Phase 5: 数据导入功能（1.5天）

**组件**:
- [ ] DataImportModal.tsx
  - 飞书 URL 输入
  - Excel 文件上传
  - 数据预览（成功/失败分开显示）
  - 统计信息（总数/成功/失败）
  - 确认导入按钮

**Hooks**:
- [ ] useDataImport.ts
  - importFromFeishu()
  - importFromExcel()
  - confirmImport()

**流程**:
1. 用户输入飞书URL
2. 调用 syncFromFeishu v12.0
3. 显示预览（validData + invalidRows）
4. 用户确认
5. 批量更新到数据库

---

### Phase 6: 完善测试（1天）

**测试清单**:
- [ ] 配置管理功能测试
- [ ] 列表展示测试
- [ ] 数据导入测试（飞书/Excel）
- [ ] 排序分页测试
- [ ] ByteProject v1 兼容性测试
- [ ] UI/UX 优化
- [ ] 文档更新

---

## 📊 工作量总结

| Phase | 状态 | 工作量 |
|-------|:----:|:------:|
| Phase 1 | ✅ | 0.5天 |
| Phase 2 | ✅ | 2天 |
| Phase 3 | ⏳ | 2天 |
| Phase 4 | ⏳ | 2天 |
| Phase 5 | ⏳ | 1.5天 |
| Phase 6 | ⏳ | 1天 |
| **已完成** | - | **2.5天** |
| **剩余** | - | **6.5天** |

---

## 🎯 建议在新对话中继续

### 原因

**Token 使用情况**:
- 已使用: 36% (364k/1000k)
- 剩余: 64% (636k)
- Phase 3-6 预计需要: ~400k tokens

**虽然足够**，但为了保持对话清晰：

**建议**:
1. 结束当前对话
2. 新对话中继续 Phase 3-6
3. 在新对话开始时，告诉我：
   - "继续达人表现功能开发，从 Phase 3 开始"
   - 我会读取这些文档继续开发

---

## 📁 交接文档

### 设计文档（2份）
1. `TALENT_PERFORMANCE_DESIGN.md` - 最终确认方案
2. `TALENT_PERFORMANCE_IMPLEMENTATION.md` - 实施计划

### 总结文档（2份）
1. `PERFORMANCE_PHASE1_SUMMARY.md` - Phase 1 总结
2. `PERFORMANCE_PHASE2_SUMMARY.md` - Phase 2 总结

### 任务清单
1. `PERFORMANCE_REMAINING_PHASES.md` - Phase 3-6 详细任务（本文档）

---

## 🎯 新对话启动指令

在新对话中输入：

```
继续开发达人表现功能，从 Phase 3 开始。

已完成：
- Phase 1: 数据库准备 ✅
- Phase 2: 云函数开发（已部署）✅

待开发：
- Phase 3: 配置管理界面
- Phase 4: 达人表现页面
- Phase 5: 数据导入功能
- Phase 6: 完善测试

请阅读以下文档开始：
- docs/features/TALENT_PERFORMANCE_DESIGN.md
- docs/features/TALENT_PERFORMANCE_IMPLEMENTATION.md
- docs/features/PERFORMANCE_REMAINING_PHASES.md
```

---

**状态**: Phase 1-2 完成，建议新对话继续

🤖 Generated with [Claude Code](https://claude.com/claude-code)
