/**
 * import-export.js - 导入导出功能模块
 * 处理 Excel 导入、飞书导入和数据导出功能
 */

import {
    TALENT_BULK_UPDATE_ENDPOINT,
    FEISHU_SYNC_ENDPOINT,
    TALENT_SEARCH_ENDPOINT,
    COLUMN_MAP
} from './constants.js';
import { apiRequest } from './api.js';
import { showCustomAlert, hideCustomAlert } from './utils.js';
import {
    dimensions,
    totalTalents,
    importDataCache,
    updateImportDataCache
} from './state-manager.js';
import { buildSearchPayload } from './filter-panel.js';

/**
 * 处理飞书 URL 提交
 * @param {Function} fetchCallback - 获取数据的回调函数
 */
export async function handleFeishuUrlSubmit(fetchCallback) {
    const feishuUrlInput = document.getElementById('feishu-url-input');
    const feishuImportModal = document.getElementById('feishu-import-modal');
    const url = feishuUrlInput.value.trim();

    if (!url) {
        showCustomAlert('请输入飞书表格链接。');
        return;
    }

    feishuImportModal.classList.add('hidden');
    showCustomAlert('正在从飞书读取并处理数据，请稍候...', '处理中');

    try {
        const payload = {
            feishuUrl: url,
            dataType: 'talentPerformance'
        };

        const response = await apiRequest(FEISHU_SYNC_ENDPOINT, 'POST', payload);

        if (response.success && response.data && Array.isArray(response.data.data)) {
            prepareAndShowConfirmationModal(response.data.data);
        } else {
            throw new Error(response.error || (response.data && response.data.message) || '从飞书获取或处理数据失败。');
        }
    } catch (error) {
        showCustomAlert(`飞书导入失败: ${error.message}`);
    }
}

/**
 * 处理 Excel 导入
 * @param {Event} event - 文件选择事件
 */
export async function handleExcelImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    showCustomAlert('正在解析Excel文件，请稍候...', '文件处理中');

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null, raw: false });

            const processedData = processExcelData(jsonData);
            prepareAndShowConfirmationModal(processedData.validData, processedData.invalidRows);
        } catch (error) {
            showCustomAlert(`文件解析失败: ${error.message}`);
        } finally {
            event.target.value = null;
        }
    };

    reader.onerror = () => {
        showCustomAlert('读取文件时发生错误。');
    };

    reader.readAsArrayBuffer(file);
}

/**
 * 处理 Excel 数据
 * @param {Array} rows - Excel 数据行
 * @returns {Object} 处理后的数据
 */
export function processExcelData(rows) {
    const validData = [];
    const invalidRows = [];

    rows.forEach(row => {
        const processedRow = { performanceData: {} };

        for (const excelHeader in row) {
            const mapping = COLUMN_MAP[excelHeader.trim()];
            let value = row[excelHeader];

            if (value === null || value === undefined || String(value).trim() === '') continue;

            if (mapping) {
                try {
                    if (mapping.format === 'percentage') {
                        let numValue = parseFloat(String(value).replace('%', ''));
                        if (!isNaN(numValue)) {
                            value = numValue > 1 ? numValue / 100 : numValue;
                        } else {
                            continue;
                        }
                    } else if (mapping.format === 'number') {
                        value = parseFloat(value);
                        if (isNaN(value)) continue;
                    }

                    if (mapping.type === 'top') {
                        processedRow[mapping.key] = String(value).trim();
                    } else if (mapping.type === 'performance') {
                        processedRow.performanceData[mapping.key] = value;
                    }
                } catch {
                    continue;
                }
            }
        }

        if (processedRow.xingtuId) {
            validData.push(processedRow);
        } else {
            invalidRows.push(row);
        }
    });

    return { validData, invalidRows };
}

/**
 * 准备并显示确认模态框
 * @param {Array} validData - 有效数据
 * @param {Array} invalidRows - 无效行
 */
export function prepareAndShowConfirmationModal(validData, invalidRows = []) {
    const today = new Date().toISOString().split('T')[0];
    const importConfirmModal = document.getElementById('import-confirm-modal');
    const importSummaryEl = document.getElementById('import-summary');

    // 为所有数据添加更新日期
    validData.forEach(row => {
        if (!row.performanceData) row.performanceData = {};
        row.performanceData.lastUpdated = today;
    });

    updateImportDataCache(validData);
    hideCustomAlert();

    if (validData.length === 0) {
        showCustomAlert('未找到任何包含有效"达人星图ID"的可更新数据。');
        return;
    }

    importSummaryEl.innerHTML = `
        <p>共解析到 <strong>${validData.length}</strong> 条可用于更新的数据。</p>
        <p class="text-sm mt-2">所有记录的"更新日期"都将设置为 <strong class="text-blue-600">${today}</strong>。</p>
        ${invalidRows.length > 0 ?
            `<p class="mt-2 text-yellow-600"><strong>${invalidRows.length}</strong> 条数据因缺少"达人星图ID"或有效更新内容而被忽略。</p>`
            : ''}
    `;

    importConfirmModal.classList.remove('hidden');
}

/**
 * 处理确认导入
 * @param {Function} fetchCallback - 获取数据的回调函数
 */
export async function handleConfirmImport(fetchCallback) {
    const importConfirmModal = document.getElementById('import-confirm-modal');

    if (!importDataCache || importDataCache.length === 0) {
        showCustomAlert('没有可导入的数据。');
        return;
    }

    importConfirmModal.classList.add('hidden');
    showCustomAlert('正在上传并更新数据，请稍候...', '导入中');

    try {
        const response = await apiRequest(TALENT_BULK_UPDATE_ENDPOINT, 'PUT', { updates: importDataCache });

        if (response.success) {
            const { updated, failed, errors } = response.data;
            let resultMessage = `导入操作完成！<br>
                <strong class="text-green-600">成功更新: ${updated} 条</strong><br>
                <strong class="text-red-500">失败: ${failed} 条</strong>`;

            if (failed > 0 && errors && errors.length > 0) {
                resultMessage += '<br><br>失败详情 (前5条):<ul>';
                errors.slice(0, 5).forEach(err => {
                    resultMessage += `<li class="text-xs list-disc ml-4">ID: ${err.xingtuId} - ${err.reason}</li>`;
                });
                resultMessage += '</ul>';
            }

            showCustomAlert(resultMessage, '导入结果');
            await fetchCallback();
        } else {
            showCustomAlert(`导入失败: ${response.message}`);
        }
    } catch (error) {
        console.error('导入请求失败:', error);
    } finally {
        updateImportDataCache(null);
    }
}

/**
 * 处理导出所有数据
 */
export async function handleExportAll() {
    showCustomAlert('正在准备全量数据，请稍候...', '导出提示');

    const payload = {
        ...buildSearchPayload(),
        page: 1,
        pageSize: totalTalents || 9999
    };

    try {
        const response = await apiRequest(TALENT_SEARCH_ENDPOINT, 'POST', payload);

        if (response.success && Array.isArray(response.data.talents)) {
            const talentsToExport = response.data.talents;
            const allDimensionsForExport = dimensions;

            const dataForSheet = talentsToExport.map(talent => {
                const row = {};
                const topLevelFields = new Set(['nickname', 'xingtuId', 'uid', 'talentTier', 'talentType']);

                allDimensionsForExport.forEach(dim => {
                    let value = topLevelFields.has(dim.id)
                        ? talent[dim.id]
                        : (talent.performanceData ? talent.performanceData[dim.id] : undefined);

                    if (value === null || value === undefined) {
                        value = '';
                    } else if (dim.type === 'percentage' && !isNaN(parseFloat(value))) {
                        value = `${(parseFloat(value) * 100).toFixed(2)}%`;
                    } else if (dim.id === 'lastUpdated' && value) {
                        value = String(value).split('T')[0];
                    }

                    row[dim.name] = value;
                });

                return row;
            });

            const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, '达人数据');
            XLSX.writeFile(workbook, `达人库数据导出_${new Date().toISOString().slice(0, 10)}.xlsx`);

            hideCustomAlert();
        } else {
            throw new Error('未能获取全部达人数据用于导出。');
        }
    } catch (error) {
        showCustomAlert(`导出失败: ${error.message}`);
    }
}