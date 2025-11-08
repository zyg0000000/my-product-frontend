/**
 * @module export-handler
 * @description 导出处理模块，负责数据导出和Excel文件生成
 * @version 2.0.0 - 支持动态字段映射
 */

import { API_ENDPOINTS } from './constants.js';
import { postRequest } from './api.js';
import { getSelectedEntity, getSelectedDimensionIds } from './state-manager.js';
import { getFilterValues } from './filter-renderer.js';
import { showToast, checkXLSXLibrary, generateExcelFilename, setLoadingState } from './utils.js';
import { fetchFieldMetadata, buildFieldMapping, buildLabelMapping } from './field-metadata.js';

/**
 * 动态字段映射缓存
 */
let dynamicBackendFieldMapping = null;
let dynamicLabelMapping = null;

/**
 * 前端字段ID到后端返回的字段名的映射
 * 与后端 exportComprehensiveData/index.js 的 projectStage 保持一致
 */
const BACKEND_FIELD_KEY_MAP = {
    // 达人维度
    'nickname': '达人昵称',
    'xingtuId': '星图ID',
    'uid': 'UID',
    'talentTier': '达人层级',
    'talentSource': '达人来源',
    'talentType': '内容标签',
    'price': '一口价',
    'highestRebate': '最高返点率',
    'collaboration_count': '历史合作总次数',
    'work_total_t7_views': 'T+7 总播放量',
    // 以下字段后端直接使用英文ID（performanceData字段）
    'cpm60s': 'cpm60s',
    'maleAudienceRatio': 'maleAudienceRatio',
    'femaleAudienceRatio': 'femaleAudienceRatio',
    // 年龄段分布
    'ratio_18_23': 'ratio_18_23',
    'ratio_24_30': 'ratio_24_30',
    'ratio_31_40': 'ratio_31_40',
    'ratio_41_50': 'ratio_41_50',
    'ratio_50_plus': 'ratio_50_plus',
    'audience_18_40_ratio': 'audience_18_40_ratio',
    'audience_40_plus_ratio': 'audience_40_plus_ratio',
    // 八大人群包
    'ratio_town_middle_aged': 'ratio_town_middle_aged',
    'ratio_senior_middle_class': 'ratio_senior_middle_class',
    'ratio_z_era': 'ratio_z_era',
    'ratio_urban_silver': 'ratio_urban_silver',
    'ratio_town_youth': 'ratio_town_youth',
    'ratio_exquisite_mom': 'ratio_exquisite_mom',
    'ratio_new_white_collar': 'ratio_new_white_collar',
    'ratio_urban_blue_collar': 'ratio_urban_blue_collar',
    // 合作/项目维度
    'collaboration_status': '合作状态',
    'collaboration_amount': '合作金额',
    'collaboration_orderType': '下单方式',
    'collaboration_plannedReleaseDate': '计划发布日期',
    'collaboration_publishDate': '实际发布日期',
    'project_name': '项目名称',
    'work_t7_totalViews': 'T+7 播放量',
    'work_t7_likeCount': 'T+7 点赞数'
};

/**
 * 获取后端字段映射（支持动态和静态）
 * @param {string} entity - 实体类型
 * @returns {Promise<Object>} 字段映射对象
 */
async function getBackendFieldMapping(entity) {
    // 如果已有动态映射缓存，直接使用
    if (dynamicBackendFieldMapping) {
        return dynamicBackendFieldMapping;
    }

    try {
        // 尝试从后端获取元数据
        const metadata = await fetchFieldMetadata(entity);
        if (metadata) {
            dynamicBackendFieldMapping = buildFieldMapping(metadata);
            dynamicLabelMapping = buildLabelMapping(metadata);
            console.log('[Export Handler] 使用动态字段映射');
            return dynamicBackendFieldMapping;
        }
    } catch (error) {
        console.warn('[Export Handler] 动态映射获取失败，使用静态映射', error);
    }

    // 降级使用静态映射
    console.log('[Export Handler] 使用静态字段映射');
    return BACKEND_FIELD_KEY_MAP;
}

/**
 * 获取后端字段映射（同步版本，仅使用缓存或静态配置）
 * @returns {Object} 字段映射对象
 */
function getBackendFieldMappingSync() {
    return dynamicBackendFieldMapping || BACKEND_FIELD_KEY_MAP;
}

/**
 * 处理导出操作的主函数
 * @param {Object} uiElements - UI元素对象
 * @param {HTMLElement} uiElements.loadingOverlay - 加载遮罩
 * @param {HTMLButtonElement} uiElements.exportButton - 导出按钮
 * @param {HTMLElement} uiElements.buttonText - 按钮文本
 * @param {HTMLElement} uiElements.buttonLoader - 按钮加载器
 * @param {HTMLInputElement} uiElements.filenameInput - 文件名输入框
 * @param {HTMLInputElement} uiElements.timeMonthInput - 时间月份输入框
 * @returns {Promise<void>}
 */
export async function handleExport(uiElements) {
    const {
        loadingOverlay,
        exportButton,
        buttonText,
        buttonLoader,
        filenameInput,
        timeMonthInput
    } = uiElements;

    // 检查XLSX库是否可用
    if (!checkXLSXLibrary()) {
        return;
    }

    // 设置加载状态
    setLoadingState(loadingOverlay, exportButton, buttonText, buttonLoader, true, '正在生成报表...');

    try {
        // 构建请求数据
        const payload = buildExportPayload(timeMonthInput.value);

        // 验证是否选择了维度
        if (payload.fields.length === 0) {
            throw new Error('请至少选择一个要导出的数据维度。');
        }

        // 发送导出请求
        const response = await postRequest(API_ENDPOINTS.export, payload);

        // 验证响应
        if (!response.success || !response.data) {
            throw new Error(response.message || '后端返回数据为空。');
        }

        if (response.data.length === 0) {
            showToast('没有找到符合筛选条件的数据。', false);
            return;
        }

        // 生成Excel文件
        const filename = generateExcelFilename(filenameInput.value);
        await generateExcelFile(response.data, payload.fields, filename);

        // 显示成功消息
        showToast(`导出成功！文件已保存为: ${filename}`, true);

    } catch (error) {
        console.error('Export failed:', error);
        showToast(`导出失败: ${error.message}`, false);
    } finally {
        // 恢复UI状态
        setLoadingState(loadingOverlay, exportButton, buttonText, buttonLoader, false);
    }
}

/**
 * 构建导出请求的payload
 * @param {string} timeMonth - 时间月份
 * @returns {Object} 请求payload对象
 */
export function buildExportPayload(timeMonth) {
    const entity = getSelectedEntity();
    const fields = getSelectedDimensionIds();
    const filters = getFilterValues(entity);

    // 清理空值筛选条件
    const cleanedFilters = cleanFilters(filters);

    return {
        entity,
        fields,
        filters: cleanedFilters,
        timeMonth
    };
}

/**
 * 清理筛选条件，移除空值
 * @param {Object} filters - 原始筛选条件
 * @returns {Object} 清理后的筛选条件
 */
function cleanFilters(filters) {
    const cleaned = {};

    Object.entries(filters).forEach(([key, value]) => {
        // 跳过空值
        if (value === null || value === undefined || value === '') {
            return;
        }

        // 跳过空数组
        if (Array.isArray(value) && value.length === 0) {
            return;
        }

        // 跳过空日期范围
        if (typeof value === 'object' && value.start === '' && value.end === '') {
            return;
        }

        cleaned[key] = value;
    });

    return cleaned;
}

/**
 * 生成并下载Excel文件
 * @param {Array} data - 要导出的数据
 * @param {Array} selectedFields - 选中的字段列表
 * @param {string} filename - 文件名
 * @returns {Promise<void>}
 */
export async function generateExcelFile(data, selectedFields, filename) {
    try {
        // 确保XLSX库可用
        if (!window.XLSX) {
            throw new Error('XLSX库未加载');
        }

        // 处理数据，确保只包含选中的字段
        const processedData = processDataForExport(data, selectedFields);

        // 创建工作表
        const worksheet = XLSX.utils.json_to_sheet(processedData);

        // 设置列宽（可选）
        setColumnWidths(worksheet, processedData);

        // 创建工作簿
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '导出数据');

        // 添加工作簿属性（可选）
        workbook.Props = {
            Title: '数据导出报表',
            Author: '数据导出中心',
            CreatedDate: new Date()
        };

        // 生成并下载文件
        XLSX.writeFile(workbook, filename);

    } catch (error) {
        console.error('Excel generation failed:', error);
        throw new Error(`生成Excel文件失败: ${error.message}`);
    }
}

/**
 * 处理数据以准备导出
 * @param {Array} data - 原始数据
 * @param {Array} selectedFields - 选中的字段（前端字段ID）
 * @returns {Array} 处理后的数据
 */
function processDataForExport(data, selectedFields) {
    if (!selectedFields || selectedFields.length === 0) {
        return data;
    }

    // 获取字段映射（支持动态和静态）
    const backendFieldMap = getBackendFieldMappingSync();
    const labelMap = dynamicLabelMapping || getFieldMapping();

    return data.map(row => {
        const processedRow = {};

        selectedFields.forEach(field => {
            // 获取后端返回的字段key（中文或英文）
            const backendKey = backendFieldMap[field] || field;

            // 使用友好的列名（如果有映射的话）
            const columnName = labelMap[field] || field;

            // 从后端数据中读取值
            processedRow[columnName] = formatCellValue(row[backendKey]);
        });

        return processedRow;
    });
}

/**
 * 获取字段到友好名称的映射
 * @returns {Object} 字段映射对象
 */
function getFieldMapping() {
    return {
        nickname: '达人昵称',
        xingtuId: '星图ID',
        uid: 'UID',
        talentTier: '达人层级',
        talentSource: '达人来源',
        talentType: '内容标签',
        price: '一口价',
        highestRebate: '最高返点率',
        collaboration_count: '历史合作总次数',
        work_total_t7_views: 'T+7总播放量',
        cpm60s: '60s+预期CPM',
        maleAudienceRatio: '男性观众比例',
        femaleAudienceRatio: '女性观众比例',
        // 年龄段分布
        ratio_18_23: '18-23岁粉丝比例',
        ratio_24_30: '24-30岁粉丝比例',
        ratio_31_40: '31-40岁粉丝比例',
        ratio_41_50: '41-50岁粉丝比例',
        ratio_50_plus: '50岁以上粉丝比例',
        audience_18_40_ratio: '18-40岁观众占比',
        audience_40_plus_ratio: '40岁以上观众占比',
        // 八大人群包
        ratio_town_middle_aged: '小镇中老年粉丝比例',
        ratio_senior_middle_class: '资深中产粉丝比例',
        ratio_z_era: 'Z时代粉丝比例',
        ratio_urban_silver: '都市银发粉丝比例',
        ratio_town_youth: '小镇青年粉丝比例',
        ratio_exquisite_mom: '精致妈妈粉丝比例',
        ratio_new_white_collar: '新锐白领粉丝比例',
        ratio_urban_blue_collar: '都市蓝领粉丝比例',
        collaboration_status: '合作状态',
        collaboration_amount: '合作金额',
        collaboration_orderType: '下单方式',
        collaboration_plannedReleaseDate: '计划发布日期',
        collaboration_publishDate: '实际发布日期',
        project_name: '所属项目',
        project_type: '项目类型',
        work_t7_totalViews: 'T+7播放量',
        work_t7_likeCount: 'T+7点赞数'
    };
}

/**
 * 格式化单元格值
 * @param {any} value - 原始值
 * @returns {any} 格式化后的值
 */
function formatCellValue(value) {
    // 处理null和undefined
    if (value === null || value === undefined) {
        return '';
    }

    // 处理日期
    if (value instanceof Date) {
        return formatDate(value);
    }

    // 处理日期字符串
    if (typeof value === 'string' && isDateString(value)) {
        return formatDate(new Date(value));
    }

    // 处理数字（保留两位小数）
    if (typeof value === 'number' && !Number.isInteger(value)) {
        return Number(value.toFixed(2));
    }

    // 处理百分比
    if (typeof value === 'string' && value.endsWith('%')) {
        return value;
    }

    return value;
}

/**
 * 检查字符串是否为日期格式
 * @param {string} str - 要检查的字符串
 * @returns {boolean} 是否为日期字符串
 */
function isDateString(str) {
    // 简单的日期格式检查（YYYY-MM-DD）
    return /^\d{4}-\d{2}-\d{2}/.test(str);
}

/**
 * 格式化日期
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 设置工作表的列宽
 * @param {Object} worksheet - XLSX工作表对象
 * @param {Array} data - 数据数组
 */
function setColumnWidths(worksheet, data) {
    if (!data || data.length === 0) return;

    const cols = [];
    const headers = Object.keys(data[0]);

    headers.forEach((header, index) => {
        // 计算列宽（基于标题和数据内容）
        let maxLength = header.length;

        data.forEach(row => {
            const value = String(row[header] || '');
            maxLength = Math.max(maxLength, value.length);
        });

        // 设置列宽（最小10，最大50）
        cols[index] = { wch: Math.min(Math.max(maxLength * 1.2, 10), 50) };
    });

    worksheet['!cols'] = cols;
}

/**
 * 验证导出数据
 * @param {Object} payload - 导出请求payload
 * @returns {Object} 验证结果
 */
export function validateExportData(payload) {
    const errors = [];

    // 检查实体类型
    if (!payload.entity) {
        errors.push('未选择导出主体');
    }

    // 检查字段
    if (!payload.fields || payload.fields.length === 0) {
        errors.push('未选择要导出的数据维度');
    }

    // 检查时间月份
    if (!payload.timeMonth) {
        errors.push('未指定时间月份');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * 获取导出预览数据（可选功能）
 * @param {number} limit - 预览数据条数
 * @returns {Promise<Array>} 预览数据
 */
export async function getExportPreview(limit = 10) {
    const payload = buildExportPayload('');
    payload.limit = limit;
    payload.preview = true;

    try {
        const response = await postRequest(API_ENDPOINTS.export, payload);
        return response.data || [];
    } catch (error) {
        console.error('Failed to get export preview:', error);
        return [];
    }
}