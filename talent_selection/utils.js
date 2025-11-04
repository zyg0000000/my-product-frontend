/**
 * @file talent_selection/utils.js
 * @description 工具函数模块 - 价格计算、日期处理、数据格式化
 */

// ==================== 价格计算 ====================

/**
 * [V2.9 核心特性] 严格按照指定类型获取最佳价格，不fallback到其他类型
 * @param {Object} talent - 达人对象
 * @param {string} requiredType - 价格类型 ('60s_plus', '20_to_60s', '1_to_20s')
 * @param {string} executionMonth - 执行月份 (格式: 'YYYY-MM')
 * @returns {Object} { value: string|number, isFallback: boolean, sortValue: number }
 */
export function getBestPrice(talent, requiredType = '60s_plus', executionMonth) {
    if (!talent.prices || talent.prices.length === 0 || !executionMonth) {
        return { value: '没有', isFallback: false, sortValue: -1 };
    }

    const [execYear, execMonth] = executionMonth.split('-').map(Number);

    // 严格筛选：仅查找指定类型的价格
    const typedPrices = talent.prices.filter(p => p.type === requiredType);

    if (typedPrices.length === 0) {
        return { value: '没有', isFallback: false, sortValue: -1 };
    }

    // 优先1: 当前月份 + 指定类型
    const currentMonthPrices = typedPrices.filter(p => p.year === execYear && p.month === execMonth);
    if (currentMonthPrices.length > 0) {
        const confirmedPrice = currentMonthPrices.find(p => p.status !== 'provisional');
        const selectedPrice = confirmedPrice || currentMonthPrices[0];
        return { value: selectedPrice.price, isFallback: false, sortValue: selectedPrice.price };
    }

    // 优先2: 最近月份 + 指定类型
    const sortedTypedPrices = typedPrices.sort((a, b) => (b.year - a.year) || (b.month - a.month));
    const latestPrice = sortedTypedPrices[0];
    const priceText = `¥ ${latestPrice.price.toLocaleString()} (${latestPrice.month}月)`;
    return { value: priceText, isFallback: true, sortValue: latestPrice.price };
}

/**
 * 获取用于排序的价格值
 * @param {Object} talent - 达人对象
 * @param {string} priceType - 价格类型
 * @param {string} executionMonth - 执行月份
 * @returns {number} 价格值（用于排序）
 */
export function getBestPriceForSort(talent, priceType, executionMonth) {
    const priceInfo = getBestPrice(talent, priceType, executionMonth);
    return priceInfo.sortValue;
}

/**
 * 生成价格选项（用于批量录入弹窗）
 * @param {Object} talent - 达人对象
 * @param {string} executionMonth - 执行月份 (格式: 'YYYY-MM')
 * @returns {string} HTML options 字符串
 */
export function generatePriceOptions(talent, executionMonth) {
    let options = '<option value="">-- 请选择 --</option>';
    if (!talent.prices || talent.prices.length === 0) return options;

    const [execYear, execMonth] = executionMonth.split('-').map(Number);

    // [V2.8 新增] 价格类型标签映射
    const priceTypeLabels = {
        '60s_plus': '60s+视频',
        '20_to_60s': '20-60s视频',
        '1_to_20s': '1-20s视频'
    };

    // [V2.8 修改] 排序时考虑type字段
    const sortedPrices = [...talent.prices].sort((a, b) => {
        const aIsMatch = a.year === execYear && a.month === execMonth;
        const bIsMatch = b.year === execYear && b.month === execMonth;
        if (aIsMatch !== bIsMatch) return aIsMatch ? -1 : 1;

        // type排序：60s_plus > 20_to_60s > 1_to_20s
        if (aIsMatch && bIsMatch) {
            const typeOrder = { '60s_plus': 0, '20_to_60s': 1, '1_to_20s': 2 };
            const aTypeOrder = typeOrder[a.type] ?? 99;
            const bTypeOrder = typeOrder[b.type] ?? 99;
            if (aTypeOrder !== bTypeOrder) return aTypeOrder - bTypeOrder;
        }

        if (a.status !== b.status) return a.status === 'provisional' ? 1 : -1;
        return (b.year - a.year) || (b.month - a.month);
    });

    return options + sortedPrices.map(p => {
        const isExecMonthMatch = p.year === execYear && p.month === execMonth;
        const prefix = isExecMonthMatch ? '⭐️ ' : '';
        const statusLabel = p.status === 'provisional' ? '(暂定价)' : '(已确认)';
        const typeLabel = priceTypeLabels[p.type] || p.type || '未知类型';
        const optionText = `${prefix}${p.year}年${p.month}月 - ${typeLabel}: ¥ ${p.price.toLocaleString()} ${statusLabel}`;
        const optionValue = JSON.stringify(p);
        return `<option value='${optionValue}'>${optionText}</option>`;
    }).join('');
}

/**
 * 生成返点选项
 * @param {Object} talent - 达人对象
 * @returns {string} HTML options 字符串
 */
export function generateRebateOptions(talent) {
    if (!talent.rebates || talent.rebates.length === 0) return '<option value="">无</option>';
    let options = '<option value="">--</option>';
    options += talent.rebates.map(r =>
        `<option value="${r.rate}">${r.rate}%</option>`
    ).join('');
    return options;
}

// ==================== 日期处理 ====================

/**
 * 格式化日期为 YYYY-MM-DD
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * 获取两个日期之间的所有日期
 * @param {Date} startDate - 开始日期
 * @param {Date} endDate - 结束日期
 * @returns {Date[]} 日期数组
 */
export function getDatesBetween(startDate, endDate) {
    const dates = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
}

/**
 * 设置默认执行月份（下个月）
 * @returns {string} 格式化的月份 (YYYY-MM)
 */
export function setDefaultExecutionMonth() {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const year = nextMonth.getFullYear();
    const month = String(nextMonth.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

// ==================== 配置生成 ====================

/**
 * 从达人数据中生成筛选配置（达人类型、等级、数据维度）
 * @param {Array} talents - 达人数组
 * @returns {Object} { talentTypes, talentTiers, dimensions }
 */
export function generateConfigurationsFromData(talents) {
    const typeSet = new Set();
    const tierSet = new Set();
    const dimensionSet = new Set();

    talents.forEach(talent => {
        if (Array.isArray(talent.talentType)) {
            talent.talentType.forEach(type => type && typeSet.add(type));
        } else if (talent.talentType) {
            typeSet.add(talent.talentType);
        }
        if (talent.talentTier) {
            tierSet.add(talent.talentTier);
        }
        if (talent.performanceData) {
            Object.keys(talent.performanceData).forEach(key => dimensionSet.add(key));
        }
    });

    const talentTypes = Array.from(typeSet).sort().map(t => ({ name: t, value: t }));
    const talentTiers = Array.from(tierSet).sort().map(t => ({ name: t, value: t }));

    // [核心修复] 统一中文名称映射
    const displayNameMap = {
        'cpm60s': '60s+预期CPM',
        'audience_18_40_ratio': '18-40岁观众占比',
        'audience_40_plus_ratio': '40岁以上观众占比',
        'femaleAudienceRatio': '女性观众比例',
        'maleAudienceRatio': '男性观众比例',
        'lastUpdated': '更新日期',
        'ratio_18_23': '18-23岁',
        'ratio_24_30': '24-30岁',
        'ratio_31_40': '31-40岁',
        'ratio_41_50': '41-50岁',
        'ratio_50_plus': '50岁以上',
        'ratio_town_middle_aged': '小镇中老年',
        'ratio_senior_middle_class': '资深中产',
        'ratio_z_era': 'Z世代',
        'ratio_urban_silver': '都市银发',
        'ratio_town_youth': '小镇青年',
        'ratio_exquisite_mom': '精致妈妈',
        'ratio_new_white_collar': '新锐白领',
        'ratio_urban_blue_collar': '都市蓝领',
    };

    const percentageFields = new Set([
        'femaleAudienceRatio', 'maleAudienceRatio', 'audience_18_40_ratio', 'audience_40_plus_ratio',
        'ratio_18_23', 'ratio_24_30', 'ratio_31_40', 'ratio_41_50', 'ratio_50_plus',
        'ratio_town_middle_aged', 'ratio_senior_middle_class', 'ratio_z_era', 'ratio_urban_silver',
        'ratio_town_youth', 'ratio_exquisite_mom', 'ratio_new_white_collar', 'ratio_urban_blue_collar'
    ]);

    const dimensions = Array.from(dimensionSet).sort().map(id => ({
        id: id,
        name: displayNameMap[id] || id,
        type: percentageFields.has(id) ? 'percentage' : 'number',
        visible: ['cpm60s', 'femaleAudienceRatio', 'audience_18_40_ratio'].includes(id),
        required: false,
    }));

    return { talentTypes, talentTiers, dimensions };
}

/**
 * 初始化可见列配置
 * @param {string} storageKey - localStorage 的 key
 * @param {Object} allConfigurations - 所有配置（包含 dimensions）
 * @returns {Array} 可见列配置数组
 */
export function initializeVisibleColumns(storageKey, allConfigurations) {
    const baseStructure = [
        { id: 'nickname', name: '达人昵称', visible: true, required: true },
        { id: 'price', name: '一口价', visible: true, required: true },
        { id: 'highestRebate', name: '最高返点率', visible: true, required: true },
        { id: 'talentTier', name: '达人层级', visible: true, required: true },
    ];

    const savedConfig = JSON.parse(localStorage.getItem(storageKey) || 'null');

    if (savedConfig && Array.isArray(savedConfig) && savedConfig.length > 0) {
        return savedConfig;
    }

    return [...baseStructure, ...(allConfigurations.dimensions || [])];
}
