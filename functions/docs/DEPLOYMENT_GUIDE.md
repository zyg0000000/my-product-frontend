# 云函数部署完整指南

> 从零开始部署火山引擎云函数的详细教程

## 📍 部署环境

**云服务商**：火山引擎（Volcengine）
**服务类型**：云函数（Function Compute）
**运行环境**：Node.js 18.x

---

## 🎯 部署方式概览

| 方式 | 难度 | 适用场景 | 推荐度 |
|------|:----:|---------|:------:|
| **VSCode 插件** | ⭐️ | 日常开发、快速部署 | 🌟🌟🌟🌟🌟 |
| **控制台上传** | ⭐️⭐️ | 紧急修复、单次部署 | 🌟🌟🌟 |
| **CLI 工具** | ⭐️⭐️⭐️ | CI/CD、批量部署 | 🌟🌟🌟🌟 |

---

## 方式 1：VSCode 插件部署（推荐）

### 步骤 1：安装 VSCode 插件

1. **打开 VSCode**

2. **打开扩展面板**
   - 快捷键：`Command + Shift + X`（Mac）或 `Ctrl + Shift + X`（Windows）

3. **搜索火山引擎插件**
   - 在搜索框输入：`Volcengine` 或 `火山引擎`
   - 找到官方插件："火山引擎开发工具"

4. **安装插件**
   - 点击 "Install" 安装

### 步骤 2：配置插件

1. **登录火山引擎账号**
   - 点击 VSCode 左侧活动栏的火山引擎图标
   - 点击"登录"按钮
   - 使用火山引擎账号密码登录

2. **选择项目和地域**
   - 选择你的项目
   - 选择地域（如：cn-shanghai）

### 步骤 3：部署函数

1. **打开函数代码目录**
   ```bash
   cd /path/to/my-product-frontend/functions/getTalents
   ```

2. **在 VSCode 中打开该目录**

3. **右键部署**
   - 在文件夹上右键
   - 选择"部署到火山引擎云函数"
   - 选择目标函数

4. **等待部署完成**
   - 查看输出面板的部署日志
   - 看到"部署成功"提示

### 步骤 4：测试函数

1. **在插件中找到已部署的函数**

2. **点击"测试"按钮**

3. **输入测试参数**
   ```json
   {
     "httpMethod": "GET",
     "queryStringParameters": {
       "view": "list"
     }
   }
   ```

4. **查看测试结果**

---

## 方式 2：控制台手动部署

### 步骤 1：登录火山引擎控制台

1. 访问：https://console.volcengine.com/

2. 登录你的账号

3. 进入"云函数"服务
   - 在产品列表中找到"云函数"
   - 或直接访问：https://console.volcengine.com/fc

### 步骤 2：准备代码包

1. **进入函数目录**
   ```bash
   cd /path/to/my-product-frontend/functions/getTalents
   ```

2. **打包代码**
   ```bash
   # 确保包含所有必需文件
   zip -r getTalents.zip index.js package.json

   # 如果有 node_modules（不推荐上传，体积大）
   # zip -r getTalents.zip index.js package.json node_modules/
   ```

   **💡 最佳实践**：
   - 不要上传 node_modules，在控制台配置依赖
   - 只打包必需的文件
   - 检查 zip 包大小（建议 < 10MB）

### 步骤 3：上传代码

1. **在控制台找到目标函数**
   - 函数列表 → 找到函数名（如 getTalents）
   - 点击进入函数详情

2. **上传代码包**
   - 切换到"代码"标签
   - 选择"上传 ZIP 包"
   - 选择刚才打包的 zip 文件
   - 点击"确定"

3. **配置依赖**
   - 切换到"依赖管理"标签
   - 添加 package.json 中的依赖
   - 示例：`mongodb@5.0.0`
   - 点击"安装"

### 步骤 4：配置环境变量

1. **切换到"配置"标签**

2. **添加环境变量**
   ```
   MONGO_URI = mongodb://user:pass@host:port/...
   MONGO_DB_NAME = kol_data
   ```

   **⚠️ 注意**：
   - 环境变量区分大小写
   - 不要包含敏感信息在代码中
   - 所有函数共用一套环境变量配置

### 步骤 5：测试和发布

1. **测试函数**
   - 切换到"测试"标签
   - 输入测试事件
   - 点击"测试运行"
   - 查看输出结果

2. **发布版本**
   - 测试通过后，点击"发布版本"
   - 输入版本说明
   - 点击"确定"

3. **配置触发器**（如果需要 HTTP 访问）
   - 切换到"触发器"标签
   - 添加 HTTP 触发器
   - 配置路径和方法
   - 复制触发器 URL

---

## 方式 3：CLI 工具部署

### 步骤 1：安装 CLI 工具

```bash
# 使用 npm 安装
npm install -g @volcengine/cli

# 验证安装
volc --version
```

### 步骤 2：配置 CLI

```bash
# 配置访问凭证
volc configure

# 按提示输入：
# - Access Key ID
# - Secret Access Key
# - Region (如 cn-shanghai)
```

**获取 Access Key**：
1. 登录火山引擎控制台
2. 右上角头像 → 访问控制
3. 创建访问密钥

### 步骤 3：部署函数

```bash
# 进入函数目录
cd functions/getTalents

# 部署函数
volc fc function deploy \
  --function-name getTalents \
  --runtime nodejs18 \
  --handler index.handler \
  --code-dir .

# 更新环境变量
volc fc function update-config \
  --function-name getTalents \
  --environment-variables MONGO_URI=mongodb://...
```

### 步骤 4：批量部署

```bash
# 创建部署脚本
cat > deploy-all.sh << 'EOF'
#!/bin/bash

FUNCTIONS=(
  "getTalents"
  "getProjects"
  "getCollaborators"
  # ... 添加其他函数
)

for func in "${FUNCTIONS[@]}"; do
  echo "部署 $func..."
  cd "functions/$func"
  volc fc function deploy --function-name "$func" --code-dir .
  cd ../..
done
EOF

# 添加执行权限
chmod +x deploy-all.sh

# 执行批量部署
./deploy-all.sh
```

---

## 🔧 常见环境变量配置

### 必需的环境变量

```bash
# MongoDB 连接
MONGO_URI=mongodb://root:password@host:port/?authSource=admin&replicaSet=xxx

# 数据库名称
MONGO_DB_NAME=kol_data
```

### 可选的环境变量

```bash
# 飞书集成
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=xxx

# 对象存储
TOS_ACCESS_KEY=AKxxx
TOS_SECRET_KEY=xxx
TOS_BUCKET=my-bucket
TOS_REGION=cn-shanghai

# 其他配置
NODE_ENV=production
LOG_LEVEL=info
```

---

## 📊 部署检查清单

### 部署前检查

- [ ] 代码已在本地测试通过
- [ ] package.json 中的依赖版本已锁定
- [ ] 没有硬编码的敏感信息
- [ ] Git 已提交最新代码
- [ ] 确认要部署的函数名称

### 部署后验证

- [ ] 在控制台查看函数状态（运行中）
- [ ] 使用测试功能验证函数逻辑
- [ ] 检查函数日志是否有错误
- [ ] 测试 HTTP 触发器（如果有）
- [ ] 验证环境变量配置正确

### 线上监控

- [ ] 设置函数监控告警
- [ ] 定期查看函数调用量
- [ ] 监控函数错误率
- [ ] 检查函数执行时长

---

## 🆘 常见问题

### 问题 1：部署后函数无法连接数据库

**原因**：
- MongoDB 连接字符串错误
- IP 白名单未配置
- 网络不通

**解决方案**：
```bash
# 1. 在控制台检查环境变量
MONGO_URI 是否正确

# 2. 在 MongoDB 控制台检查 IP 白名单
# 添加火山引擎云函数的出口 IP
# 或临时添加 0.0.0.0/0（不推荐生产环境）

# 3. 在函数中测试连接
console.log('Connecting to:', process.env.MONGO_URI);
```

### 问题 2：函数依赖安装失败

**原因**：
- package.json 格式错误
- 依赖版本冲突
- 网络超时

**解决方案**：
```bash
# 1. 本地验证 package.json
npm install

# 2. 锁定依赖版本
# 使用固定版本而不是 ^5.0.0
"mongodb": "5.0.0"

# 3. 使用国内镜像
# 在控制台配置 npm 镜像
https://registry.npmmirror.com
```

### 问题 3：函数执行超时

**原因**：
- 数据库查询慢
- 数据量大
- 未使用连接复用

**解决方案**：
```javascript
// 1. 使用全局变量复用数据库连接
let client;

async function connectToDatabase() {
  if (client && client.topology && client.topology.isConnected()) {
    return client; // 复用连接
  }
  client = new MongoClient(MONGO_URI);
  await client.connect();
  return client;
}

// 2. 添加查询索引
db.collection.createIndex({ field: 1 });

// 3. 限制查询数量
db.collection.find().limit(100);

// 4. 增加函数超时时间
// 在控制台配置页面调整（最大 900 秒）
```

### 问题 4：CORS 跨域错误

**原因**：
- 未返回 CORS 头
- OPTIONS 请求未处理

**解决方案**：
```javascript
// 标准 CORS 处理
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

// 处理 OPTIONS 预检请求
if (event.httpMethod === 'OPTIONS') {
  return { statusCode: 204, headers, body: '' };
}

// 所有响应都包含 CORS 头
return {
  statusCode: 200,
  headers,
  body: JSON.stringify({ success: true })
};
```

---

## 📚 学习资源

### 官方文档

- [火山引擎云函数文档](https://www.volcengine.com/docs/6459)
- [Node.js 运行时说明](https://www.volcengine.com/docs/6459/68859)
- [触发器配置](https://www.volcengine.com/docs/6459/68860)

### 代码示例

- [functions/_template/](. /_template/) - 函数模板
- [functions/README.md](./README.md) - 开发规范
- [functions/INDEX.md](./INDEX.md) - 函数索引

---

## 🎯 最佳实践

### 1. 版本管理

```javascript
/**
 * [生产版 v2.1 - 功能描述]
 * 云函数：getTalents
 * --- v2.1 更新日志 ---
 * - [新功能] 支持通过 talentId 查询单个达人
 * - [优化] 改进查询性能，添加索引
 * - [修复] 修复分页参数错误
 */
```

### 2. 错误处理

```javascript
try {
  // 业务逻辑
} catch (error) {
  console.error('Error:', error);

  // 返回详细错误信息（开发环境）
  if (process.env.NODE_ENV === 'development') {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      })
    };
  }

  // 返回简化错误信息（生产环境）
  return {
    statusCode: 500,
    headers,
    body: JSON.stringify({
      success: false,
      error: 'Internal Server Error'
    })
  };
}
```

### 3. 参数验证

```javascript
// 解析参数
const params = JSON.parse(event.body || '{}');

// 验证必需参数
if (!params.projectId) {
  return {
    statusCode: 400,
    headers,
    body: JSON.stringify({
      success: false,
      error: 'Missing required parameter: projectId'
    })
  };
}
```

### 4. 日志记录

```javascript
// 记录请求
console.log('Request:', {
  method: event.httpMethod,
  params: queryParams,
  timestamp: new Date().toISOString()
});

// 记录响应
console.log('Response:', {
  statusCode: 200,
  dataCount: results.length,
  timestamp: new Date().toISOString()
});
```

---

**完成部署后，记得：**
✅ 在 [functions/INDEX.md](./INDEX.md) 中更新函数状态
✅ 提交代码到 Git 仓库
✅ 通知团队成员更新已完成

---

**最后更新**：2025-11-11
**维护者**：开发团队
