# 项目脚本说明

本目录包含 AgentWorks 项目的自动化脚本。

## 📋 脚本列表

### 1. 部署前检查脚本 (`pre-deploy-check.sh`)

**用途**: 在部署到 Cloudflare Pages 前执行完整的代码检查

**使用方法**:
```bash
# 在项目根目录执行
./scripts/pre-deploy-check.sh
```

**检查项目**:
1. ✅ Node.js 版本检查（>= 20.19）
2. ✅ 依赖安装检查
3. ✅ TypeScript 类型检查
4. ✅ ESLint 代码规范检查
5. ✅ 清理旧构建产物
6. ✅ 生产构建测试
7. ✅ 构建产物检查
8. ✅ Cloudflare 文件大小限制检查
9. ✅ 环境变量配置检查

**输出示例**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 开始 AgentWorks 部署前检查
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣  检查 Node.js 版本
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Node.js 版本检查通过: v20.11.0

...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 所有检查通过！
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ 项目已准备好部署到 Cloudflare Pages
```

**何时使用**:
- ✅ 每次推送到 main 分支前
- ✅ 创建 Pull Request 前
- ✅ 本地开发完成后

---

### 2. 云函数版本检查脚本 (`check-cloud-function-version.sh`)

**用途**: 检查云函数是否包含完整的版本信息和 CHANGELOG

**使用方法**:
```bash
# 检查单个云函数文件
./scripts/check-cloud-function-version.sh functions/getTalents/index.js

# 或者在云函数目录批量检查
cd functions
for dir in */; do
    if [ -f "$dir/index.js" ]; then
        ../scripts/check-cloud-function-version.sh "$dir/index.js"
    fi
done
```

**检查项目**:
- ✅ `@version` 标签是否存在
- ✅ `@changelog` 标签是否存在
- ✅ `VERSION` 常量是否定义
- ✅ 版本号是否一致
- ✅ 日志是否包含版本标识

**输出示例**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 检查云函数版本信息
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 文件: functions/getTalents/index.js

✅ 找到版本号: 1.2.3
✅ 找到 CHANGELOG

📝 最近的更新记录：
 * - v1.2.3 (2025-11-24): 修复返点计算bug
 * - v1.2.2 (2025-11-20): 优化查询性能
 * - v1.2.1 (2025-11-18): 新增平台参数支持

✅ 找到 VERSION 常量: 1.2.3
✅ 日志包含版本标识

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 版本信息检查完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**何时使用**:
- ✅ 修改云函数后
- ✅ 准备部署云函数前
- ✅ Code Review 时

---

## 🔧 脚本开发规范

### 脚本命名
- 使用 `kebab-case` 命名
- 使用 `.sh` 后缀
- 文件名清晰表达用途

### 脚本结构
```bash
#!/bin/bash

# 脚本说明
# 用途：...
# 使用：...

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 打印函数
print_step() { ... }
print_success() { ... }
print_error() { ... }
print_warning() { ... }

# 主逻辑
...
```

### 执行权限
所有脚本必须设置执行权限：
```bash
chmod +x scripts/*.sh
```

---

## 📝 常见问题

### Q1: 脚本执行权限不足
```bash
# 错误
bash: ./scripts/pre-deploy-check.sh: Permission denied

# 解决
chmod +x scripts/pre-deploy-check.sh
```

### Q2: 找不到命令
```bash
# 错误
command not found: npm

# 解决
# 确保已安装 Node.js 和 npm
node -v
npm -v
```

### Q3: 脚本必须在项目根目录执行
```bash
# 错误
错误：必须在项目根目录执行此脚本

# 解决
cd /path/to/my-product-frontend
./scripts/pre-deploy-check.sh
```

---

## 🚀 未来计划

计划添加的脚本：

- [ ] `setup-dev-env.sh` - 自动配置开发环境
- [ ] `generate-changelog.sh` - 自动生成 CHANGELOG
- [ ] `deploy-cloud-functions.sh` - 批量部署云函数
- [ ] `check-dependencies.sh` - 检查依赖更新
- [ ] `backup-database.sh` - 数据库备份脚本

---

## 📖 相关文档

- [开发规范](../docs/agentworks/DEVELOPMENT_GUIDELINES.md) - 完整的开发规范
- [部署指南](../frontends/agentworks/DEPLOYMENT.md) - Cloudflare Pages 部署
- [故障排查](../docs/general/TROUBLESHOOTING.md) - 常见问题解决

---

**维护者**: AgentWorks Team
**最后更新**: 2025-11-24

🤖 Generated with [Claude Code](https://claude.com/claude-code)
