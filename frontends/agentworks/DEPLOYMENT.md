# AgentWorks - Cloudflare Pages 部署教程

> 完整的部署指南，从零到上线

---

## 📋 前置要求

1. ✅ GitHub 账号
2. ✅ Cloudflare 账号（免费即可）
3. ✅ 项目代码已推送到 GitHub

---

## 🚀 部署步骤

### 步骤 1：登录 Cloudflare

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 登录你的 Cloudflare 账号
3. 在左侧菜单选择 **"Workers & Pages"**

### 步骤 2：创建 Pages 项目

1. 点击 **"Create application"** 按钮
2. 选择 **"Pages"** 标签页
3. 点击 **"Connect to Git"**

### 步骤 3：连接 GitHub 仓库

1. 选择你的 GitHub 账号并授权 Cloudflare 访问
2. 在仓库列表中找到 `my-product-frontend`
3. 点击仓库旁边的 **"Begin setup"** 按钮

### 步骤 4：配置构建设置

在项目配置页面，填写以下信息：

#### 基本信息
- **Project name**: `agentworks`（或你喜欢的名称）
- **Production branch**: `main`（或 `claude/new-product-tech-stack-xxx`）

#### 构建设置
```
Framework preset: Vite
Build command: cd frontends/agentworks && npm install && npm run build
Build output directory: frontends/agentworks/dist
Root directory: /
```

**详细说明**：

| 配置项 | 值 | 说明 |
|--------|-----|------|
| **Framework preset** | `Vite` | 选择 Vite 框架 |
| **Build command** | `cd frontends/agentworks && npm install && npm run build` | 进入子目录，安装依赖，构建项目 |
| **Build output directory** | `frontends/agentworks/dist` | Vite 构建输出目录 |
| **Root directory** | `/` | Monorepo 根目录 |

### 步骤 5：配置环境变量

点击 **"Environment variables"** 部分，添加以下变量：

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `VITE_API_BASE_URL` | `https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com` | API 服务器地址 |
| `NODE_VERSION` | `18` | Node.js 版本（可选） |

### 步骤 6：开始部署

1. 点击 **"Save and Deploy"** 按钮
2. Cloudflare 会自动：
   - 克隆你的 GitHub 仓库
   - 安装依赖
   - 执行构建命令
   - 部署到全球 CDN

3. 等待 2-3 分钟，部署完成

### 步骤 7：访问你的网站

部署成功后，你会看到：

```
✅ Success! Your site is live at:
https://agentworks-xxx.pages.dev
```

点击链接即可访问你的应用！

---

## 🔄 自动部署

### 如何工作

配置完成后，Cloudflare Pages 会自动监听你的 GitHub 仓库：

- **主分支推送** → 自动部署到生产环境
- **其他分支推送** → 自动创建预览环境

### 预览环境

每个分支都会有独立的预览 URL：

```
生产环境: https://agentworks.pages.dev
预览环境: https://xxx-yyy.agentworks.pages.dev
```

---

## 🌐 自定义域名（可选）

### 步骤 1：添加自定义域名

1. 在 Cloudflare Pages 项目设置中
2. 点击 **"Custom domains"**
3. 点击 **"Set up a custom domain"**
4. 输入你的域名，如 `agentworks.yourdomain.com`

### 步骤 2：配置 DNS

如果域名在 Cloudflare 管理：
- Cloudflare 会自动添加 CNAME 记录
- 等待 DNS 生效（通常几分钟）

如果域名在其他地方：
- 添加 CNAME 记录指向 `agentworks-xxx.pages.dev`

### 步骤 3：启用 HTTPS

Cloudflare 会自动为你的域名配置免费 SSL 证书。

---

## 🐛 故障排查

### 问题 1：构建失败 - "command not found: npm"

**原因**：Node.js 环境问题

**解决方案**：
1. 在环境变量中添加 `NODE_VERSION=18`
2. 重新部署

### 问题 2：构建失败 - "cannot find module"

**原因**：构建命令路径错误

**解决方案**：
检查构建命令：
```bash
cd frontends/agentworks && npm install && npm run build
```

### 问题 3：页面显示 404

**原因**：SPA 路由配置问题

**解决方案**：
1. 在 `agentworks/public/` 目录创建 `_redirects` 文件：
```
/*    /index.html   200
```

2. 或者创建 `_routes.json`：
```json
{
  "version": 1,
  "include": ["/*"],
  "exclude": []
}
```

### 问题 4：API 请求失败

**原因**：环境变量未设置

**解决方案**：
1. 检查环境变量 `VITE_API_BASE_URL` 是否正确设置
2. 重新部署

### 问题 5：Tailwind CSS 样式未生效

**原因**：PostCSS 配置问题

**解决方案**：
确保项目中有以下文件：
- `tailwind.config.js`
- `postcss.config.js`
- `src/index.css` 中有 `@tailwind` 指令

---

## 📊 部署监控

### 查看部署日志

1. 进入 Cloudflare Pages 项目
2. 点击 **"Deployments"** 标签
3. 点击具体的部署记录查看详细日志

### 回滚部署

如果新部署有问题：

1. 在 **"Deployments"** 页面
2. 找到之前成功的部署
3. 点击 **"Rollback to this deployment"**

---

## 🎯 性能优化建议

### 1. 启用缓存

Cloudflare Pages 默认启用 CDN 缓存，无需额外配置。

### 2. 启用压缩

在 `vite.config.ts` 中：

```typescript
export default defineConfig({
  build: {
    minify: 'esbuild',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
```

### 3. 代码分割

Vite 自动进行代码分割，无需额外配置。

---

## 📱 移动端测试

部署后，在不同设备测试：

1. **桌面端**：Chrome、Firefox、Safari、Edge
2. **移动端**：iOS Safari、Android Chrome
3. **响应式**：使用 Chrome DevTools 测试不同屏幕尺寸

---

## 🔐 安全建议

### 1. 环境变量

- ⚠️ 不要在代码中硬编码 API 密钥
- ✅ 使用环境变量 `VITE_API_BASE_URL`
- ✅ 敏感信息只在 Cloudflare Dashboard 配置

### 2. API 安全

- 确保后端 API 有适当的 CORS 配置
- 考虑添加 API 认证（JWT、API Key 等）

---

## 📈 下一步

部署成功后，你可以：

1. ✅ 设置团队协作（邀请成员）
2. ✅ 配置 Webhook（通知部署状态）
3. ✅ 启用 Analytics（查看访问数据）
4. ✅ 配置 Sentry（错误监控）

---

## 🆘 获取帮助

- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Vite 部署指南](https://vitejs.dev/guide/static-deploy.html)
- [项目 GitHub Issues](https://github.com/zyg0000000/my-product-frontend/issues)

---

**部署时间**：首次部署约 2-3 分钟
**更新时间**：后续部署约 1-2 分钟
**全球 CDN**：自动分发到 Cloudflare 全球节点

🎉 **恭喜！你的应用已成功部署到 Cloudflare Pages！**
