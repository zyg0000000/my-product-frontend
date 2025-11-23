# Changelog

All notable changes to the platformConfigManager function will be documented in this file.

## [1.0.0] - 2025-11-23

### Added
- 初始版本发布
- RESTful API 支持 GET/POST/PUT/DELETE 操作
- 获取所有平台配置（支持 enabled 筛选）
- 获取单个平台配置
- 创建新平台配置（带完整性验证）
- 更新平台配置（版本号自动递增）
- 软删除平台配置（设置 enabled=false）
- 完整的请求日志记录（时间戳、耗时、成功/失败）
- 配置变更前后对比日志
- 统一的错误处理和响应格式
- CORS 支持

### Security
- 必填字段验证
- 配置完整性检查
- 平台唯一性保证
- 生产环境隐藏错误堆栈

## [Planned] - 未来版本

### v1.1.0
- [ ] 添加配置变更历史追踪
- [ ] 支持批量更新操作
- [ ] 添加配置版本回滚功能

### v1.2.0
- [ ] 添加权限验证
- [ ] 支持配置导入/导出
- [ ] 添加配置验证规则引擎
