# Mac 用户完整设置指南

> 🍎 专为 Mac 用户设计的零基础操作指南

## 📍 在哪里执行这些操作？

**答案：在你的 Mac 电脑的「终端」应用中执行**

---

## 🎯 完整操作流程（从零开始）

### 第 1 步：打开终端

#### 方法 1：通过启动台
1. 按下 `Command + 空格` 打开「聚焦搜索」
2. 输入 `终端` 或 `Terminal`
3. 按 `Enter` 打开

#### 方法 2：通过 Finder
1. 打开 `Finder`
2. 点击顶部菜单 `前往` → `实用工具`
3. 双击 `终端.app`

---

### 第 2 步：进入项目目录

```bash
# 先看看你现在在哪里
pwd

# 进入项目目录（替换成你的实际路径）
cd ~/Documents/my-product-frontend

# 或者如果你的项目在其他地方，比如桌面
cd ~/Desktop/my-product-frontend

# 验证是否进入正确目录（应该看到 database/ 文件夹）
ls -la
```

**💡 小贴士**：
- `~` 代表你的用户主目录（比如 `/Users/你的用户名/`）
- 如果不确定项目在哪里，可以在 Finder 中找到项目文件夹，然后直接拖到终端窗口，会自动输入完整路径

---

### 第 3 步：安装必要工具

#### 3.1 检查是否安装了 Node.js 和 npm

```bash
# 检查 Node.js
node --version
# 应该显示版本号，比如 v18.17.0

# 检查 npm
npm --version
# 应该显示版本号，比如 9.6.7
```

**如果提示 "command not found"**：
1. 访问 https://nodejs.org/
2. 下载 Mac 版本的 LTS（长期支持版）
3. 双击 `.pkg` 文件安装
4. 安装完成后，**关闭并重新打开终端**
5. 再次运行 `node --version` 验证

#### 3.2 安装 mongodb-schema 工具

```bash
# 全局安装 mongodb-schema
npm install -g mongodb-schema

# 如果提示权限错误，使用 sudo（会要求输入密码）
sudo npm install -g mongodb-schema

# 验证安装
mongodb-schema --version
# 应该显示版本号，比如 12.2.0
```

#### 3.3 安装 mongosh（MongoDB Shell）

```bash
# 使用 Homebrew 安装（推荐）
# 如果没有 Homebrew，先安装 Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 然后安装 mongosh
brew install mongosh

# 或者手动下载安装：
# 1. 访问 https://www.mongodb.com/try/download/shell
# 2. 选择 macOS 版本下载
# 3. 解压后移动到 /usr/local/bin/

# 验证安装
mongosh --version
```

---

### 第 4 步：获取 MongoDB 连接字符串

#### 你的 MongoDB 在哪里？

**情况 1：使用云数据库（如火山引擎、阿里云、MongoDB Atlas）**

1. 登录你的云服务控制台
2. 找到你的 MongoDB 实例
3. 点击「连接」或「获取连接字符串」
4. 复制连接字符串，格式通常是：
   ```
   mongodb://username:password@host:port/database
   ```
   或
   ```
   mongodb+srv://username:password@cluster.mongodb.net/database
   ```

**具体位置参考**：
- **火山引擎**：云数据库 MongoDB → 实例列表 → 点击实例 → 连接信息
- **阿里云**：云数据库 MongoDB 版 → 实例列表 → 连接信息
- **MongoDB Atlas**：Clusters → Connect → Connect your application

**情况 2：使用本地 MongoDB**

如果你在本地 Mac 上运行了 MongoDB：
```bash
mongodb://localhost:27017
```

#### 测试连接

```bash
# 替换成你的实际连接字符串
mongosh "mongodb://your-username:your-password@your-host:27017/kol_data"

# 如果连接成功，会看到 MongoDB 的命令行界面
# 输入 exit 退出
exit
```

**⚠️ 注意**：
- 连接字符串中的密码如果包含特殊字符（如 `@`, `#`, `%` 等），需要进行 URL 编码
- 例如：密码是 `pass@123`，应该写成 `pass%40123`

---

### 第 5 步：设置环境变量

```bash
# 临时设置（只在当前终端会话有效）
export MONGO_URI="mongodb://your-username:your-password@your-host:27017"

# 验证设置
echo $MONGO_URI
# 应该显示你刚才设置的连接字符串
```

**🔐 永久设置（推荐）**：

```bash
# 1. 先检查你的 Mac 使用的是哪个 shell
echo $SHELL

# 如果显示 /bin/bash，使用下面的 bash 命令
# 如果显示 /bin/zsh，使用下面的 zsh 命令

# 2. 编辑你的 shell 配置文件
# 如果使用 bash
nano ~/.bash_profile

# 如果使用 zsh（macOS Catalina 10.15 及以后的默认 shell）
nano ~/.zshrc

# 在文件末尾添加：
export MONGO_URI="mongodb://your-username:your-password@your-host:27017"

# 保存并退出：
# 按 Control + X
# 按 Y 确认
# 按 Enter

# 重新加载配置
source ~/.bash_profile   # 如果用的是 bash
# 或
source ~/.zshrc          # 如果用的是 zsh

# 验证
echo $MONGO_URI
```

**⚠️ 安全提示**：
- 连接字符串包含密码，不要提交到 Git
- 考虑使用 `.env` 文件或密钥管理工具

**💡 使用 .env 文件（更安全的方式）**：

```bash
# 1. 复制示例文件
cp database/.env.example database/.env

# 2. 编辑 .env 文件，填入真实的连接信息
nano database/.env
# 或使用你喜欢的编辑器：
code database/.env

# 3. 在 .env 文件中设置：
# MONGO_URI=mongodb://你的实际连接字符串

# 4. 每次使用前加载 .env 文件（或添加到 ~/.zshrc 中自动加载）
source database/.env
export MONGO_URI

# 注意：.env 文件已在 .gitignore 中，不会被提交到 Git
```

---

### 第 6 步：执行同步脚本

现在你可以开始使用同步脚本了！

#### 6.1 给脚本添加执行权限

```bash
# 确保在项目根目录
pwd
# 应该显示类似 /Users/你的用户名/Documents/my-product-frontend

# 添加执行权限
chmod +x database/scripts/sync-schema.sh

# 验证权限
ls -l database/scripts/sync-schema.sh
# 应该看到 -rwxr-xr-x（有 x 表示可执行）
```

#### 6.2 预览模式测试（安全，不会修改文件）

```bash
# 同步单个集合（预览模式）
./database/scripts/sync-schema.sh --dry-run projects

# 你会看到彩色输出：
# 🚀 MongoDB Schema 同步工具
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 数据库: kol_data
# 连接: mongodb://...
# 📦 同步集合: projects
# ⏳ 从 MongoDB 导出...
# ✅ 导出成功
# 🔍 检查变更...
# ✅ 无变更 或 📝 发现以下变更...
```

#### 6.3 实际同步（会修改文件）

```bash
# 确认预览结果无误后，去掉 --dry-run
./database/scripts/sync-schema.sh projects

# 查看变更
git status
git diff database/schemas/projects.schema.json
```

#### 6.4 同步所有集合

```bash
# 同步所有集合（第一次或定期维护时使用）
./database/scripts/sync-schema.sh --all

# 查看所有变更
git status
git diff database/schemas/
```

---

## 🖼️ 完整操作示例（真实场景）

### 场景：你刚在云函数中给 talents 集合添加了新字段

```bash
# 1. 打开终端，进入项目目录
cd ~/Documents/my-product-frontend

# 2. 确保有最新代码
git pull origin main

# 3. 设置 MongoDB 连接（如果还没设置）
export MONGO_URI="mongodb://admin:mypass@mongodb.volcengine.com:27017"

# 4. 先预览变更
./database/scripts/sync-schema.sh --dry-run talents

# 输出示例：
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 📦 同步集合: talents
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ⏳ 从 MongoDB 导出...
# ✅ 导出成功
# 🔍 检查变更...
# 📝 发现以下变更:
# +    "newField": {
# +      "type": "string"
# +    }
# 🔍 [预览模式] 不会写入文件

# 5. 确认无误后，实际同步
./database/scripts/sync-schema.sh talents

# 输出示例：
# ✅ 已更新: database/schemas/talents.schema.json
# ⚠️  提醒: 如果有新增或修改字段，请考虑更新:
#    1. database/schemas/talents.doc.json (添加中文说明)
#    2. database/indexes/talents.indexes.json (如需新索引)

# 6. 检查变更
git status
# 应该看到：modified: database/schemas/talents.schema.json

git diff database/schemas/talents.schema.json
# 查看具体改动

# 7. 如果需要，更新中文文档
code database/schemas/talents.doc.json
# 或使用其他编辑器：vim, nano, 等

# 8. 提交到 Git
git add database/schemas/talents.schema.json
git add database/schemas/talents.doc.json  # 如果修改了

git commit -m "chore: 同步 talents Schema - 新增 newField 字段"

git push origin main
```

---

## 🆘 常见问题和解决方案

### 问题 1：提示 "Permission denied"

```bash
# 解决方案：添加执行权限
chmod +x database/scripts/sync-schema.sh
```

### 问题 2：提示 "mongodb-schema: command not found"

```bash
# 解决方案：全局安装工具
npm install -g mongodb-schema

# 如果还是不行，检查 npm 全局安装路径
npm config get prefix
# 应该显示类似 /usr/local 或 /Users/你的用户名/.nvm/versions/node/v18.17.0

# 确保这个路径在你的 PATH 环境变量中
echo $PATH
```

### 问题 3：连接 MongoDB 失败

```bash
# 1. 检查连接字符串格式
echo $MONGO_URI

# 2. 测试连接
mongosh "$MONGO_URI" --eval "db.adminCommand('ping')"

# 3. 常见错误原因：
# - 密码包含特殊字符需要 URL 编码
# - IP 白名单未添加本地 IP
# - 防火墙阻止连接
# - 连接字符串格式错误（缺少端口、数据库名等）
```

### 问题 4：脚本运行时提示 "diff: command not found"

```bash
# Mac 应该自带 diff 命令，如果没有：
# 安装 Command Line Tools
xcode-select --install
```

### 问题 5：不知道 MongoDB 连接字符串

**如果使用火山引擎**：
1. 登录火山引擎控制台
2. 进入「云数据库 MongoDB」
3. 点击你的实例名称
4. 在「实例详情」页面找到「连接信息」
5. 复制「内网连接地址」（如果在云上）或「公网连接地址」（如果在本地）

**连接字符串格式**：
```
mongodb://用户名:密码@主机地址:端口号/数据库名
```

---

## 📚 完整的工作流程总结

```
┌─────────────────────────────────────────────────────────┐
│  1. 在 Mac 终端中操作                                    │
│     cd ~/Documents/my-product-frontend                  │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  2. 设置 MongoDB 连接                                    │
│     export MONGO_URI="mongodb://..."                    │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  3. 预览变更（安全）                                     │
│     ./database/scripts/sync-schema.sh --dry-run talents │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  4. 实际同步                                             │
│     ./database/scripts/sync-schema.sh talents           │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  5. 检查变更                                             │
│     git diff database/schemas/talents.schema.json       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  6. 更新相关文件（可选）                                 │
│     - .doc.json (中文说明)                              │
│     - .indexes.json (索引定义)                          │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  7. 提交到 Git                                           │
│     git add database/schemas/                           │
│     git commit -m "..."                                 │
│     git push                                            │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 你需要准备的信息清单

在开始之前，准备好以下信息：

- [ ] MongoDB 连接字符串（主机地址、端口、用户名、密码）
- [ ] 数据库名称（默认是 `kol_data`）
- [ ] 项目在 Mac 上的完整路径（如 `~/Documents/my-product-frontend`）
- [ ] 已安装 Node.js 和 npm
- [ ] 已安装 mongodb-schema 工具
- [ ] 已安装 mongosh（用于测试连接）

---

## 🚀 现在开始

准备好了吗？打开终端，从第 1 步开始执行！

如果遇到任何问题，先查看上面的「常见问题和解决方案」部分。

**祝你成功！** 🎉
