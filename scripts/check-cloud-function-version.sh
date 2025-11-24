#!/bin/bash

# 云函数版本检查脚本
# 用途：检查云函数是否包含版本号和 CHANGELOG
# 使用：./scripts/check-cloud-function-version.sh <函数文件路径>

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ -z "$1" ]; then
    echo -e "${RED}❌ 错误：请提供云函数文件路径${NC}"
    echo "用法: $0 <函数文件路径>"
    echo "示例: $0 functions/getTalents/index.js"
    exit 1
fi

FILE_PATH=$1

if [ ! -f "$FILE_PATH" ]; then
    echo -e "${RED}❌ 错误：文件不存在: $FILE_PATH${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🔍 检查云函数版本信息${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📄 文件: $FILE_PATH"
echo ""

# 检查 @version 标签
if grep -q "@version" "$FILE_PATH"; then
    VERSION=$(grep "@version" "$FILE_PATH" | head -1 | sed 's/.*@version //' | tr -d ' */')
    echo -e "${GREEN}✅ 找到版本号: ${VERSION}${NC}"
else
    echo -e "${RED}❌ 缺少 @version 标签${NC}"
    echo -e "${YELLOW}请在文件开头添加版本信息：${NC}"
    echo ""
    echo "/**"
    echo " * 云函数名称"
    echo " * @version 1.0.0"
    echo " * @date $(date +%Y-%m-%d)"
    echo " * @changelog"
    echo " * - v1.0.0 ($(date +%Y-%m-%d)): 初始版本"
    echo " */"
    echo ""
    exit 1
fi

# 检查 @changelog 标签
if grep -q "@changelog" "$FILE_PATH"; then
    echo -e "${GREEN}✅ 找到 CHANGELOG${NC}"
    echo ""
    echo "📝 最近的更新记录："
    grep -A 5 "@changelog" "$FILE_PATH" | grep "^[[:space:]]*\*[[:space:]]*-" | head -3
else
    echo -e "${RED}❌ 缺少 @changelog 标签${NC}"
    exit 1
fi

# 检查 VERSION 常量
if grep -q "const VERSION = " "$FILE_PATH" || grep -q "const VERSION=" "$FILE_PATH"; then
    CONST_VERSION=$(grep "const VERSION" "$FILE_PATH" | head -1 | sed "s/.*VERSION.*=.*['\"]//; s/['\"].*//")
    echo ""
    echo -e "${GREEN}✅ 找到 VERSION 常量: ${CONST_VERSION}${NC}"

    # 检查版本号是否一致
    if [ "$VERSION" != "$CONST_VERSION" ]; then
        echo -e "${YELLOW}⚠️  警告：@version (${VERSION}) 与 VERSION 常量 (${CONST_VERSION}) 不一致${NC}"
    fi
else
    echo ""
    echo -e "${YELLOW}⚠️  建议：添加 VERSION 常量${NC}"
    echo "const VERSION = '${VERSION}';"
fi

# 检查日志输出
if grep -q "\[v\${VERSION}\]" "$FILE_PATH" || grep -q "\`\[v\${VERSION}\]" "$FILE_PATH"; then
    echo ""
    echo -e "${GREEN}✅ 日志包含版本标识${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠️  建议：在日志中包含版本标识${NC}"
    echo "console.log(\`[v\${VERSION}] 开始处理请求\`);"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ 版本信息检查完成${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
