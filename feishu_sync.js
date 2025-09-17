/**
 * @file feishu_sync.js
 * @version 2.0-snapshot-support
 * @description 飞书数据同步页面的前端脚本
 * * --- 更新日志 (v2.0) ---
 * - [核心功能] 增加了“数据类型”选择功能，允许用户指定导入的数据是 T+7 还是 T+21。
 * - [API调用] 在调用同步接口时，会将用户选择的数据类型作为 `dataType` 参数一并发送。
 */
document.addEventListener('DOMContentLoaded', function () {
    // --- API Configuration ---
    const API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';

    // --- DOM Elements ---
    const spreadsheetUrlInput = document.getElementById('spreadsheet-url');
    const syncBtn = document.getElementById('sync-btn');
    const syncBtnText = document.getElementById('sync-btn-text');
    const syncBtnLoader = document.getElementById('sync-btn-loader');
    const syncResultDiv = document.getElementById('sync-result');
    const mappingTableBody = document.getElementById('mapping-table-body');
    const mappingToggleBtn = document.getElementById('mapping-toggle-btn');
    const mappingToggleIcon = document.getElementById('mapping-toggle-icon');
    const mappingTableContainer = document.getElementById('mapping-table-container');

    const DATA_MAPPING = {
        '星图任务ID': { dbField: 'collaborationId', type: '关联查找' },
        '视频ID': { dbField: 'platformWorkId', type: '文本' },
        '视频实际发布时间': { dbField: 'publishedAt', type: '日期' },
        '数据最后更新时间': { dbField: 'statsUpdatedAt', type: '日期' },
        '播放量': { dbField: 'totalViews', type: '数字' },
        '点赞量': { dbField: 'likeCount', type: '数字' },
        '评论量': { dbField: 'commentCount', type: '数字' },
        '分享量': { dbField: 'shareCount', type: '数字' },
        '组件曝光量': { dbField: 'componentImpressionCount', type: '数字' },
        '组件点击量': { dbField: 'componentClickCount', type: '数字' },
        '视频完播率': { dbField: 'completionRate', type: '百分比' },
        '分频次触达人数-1次': { dbField: 'reachByFrequency.freq1', type: '数字' },
        '分频次触达人数-2次': { dbField: 'reachByFrequency.freq2', type: '数字' },
        '分频次触达人数-3次': { dbField: 'reachByFrequency.freq3', type: '数字' },
        '分频次触达人数-4次': { dbField: 'reachByFrequency.freq4', type: '数字' },
        '分频次触达人数-5次': { dbField: 'reachByFrequency.freq5', type: '数字' },
        '分频次触达人数-6次': { dbField: 'reachByFrequency.freq6', type: '数字' },
        '分频次触达人数-7次及以上': { dbField: 'reachByFrequency.freq7plus', type: '数字' },
    };

    // --- Page-Specific Functions ---
    function renderMappingTable() {
        mappingTableBody.innerHTML = '';
        for (const feishuCol in DATA_MAPPING) {
            const mapping = DATA_MAPPING[feishuCol];
            const row = `
                <tr class="bg-white border-b hover:bg-gray-50">
                    <td class="px-6 py-4 font-medium text-gray-900">${feishuCol}</td>
                    <td class="px-6 py-4 font-mono text-sm text-indigo-600">${mapping.dbField}</td>
                    <td class="px-6 py-4"><span class="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-800">${mapping.type}</span></td>
                </tr>
            `;
            mappingTableBody.innerHTML += row;
        }
    }
    
    function extractSpreadsheetToken(url) {
        const regex = /\/(?:sheets|spreadsheet)\/([a-zA-Z0-9]+)/;
        const match = url.match(regex);
        return (match && match[1]) ? match[1] : null;
    }

    async function handleSync() {
        const url = spreadsheetUrlInput.value.trim();
        if (!url) {
            showResult('请输入飞书电子表格链接。', 'error');
            return;
        }
        const spreadsheetToken = extractSpreadsheetToken(url);
        if (!spreadsheetToken) {
            showResult('无法从链接中解析出 Spreadsheet Token，请检查链接是否正确。', 'error');
            return;
        }

        // [v2.0] Get selected data type
        const selectedDataType = document.querySelector('input[name="dataType"]:checked').value;

        setLoadingState(true);
        try {
            const response = await fetch(`${API_BASE_URL}/sync-from-feishu`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    spreadsheetToken: spreadsheetToken,
                    dataType: selectedDataType // Pass the data type to the backend
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || result.message || '未知错误');
            const successMessage = `同步成功！共处理 ${result.processedRows} 行数据。<br>新建记录: ${result.created} | 更新记录: ${result.updated}`;
            showResult(successMessage, 'success');
        } catch (error) {
            showResult(`同步失败: ${error.message}`, 'error');
        } finally {
            setLoadingState(false);
        }
    }

    function setLoadingState(isLoading) {
        syncBtn.disabled = isLoading;
        syncBtnText.classList.toggle('hidden', isLoading);
        syncBtnLoader.classList.toggle('hidden', !isLoading);
    }
    
    function showResult(message, type) {
        syncResultDiv.innerHTML = message;
        syncResultDiv.className = `mt-4 p-4 rounded-lg text-sm ${type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`;
        syncResultDiv.classList.remove('hidden');
    }

    function initializePage() {
        renderMappingTable();
        syncBtn.addEventListener('click', handleSync);
        mappingToggleBtn.addEventListener('click', () => {
            mappingTableContainer.classList.toggle('hidden');
            mappingToggleIcon.classList.toggle('rotate-180');
        });
    }

    initializePage();
});
