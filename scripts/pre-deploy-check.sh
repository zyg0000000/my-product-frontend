#!/bin/bash

# AgentWorks 部署前检查脚本
# 用途：在部署到 Cloudflare Pages 前执行完整检查
# 使用：chmod +x scripts/pre-deploy-check.sh && ./scripts/pre-deploy-check.sh

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印函数
print_step() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 开始检查
echo ""
print_step "🚀 开始 AgentWorks 部署前检查"
echo ""

# 检查工作目录
if [ ! -d "frontends/agentworks" ]; then
    print_error "错误：必须在项目根目录执行此脚本"
    exit 1
fi

cd frontends/agentworks

# 步骤 1: 检查 Node.js 版本
print_step "1️⃣  检查 Node.js 版本"
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    print_error "Node.js 版本过低: $(node -v)"
    print_warning "需要 Node.js >= 20.19，请升级"
    exit 1
fi
print_success "Node.js 版本检查通过: $(node -v)"
echo ""

# 步骤 2: 安装依赖（如果需要）
print_step "2️⃣  检查依赖"
if [ ! -d "node_modules" ]; then
    print_warning "node_modules 不存在，开始安装依赖..."
    npm install
fi
print_success "依赖检查通过"
echo ""

# 步骤 3: TypeScript 类型检查
print_step "3️⃣  TypeScript 类型检查"
if npm run type-check; then
    print_success "TypeScript 类型检查通过"
else
    print_error "TypeScript 类型检查失败"
    print_warning "请修复类型错误后重试"
    exit 1
fi
echo ""

# 步骤 4: ESLint 检查
print_step "4️⃣  ESLint 代码规范检查"
if npm run lint; then
    print_success "ESLint 检查通过"
else
    print_error "ESLint 检查失败"
    print_warning "请修复代码规范问题后重试"
    exit 1
fi
echo ""

# 步骤 5: 清理旧构建
print_step "5️⃣  清理旧构建产物"
if [ -d "dist" ]; then
    rm -rf dist
    print_success "已清理 dist/ 目录"
else
    print_success "无需清理"
fi
echo ""

# 步骤 6: 生产构建
print_step "6️⃣  执行生产构建"
if npm run build; then
    print_success "生产构建成功"
else
    print_error "生产构建失败"
    print_warning "请检查构建错误后重试"
    exit 1
fi
echo ""

# 步骤 7: 检查构建产物
print_step "7️⃣  检查构建产物"

if [ ! -d "dist" ]; then
    print_error "dist/ 目录不存在"
    exit 1
fi

if [ ! -f "dist/index.html" ]; then
    print_error "dist/index.html 不存在"
    exit 1
fi

# 计算构建大小
DIST_SIZE=$(du -sh dist/ | cut -f1)
print_success "构建产物检查通过"
echo -e "   ${BLUE}📦 构建大小: ${DIST_SIZE}${NC}"

# 检查文件大小（Cloudflare 限制）
echo ""
print_step "8️⃣  检查 Cloudflare Pages 限制"

# 检查单个文件大小
LARGE_FILES=$(find dist -type f -size +25M)
if [ -n "$LARGE_FILES" ]; then
    print_error "发现超过 25MB 的文件（Cloudflare 限制）:"
    echo "$LARGE_FILES"
    exit 1
fi
print_success "文件大小检查通过（所有文件 < 25MB）"
echo ""

# 步骤 9: 检查环境变量配置
print_step "9️⃣  环境变量检查"
if [ -f ".env.production" ]; then
    print_success "发现 .env.production 文件"
    print_warning "请确认已在 Cloudflare Pages 配置以下环境变量："
    echo "   - VITE_API_BASE_URL"
    echo "   - VITE_ENV"
    echo "   - NODE_VERSION=20"
else
    print_warning "未找到 .env.production 文件"
    print_warning "请确认已在 Cloudflare Pages 配置环境变量"
fi
echo ""

# 完成检查
print_step "✅ 所有检查通过！"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ 项目已准备好部署到 Cloudflare Pages${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📝 下一步操作："
echo "   1. git add ."
echo "   2. git commit -m \"你的提交信息\""
echo "   3. git push origin main"
echo ""
echo "🌐 部署完成后请检查："
echo "   - 访问生产 URL 确认页面正常"
echo "   - 检查浏览器控制台无错误"
echo "   - 测试核心功能"
echo ""
