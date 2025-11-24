# 故障排查手册

> **快速解决常见问题**：包含前端、后端、部署等各类问题的解决方案

---

## 📋 目录

1. [前端问题](#前端问题)
2. [云函数问题](#云函数问题)
3. [数据库问题](#数据库问题)
4. [部署问题](#部署问题)
5. [自动化问题](#自动化问题)
6. [性能问题](#性能问题)

---

## 前端问题

### Q1: 页面加载白屏

**症状**: 打开页面后一片空白，没有任何内容显示

**可能原因**:
1. JavaScript 模块加载失败
2. API 请求失败
3. 浏览器不支持 ES6 模块

**解决方案**:

1. **检查浏览器控制台**
   ```
   F12 → Console 标签
   查看错误信息
   ```

2. **检查网络请求**
   ```
   F12 → Network 标签
   查看是否有请求失败（红色）
   ```

3. **检查模块路径**
   - 确认 `<script type="module">` 引用路径正确
   - 模块路径必须以 `./` 或 `../` 开头

4. **使用现代浏览器**
   - Chrome 61+
   - Firefox 60+
   - Safari 11+
   - Edge 16+

---

### Q2: API 请求失败

**症状**: 控制台显示 API 请求失败，如 404、500 错误

**解决方案**:

1. **检查 API 地址**
   ```javascript
   // common/app-core.js
   const API_BASE_URL = 'https://your-api-domain.com';
   // 确认地址正确
   ```

2. **检查网络连接**
   ```bash
   # 在控制台测试 API
   fetch('https://your-api-domain.com/getProjects')
       .then(r => r.json())
       .then(console.log)
   ```

3. **检查CORS配置**
   - 云函数需要设置正确的 CORS 头
   - `Access-Control-Allow-Origin: *`

4. **查看云函数日志**
   - 登录火山引擎控制台
   - 查看函数执行日志
   - 检查错误信息

---

### Q3: 数据不刷新/缓存问题

**症状**: 修改数据后页面不更新，或显示旧数据

**解决方案**:

1. **强制刷新页面**
   ```
   Windows/Linux: Ctrl + F5
   Mac: Cmd + Shift + R
   ```

2. **清除浏览器缓存**
   ```
   F12 → Application → Storage → Clear site data
   ```

3. **检查代码中的缓存逻辑**
   ```javascript
   // 检查是否有缓存逻辑
   const cache = localStorage.getItem('key');
   // 清除缓存
   localStorage.clear();
   ```

---

### Q4: 表格数据不显示

**症状**: 页面加载成功，但表格是空的

**解决方案**:

1. **检查 API 返回数据**
   ```javascript
   // 在浏览器控制台
   fetch('/api/getData')
       .then(r => r.json())
       .then(data => console.log('API返回:', data))
   ```

2. **检查数据格式**
   - API 返回的数据格式是否符合预期
   - 检查数组是否为空

3. **检查筛选条件**
   - 筛选条件过严可能导致无数据
   - 重置筛选条件重试

---

## 云函数问题

### Q1: 云函数部署失败

**症状**: 使用 VSCode 插件部署时报错

**解决方案**:

1. **检查 package.json**
   ```json
   {
     "name": "function-name",
     "version": "1.0.0",
     "main": "index.js",
     "dependencies": {
       "mongodb": "^4.0.0"
     }
   }
   ```

2. **检查依赖包**
   - 确保所有依赖在 package.json 中声明
   - 避免使用本地文件路径依赖

3. **检查代码语法**
   - 使用 Node.js 14+ 支持的语法
   - 避免使用浏览器特定 API

4. **查看部署日志**
   - VSCode 输出面板查看详细错误
   - 火山引擎控制台查看部署状态

---

### Q2: 云函数超时

**症状**: API 请求长时间无响应，最终超时

**解决方案**:

1. **优化数据库查询**
   ```javascript
   // 添加索引
   db.collection.createIndex({ field: 1 });

   // 限制返回字段
   db.collection.find({}, { projection: { field1: 1, field2: 1 } });

   // 添加查询条件
   db.collection.find({ status: 'active' }).limit(100);
   ```

2. **增加函数超时时间**
   - 在火山引擎控制台修改超时配置
   - 建议不超过 30 秒

3. **使用分页**
   ```javascript
   const page = parseInt(req.query.page) || 1;
   const pageSize = 20;
   const skip = (page - 1) * pageSize;

   const data = await collection.find({})
       .skip(skip)
       .limit(pageSize)
       .toArray();
   ```

---

### Q3: 环境变量未生效

**症状**: 云函数无法读取环境变量，如 `process.env.MONGO_URI` 为 undefined

**解决方案**:

1. **检查环境变量配置**
   - 登录火山引擎控制台
   - 函数配置 → 环境变量
   - 确认变量名和值正确

2. **重新部署函数**
   - 修改环境变量后需要重新部署
   - 等待部署完成后测试

3. **使用默认值**
   ```javascript
   const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
   const DB_NAME = process.env.DB_NAME || 'kol_data';
   ```

---

## 数据库问题

### Q1: MongoDB 连接失败

**症状**: 云函数无法连接到 MongoDB

**解决方案**:

1. **检查连接字符串**
   ```javascript
   const uri = process.env.MONGO_URI;
   console.log('MongoDB URI:', uri);
   // 确认 URI 格式正确
   ```

2. **检查网络白名单**
   - MongoDB 需要配置 IP 白名单
   - 添加火山引擎云函数的出口 IP

3. **测试连接**
   ```javascript
   const { MongoClient } = require('mongodb');

   try {
       const client = new MongoClient(uri);
       await client.connect();
       console.log('连接成功');
       await client.close();
   } catch (error) {
       console.error('连接失败:', error);
   }
   ```

---

### Q2: Schema 同步失败

**症状**: 运行 `sync-schema.sh` 时报错

**解决方案**:

1. **检查环境变量**
   ```bash
   echo $MONGO_URI
   # 确认 MONGO_URI 已设置
   ```

2. **设置环境变量**
   ```bash
   export MONGO_URI="mongodb://..."
   ```

3. **检查 mongodb-schema 工具**
   ```bash
   which mongodb-schema
   # 确认已安装

   npm install -g mongodb-schema
   ```

4. **手动测试**
   ```bash
   mongodb-schema "mongodb://..." "kol_data.projects" --format json
   ```

详细指南：[database/MAC_SETUP.md](../database/MAC_SETUP.md)

---

## 部署问题

### Q1: Cloudflare Pages 部署失败

**症状**: GitHub 推送后部署失败

**解决方案**:

1. **检查根目录配置**
   - 登录 Cloudflare Pages
   - Settings → Builds & deployments
   - Root directory: `frontends/byteproject`

2. **检查文件路径**
   - 确认所有文件在正确位置
   - 检查 HTML 中的资源引用路径

3. **查看部署日志**
   - Cloudflare Pages → Deployments
   - 点击失败的部署查看日志

4. **重新部署**
   - Deployments → Retry deployment

---

### Q2: 部署后页面404

**症状**: 部署成功但访问页面显示 404

**解决方案**:

1. **检查文件路径**
   ```
   正确: https://your-domain.pages.dev/index.html
   错误: https://your-domain.pages.dev/frontends/byteproject/index.html
   ```

2. **检查根目录配置**
   - 确认 Root directory 设置为 `frontends/byteproject`

3. **检查文件是否存在**
   - 在 GitHub 仓库中确认文件路径
   - `frontends/byteproject/index.html` 应该存在

---

## 自动化问题

### Q1: 自动化任务一直"进行中"

**症状**: 发起自动化任务后长时间停留在"进行中"状态

**解决方案**:

1. **检查本地爬虫代理**
   ```bash
   # 检查代理进程
   ps aux | grep agent

   # 查看代理日志
   tail -f /path/to/agent/logs/agent.log
   ```

2. **重启爬虫代理**
   ```bash
   # 停止代理
   pm2 stop my-local-agent

   # 启动代理
   pm2 start my-local-agent
   ```

3. **检查任务队列**
   - 查看 MongoDB 中的任务状态
   - 检查是否有堆积的任务

---

### Q2: 截图上传失败

**症状**: 自动化任务失败，日志显示截图上传错误

**解决方案**:

1. **检查 TOS 配置**
   ```javascript
   // 检查环境变量
   console.log('TOS_ACCESS_KEY:', process.env.TOS_ACCESS_KEY);
   console.log('TOS_SECRET_KEY:', process.env.TOS_SECRET_KEY);
   ```

2. **测试 TOS 连接**
   - 使用 TOS SDK 测试上传
   - 确认 Bucket 存在且有权限

3. **检查网络**
   - 确认可以访问 TOS 服务
   - 检查防火墙设置

---

## 性能问题

### Q1: 页面加载慢

**症状**: 页面打开需要很长时间

**解决方案**:

1. **检查网络请求**
   ```
   F12 → Network
   查看耗时最长的请求
   ```

2. **优化 API 查询**
   - 添加数据库索引
   - 使用分页
   - 减少返回字段

3. **使用缓存**
   ```javascript
   // 缓存静态数据
   const cache = new Map();

   async function getDataWithCache(key) {
       if (cache.has(key)) {
           return cache.get(key);
       }
       const data = await fetchData(key);
       cache.set(key, data);
       return data;
   }
   ```

---

### Q2: 表格渲染慢

**症状**: 数据量大时表格渲染卡顿

**解决方案**:

1. **使用虚拟滚动**
   - 只渲染可见行
   - 滚动时动态加载

2. **分页显示**
   ```javascript
   const pageSize = 20;
   // 每页只显示 20 条数据
   ```

3. **优化 DOM 操作**
   ```javascript
   // 使用 DocumentFragment
   const fragment = document.createDocumentFragment();
   data.forEach(item => {
       const row = createRow(item);
       fragment.appendChild(row);
   });
   tbody.appendChild(fragment);
   ```

---

## 🔗 相关文档

- [开发者指南](./DEVELOPER_GUIDE.md)
- [FAQ](./FAQ.md)
- [云函数部署指南](../functions/DEPLOYMENT_GUIDE.md)
- [数据库设置指南](../database/MAC_SETUP.md)

---

## 📞 获取帮助

如果以上方案无法解决您的问题：

1. **查看日志**：浏览器控制台、云函数日志、代理日志
2. **搜索文档**：在本仓库的 docs/ 目录搜索相关文档
3. **提交 Issue**：在 GitHub Issues 中描述问题
4. **联系开发者**：联系项目维护者获取帮助

---

**最后更新**: 2025-11-11
**文档版本**: v1.0
