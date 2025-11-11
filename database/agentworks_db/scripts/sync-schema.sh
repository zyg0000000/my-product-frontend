#!/bin/bash
# database/agentworks_db/scripts/sync-schema.sh
# 从 MongoDB 同步 agentworks_db 的 Schema 到 Git 仓库
#
# 使用方法:
#   ./database/agentworks_db/scripts/sync-schema.sh talents
#   ./database/agentworks_db/scripts/sync-schema.sh --all

set -e

# 配置
MONGO_URI="${MONGO_URI:-mongodb://localhost:27017}"
DB_NAME="agentworks_db"
SCHEMAS_DIR="database/agentworks_db/schemas"
TEMP_DIR="/tmp/schema-sync-v2"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查依赖
if ! command -v mongodb-schema &> /dev/null; then
    echo -e "${RED}❌ 错误: 未安装 mongodb-schema${NC}"
    echo "请运行: npm install -g mongodb-schema"
    exit 1
fi

# 创建临时目录
mkdir -p "$TEMP_DIR"

# 集合列表（v2.0）
COLLECTIONS=(
    "talents"
    "talent_merges"
    "projects"
    "cooperations"
)

# 帮助信息
show_help() {
    cat << EOF
用法: $0 [选项] [集合名称]

从 MongoDB (agentworks_db) 导出 Schema 并同步到 Git 仓库

选项:
  --all              同步所有集合
  --dry-run          预览变更但不写入文件
  -h, --help         显示此帮助信息

示例:
  $0 talents                    # 同步单个集合
  $0 --all                      # 同步所有集合
  $0 --dry-run talents          # 预览变更

环境变量:
  MONGO_URI          MongoDB 连接字符串

EOF
}

# 导出单个集合的 Schema
sync_collection() {
    local collection=$1
    local dry_run=$2

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📦 同步集合: $collection (agentworks_db)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # 导出到临时文件
    local temp_file="$TEMP_DIR/${collection}.schema.json"
    local target_file="$SCHEMAS_DIR/${collection}.schema.json"

    echo -e "${YELLOW}⏳ 从 MongoDB 导出...${NC}"
    if mongodb-schema "$MONGO_URI" "$DB_NAME.$collection" --format json > "$temp_file" 2>&1; then
        echo -e "${GREEN}✅ 导出成功${NC}"
    else
        echo -e "${RED}❌ 导出失败（集合可能不存在或无数据）${NC}"
        cat "$temp_file" 2>/dev/null || true
        return 1
    fi

    # 检查目标文件是否存在
    if [ ! -f "$target_file" ]; then
        echo -e "${YELLOW}⚠️  目标文件不存在，将创建新文件${NC}"
        if [ "$dry_run" != "true" ]; then
            cp "$temp_file" "$target_file"
            echo -e "${GREEN}✅ 已创建: $target_file${NC}"
        fi
        return 0
    fi

    # 对比差异
    echo -e "${YELLOW}🔍 检查变更...${NC}"
    if diff -q "$temp_file" "$target_file" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 无变更${NC}"
        return 0
    fi

    # 显示差异
    echo -e "${YELLOW}📝 发现以下变更:${NC}"
    diff -u "$target_file" "$temp_file" | head -50 || true
    echo ""

    # 写入文件
    if [ "$dry_run" = "true" ]; then
        echo -e "${BLUE}🔍 [预览模式] 不会写入文件${NC}"
    else
        cp "$temp_file" "$target_file"
        echo -e "${GREEN}✅ 已更新: $target_file${NC}"

        echo ""
        echo -e "${YELLOW}⚠️  提醒: 请考虑更新相关文件:${NC}"
        echo -e "   1. ${target_file%.schema.json}.doc.json ${YELLOW}(添加中文说明)${NC}"
        echo -e "   2. database/agentworks_db/indexes/${collection}.indexes.json ${YELLOW}(如需新索引)${NC}"
    fi

    echo ""
}

# 主函数
main() {
    local dry_run=false
    local sync_all=false
    local collections_to_sync=()

    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --all)
                sync_all=true
                shift
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                collections_to_sync+=("$1")
                shift
                ;;
        esac
    done

    # 确定要同步的集合
    if [ "$sync_all" = true ]; then
        collections_to_sync=("${COLLECTIONS[@]}")
    elif [ ${#collections_to_sync[@]} -eq 0 ]; then
        echo -e "${RED}❌ 错误: 请指定集合名称或使用 --all${NC}"
        show_help
        exit 1
    fi

    # 显示配置
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🚀 MongoDB Schema 同步工具 (v2.0)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "数据库: ${GREEN}$DB_NAME${NC}"
    echo -e "连接: ${GREEN}$MONGO_URI${NC}"
    echo -e "目标目录: ${GREEN}$SCHEMAS_DIR${NC}"
    echo -e "预览模式: ${GREEN}$dry_run${NC}"
    echo ""

    # 同步每个集合
    local success_count=0
    local fail_count=0

    for collection in "${collections_to_sync[@]}"; do
        if sync_collection "$collection" "$dry_run"; then
            ((success_count++))
        else
            ((fail_count++))
        fi
    done

    # 显示总结
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📊 同步完成${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "成功: ${GREEN}$success_count${NC}"
    echo -e "失败: ${RED}$fail_count${NC}"
    echo ""

    if [ "$dry_run" != "true" ] && [ $success_count -gt 0 ]; then
        echo -e "${YELLOW}📋 后续步骤:${NC}"
        echo -e "1. 检查变更: ${GREEN}git diff database/agentworks_db/${NC}"
        echo -e "2. 更新相关文件（如需要）"
        echo -e "3. 提交到 Git: ${GREEN}git add database/ && git commit${NC}"
    fi

    # 清理临时文件
    rm -rf "$TEMP_DIR"
}

# 运行主函数
main "$@"
