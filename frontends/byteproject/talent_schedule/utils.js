/**
 * @file utils.js
 * @description 工具函数模块 - 提供日期格式化和颜色生成等工具函数
 */

/**
 * 格式化日期
 * @param {Date} date - 日期对象
 * @param {string} format - 格式字符串，支持 'YYYY-MM-DD' 和 'YYYY-MM'
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(date, format = 'YYYY-MM-DD') {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return format === 'YYYY-MM' ? `${year}-${month}` : `${year}-${month}-${day}`;
}

/**
 * 根据字符串生成柔和的背景色和文字色
 * @param {string} str - 输入字符串
 * @returns {{bg: string, text: string}} 包含背景色和文字色的对象
 */
export function generatePastelColorFromString(str) {
    let hash = 0;
    str = str || 'default';
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return { bg: `hsl(${h}, 70%, 85%)`, text: `hsl(${h}, 70%, 30%)` };
}
