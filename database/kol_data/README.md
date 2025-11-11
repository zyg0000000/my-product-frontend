# KOL Data (v1.0 数据库)

> **注意**：这是旧版（1.0）产品的数据库定义，对应前端 `frontends/byteproject/`

---

## 📊 数据库信息

- **数据库名称**: `kol_data`
- **数据库类型**: MongoDB (NoSQL)
- **关联前端**: `frontends/byteproject/`
- **版本**: v1.0
- **状态**: 稳定维护中（继续支持 1.0 产品）

---

## 🗄️ 核心特点

- **单平台设计**：仅支持抖音（douyin）平台
- **达人数据**：一个达人一条记录
- **项目管理**：基于抖音星图的项目流程
- **成熟稳定**：已上线运行，数据量大

---

## 📁 目录说明

```
kol_data/
├── README.md              # 本文件
├── schemas/               # 数据库 Schema 定义（12个集合）
│   ├── INDEX.md           # Schema 文件索引
│   ├── talents.schema.json           # 达人信息（单平台）
│   ├── projects.schema.json          # 项目信息
│   ├── collaborations.schema.json    # 合作订单
│   └── ...（其他9个）
│
├── indexes/               # 索引定义
│   ├── talents.indexes.json
│   ├── projects.indexes.json
│   └── collaborations.indexes.json
│
├── migrations/            # 数据迁移脚本
│
└── scripts/               # 数据库管理脚本
    └── sync-schema.sh     # Schema 同步工具
```

---

## 📚 完整文档

| 文档 | 说明 | 阅读时间 |
|------|------|---------|
| [Schema 同步指南](./SCHEMA_SYNC_GUIDE.md) | 如何从 MongoDB 同步 Schema | 10 分钟 |
| [快速开始](./QUICKSTART.md) | 快速上手 Schema 管理 | 5 分钟 |
| [实战教程](./TUTORIAL.md) | 详细使用教程 | 30 分钟 |
| [Mac 设置指南](./MAC_SETUP.md) | Mac 环境配置 | 15 分钟 |
| [场景演示](./DEMO.md) | 4 个真实场景演示 | 20 分钟 |

---

## 🔗 相关链接

- **v2.0 数据库**：`../agentworks_db/`（多平台架构）
- **云函数代码**：`../../functions/`
- **前端代码**：`../../frontends/byteproject/`

---

## ⚠️ 重要提示

1. **不要直接修改生产数据库的 Schema**
2. **所有变更请先在测试环境验证**
3. **使用 migrations/ 脚本进行数据迁移**
4. **定期备份数据库**

---

**维护者**：产品团队
**最后更新**：2025-11-11
**版本**：v1.0 (Stable)
