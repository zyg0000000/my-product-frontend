# 数据库连接信息

> **Claude Code 专用文档** - 用于快速获取数据库连接信息

---

## AgentWorks 数据库 (生产环境)

**数据库名称**: `agentworks_db`

**连接字符串**:
```
mongodb://root:64223902Kz@mongoreplica6a8259b198d70.mongodb.cn-shanghai.volces.com:3717,mongoreplica6a8259b198d71.mongodb.cn-shanghai.volces.com:3717/?authSource=admin&replicaSet=rs-mongo-replica-6a8259b198d7&retryWrites=true
```

**mongosh 连接命令**:
```bash
mongosh "mongodb://root:64223902Kz@mongoreplica6a8259b198d70.mongodb.cn-shanghai.volces.com:3717,mongoreplica6a8259b198d71.mongodb.cn-shanghai.volces.com:3717/agentworks_db?authSource=admin&replicaSet=rs-mongo-replica-6a8259b198d7&retryWrites=true"
```

---

## 主要集合

| 集合名称 | 说明 |
|---------|------|
| `talents` | 达人基础信息 + 价格 |
| `talent_performance` | 达人表现数据（时间序列） |
| `field_mappings` | 字段映射配置 |
| `dimension_configs` | 维度配置 |
| `agencies` | 机构信息 |
| `rebate_configs` | 返点配置 |
| `platform_configs` | 平台配置 |

---

## 常用操作示例

### 查询字段映射
```javascript
db.field_mappings.findOne({ platform: "douyin", isActive: true })
```

### 查询维度配置
```javascript
db.dimension_configs.findOne({ platform: "douyin", isActive: true })
```

### 查询达人数据
```javascript
db.talents.find({ platform: "douyin" }).limit(10)
```

### 查询达人表现数据
```javascript
db.talent_performance.find({ platform: "douyin" }).limit(10)
```

---

**最后更新**: 2025-11-28
