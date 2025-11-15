# 返点管理系统部署清单 (v2.1)

> AgentWorks 返点管理系统完整部署指南

---

## 📋 部署概览

### 已完成 ✅
1. **云函数开发** - 3个云函数已部署到火山引擎
2. **前端开发** - UI 组件和 API 集成已完成
3. **Schema 设计** - 数据库 Schema 文档已更新

### 待完成 📝
1. **数据库初始化** - 创建集合和索引
2. **前端部署** - 推送代码触发 Cloudflare 部署

---

## 🗄️ 数据库部署

### 方式一：使用初始化脚本（推荐）

```bash
# 1. 连接到 MongoDB
mongosh "mongodb://your-mongodb-connection-string"

# 2. 运行初始化脚本
load('/path/to/database/agentworks_db/scripts/init-rebate-system.js')
```

**脚本功能：**
- ✅ 创建 `rebate_configs` 集合
- ✅ 为 `rebate_configs` 添加 6 个索引
- ✅ 更新 `talents` 集合，添加 3 个新字段
- ✅ 为所有现有达人添加默认返点配置
- ✅ 验证配置并输出示例

---

### 方式二：手动执行 MongoDB 命令

#### 步骤 1：创建 rebate_configs 集合

```javascript
use agentworks_db;

// 创建集合
db.createCollection("rebate_configs");

// 创建索引
db.rebate_configs.createIndex({ configId: 1 }, { unique: true });
db.rebate_configs.createIndex({ targetId: 1, platform: 1, createdAt: -1 });
db.rebate_configs.createIndex({ status: 1 });
db.rebate_configs.createIndex({ effectiveDate: 1 });
db.rebate_configs.createIndex({ createdBy: 1 });
db.rebate_configs.createIndex({ targetId: 1, platform: 1, status: 1 });
```

#### 步骤 2：更新 talents 集合

```javascript
// 为所有现有达人添加新字段
db.talents.updateMany(
  {
    $or: [
      { belongType: { $exists: false } },
      { currentRebate: { $exists: false } }
    ]
  },
  {
    $set: {
      belongType: "wild",
      agencyId: null,
      currentRebate: {
        rate: 10.00,
        source: "default",
        effectiveDate: new Date().toISOString().split('T')[0],
        lastUpdated: new Date()
      }
    }
  }
);
```

#### 步骤 3：验证配置

```javascript
// 验证 rebate_configs 集合
db.rebate_configs.getIndexes();

// 验证 talents 集合更新
db.talents.findOne(
  { currentRebate: { $exists: true } },
  {
    oneId: 1,
    platform: 1,
    name: 1,
    belongType: 1,
    currentRebate: 1
  }
);

// 统计已配置返点的达人数
db.talents.countDocuments({ currentRebate: { $exists: true } });
```

---

## ☁️ 云函数部署（已完成）

### 已部署的云函数

| 云函数 | 路径 | 方法 | 状态 |
|--------|------|------|------|
| getTalentRebate | `/getTalentRebate` | GET | ✅ 已部署 |
| updateTalentRebate | `/updateTalentRebate` | POST | ✅ 已部署 |
| getRebateHistory | `/getRebateHistory` | GET | ✅ 已部署 |

### API Gateway 配置

**基础 URL**: `https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com`

**环境变量**（所有云函数）:
- `MONGO_URI`: MongoDB 连接字符串
- `NODE_ENV`: production

**CORS 配置**:
```javascript
{
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, Pragma, Authorization, X-Requested-With',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
}
```

---

## 🌐 前端部署

### Git 提交和推送

```bash
# 检查当前分支
git status

# 确认在正确的分支上
git branch

# 所有更改已提交并推送
git log -1
```

**当前分支**: `claude/agentworks-updates-01XBibSEcNm4h8SXaKnU4dhb`

**提交记录**:
```
feat(rebate): implement wild talent rebate management system (Phase 1)

- 3 cloud functions (getTalentRebate, updateTalentRebate, getRebateHistory)
- Complete TypeScript type definitions
- API layer integration
- UI components (TalentDetail updates, UpdateRebateModal)
- Database schema updates
```

### Cloudflare Pages 部署

1. **合并到主分支** (如果需要)
   ```bash
   # 创建 Pull Request
   # 或直接合并（如果有权限）
   git checkout main
   git merge claude/agentworks-updates-01XBibSEcNm4h8SXaKnU4dhb
   git push origin main
   ```

2. **触发 Cloudflare 部署**
   - Cloudflare Pages 会自动检测到 `main` 分支的更新
   - 自动触发重新构建和部署
   - 通常 2-5 分钟完成

3. **验证部署**
   - 访问 Cloudflare Pages 部署页面
   - 确认构建成功
   - 访问生产环境 URL

---

## ✅ 测试验证

### 1. 数据库验证

```javascript
// 检查集合是否创建
db.getCollectionNames().includes("rebate_configs"); // 应返回 true

// 检查索引
db.rebate_configs.getIndexes().length; // 应返回 7（包括 _id 索引）

// 检查 talents 更新
db.talents.findOne({}, { belongType: 1, currentRebate: 1 });
```

### 2. 云函数测试

**测试 getTalentRebate**:
```bash
curl "https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com/getTalentRebate?oneId=talent_00000001&platform=douyin"
```

**预期响应**:
```json
{
  "success": true,
  "data": {
    "oneId": "talent_00000001",
    "platform": "douyin",
    "name": "张三",
    "belongType": "wild",
    "agencyId": null,
    "currentRebate": {
      "rate": 10.00,
      "source": "default",
      "effectiveDate": "2025-11-15",
      "lastUpdated": "2025-11-15T10:30:00.000Z"
    }
  }
}
```

**测试 updateTalentRebate**:
```bash
curl -X POST "https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com/updateTalentRebate" \
  -H "Content-Type: application/json" \
  -d '{
    "oneId": "talent_00000001",
    "platform": "douyin",
    "rebateRate": 22.50,
    "effectType": "immediate",
    "reason": "测试调整",
    "createdBy": "test_user"
  }'
```

**测试 getRebateHistory**:
```bash
curl "https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com/getRebateHistory?oneId=talent_00000001&platform=douyin&limit=10&offset=0"
```

### 3. 前端测试

1. **访问达人详情页**
   - 打开任意达人详情页
   - 应看到新的"返点配置"区域

2. **测试显示内容**
   - ✅ 归属类型显示
   - ✅ 当前返点率显示（大号字体）
   - ✅ 返点来源显示
   - ✅ 生效日期显示

3. **测试调整返点功能**
   - 点击"调整返点"按钮
   - 弹出调整弹窗
   - 输入新返点率（如 22.50）
   - 选择生效方式
   - 提交并验证

4. **测试历史记录**
   - 调整返点后
   - 应在"调整历史"时间线中看到新记录
   - 验证显示内容（返点率、状态、原因、时间等）

---

## 📊 数据模型参考

### talents 集合新增字段

```javascript
{
  // ... 原有字段 ...

  // 新增字段 (v2.1)
  belongType: "wild",              // "wild" | "agency"
  agencyId: null,                  // string | null
  currentRebate: {
    rate: 10.00,                   // 0-100, 2位小数
    source: "default",             // "default" | "personal" | "rule" | "agency"
    effectiveDate: "2025-11-15",   // YYYY-MM-DD
    lastUpdated: ISODate("...")    // ISO 8601
  }
}
```

### rebate_configs 集合结构

```javascript
{
  _id: ObjectId("..."),
  configId: "rebate_config_1737024000000_abc123",
  targetType: "talent",
  targetId: "talent_00000001",
  platform: "douyin",
  rebateRate: 22.50,
  effectType: "immediate",         // "immediate" | "next_cooperation"
  effectiveDate: "2025-01-15",
  expiryDate: null,
  status: "active",                // "pending" | "active" | "expired"
  reason: "合作表现优秀",
  createdBy: "admin_user_id",
  createdAt: ISODate("2025-01-15T10:30:00Z"),
  updatedAt: null
}
```

---

## 🔍 故障排查

### 问题 1：云函数返回 404

**检查项**:
- ✅ 云函数是否部署成功
- ✅ API Gateway 路径配置是否正确
- ✅ 环境变量 `MONGO_URI` 是否设置

### 问题 2：数据库连接失败

**检查项**:
- ✅ MongoDB 连接字符串是否正确
- ✅ 数据库名称是否为 `agentworks_db`
- ✅ 网络连接是否正常

### 问题 3：前端不显示返点配置

**检查项**:
- ✅ Cloudflare Pages 是否重新部署
- ✅ 浏览器缓存是否清除
- ✅ API 调用是否成功（查看 Network 面板）
- ✅ 数据库中达人是否有 `currentRebate` 字段

### 问题 4：调整返点失败

**检查项**:
- ✅ 返点率是否在 0-100 范围内
- ✅ 返点率是否超过 2 位小数
- ✅ 云函数 `updateTalentRebate` 是否正常
- ✅ 查看云函数日志获取详细错误信息

---

## 📚 相关文档

| 文档 | 路径 | 说明 |
|------|------|------|
| talents Schema | `database/agentworks_db/schemas/talents.doc.json` | 达人集合完整定义 |
| rebate_configs Schema | `database/agentworks_db/schemas/rebate_configs.doc.json` | 返点配置集合定义 |
| Schema 索引 | `database/agentworks_db/schemas/INDEX.md` | 所有集合清单 |
| 初始化脚本 | `database/agentworks_db/scripts/init-rebate-system.js` | 数据库初始化 |
| getTalentRebate | `functions/getTalentRebate/README.md` | 云函数文档 |
| updateTalentRebate | `functions/updateTalentRebate/README.md` | 云函数文档 |
| getRebateHistory | `functions/getRebateHistory/README.md` | 云函数文档 |

---

## 🎯 部署完成检查清单

部署完成后，请确认以下所有项：

### 数据库 ✅
- [ ] `rebate_configs` 集合已创建
- [ ] `rebate_configs` 6 个索引已创建
- [ ] `talents` 集合已更新（3个新字段）
- [ ] 所有现有达人已有默认返点配置

### 云函数 ✅（已完成）
- [x] getTalentRebate 已部署并测试
- [x] updateTalentRebate 已部署并测试
- [x] getRebateHistory 已部署并测试
- [x] 环境变量已配置
- [x] CORS 配置正确

### 前端 ✅
- [ ] 代码已提交并推送到 GitHub
- [ ] Cloudflare Pages 已重新部署
- [ ] 达人详情页显示返点配置区域
- [ ] 调整返点功能正常
- [ ] 返点历史时间线显示正常

### 测试 ✅
- [ ] 手动调整返点（立即生效模式）
- [ ] 手动调整返点（下次合作生效模式）
- [ ] 验证返点历史记录
- [ ] 验证多个达人的返点配置

---

**维护者**：产品团队
**版本**：v2.1
**最后更新**：2025-11-15
