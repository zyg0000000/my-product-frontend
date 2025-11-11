/**
 * @file feishu_sync.js
 * @version 2.1 - Mapping Clarity Update
 * @description 飞书数据同步页面的前端脚本
 * * --- 更新日志 (v2.1) ---
 * - [UI优化] 修改了 `renderMappingTable` 函数，使“字段映射配置”表格中关于“星图任务ID”的描述更清晰，明确其用于关联查找而非直接写入。
 * * --- 更新日志 (v2.0) ---
 * - [核心功能] 增加了“数据类型”选择功能，允许用户指定导入的数据是 T+7 还是 T+21，以及新的手动日报更新。
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

    // --- [v2.1 优化] DATA_MAPPING 定义移到前端，便于修改显示文本 ---
    // 这个映射关系主要用于 *展示* 给用户看，实际的数据处理逻辑在后端。
    // 后端 utils.js 中可能仍有类似的常量用于实际处理 T7/T21 数据。
    const DATA_MAPPING_DISPLAY = {
        '星图任务ID': { dbFieldDisplay: '关联查找 (via collaborations.taskId)', typeDisplay: '关联主键' }, // 修改显示文本
        '视频ID': { dbFieldDisplay: 'works.platformWorkId', typeDisplay: '文本' },
        '视频实际发布时间': { dbFieldDisplay: 'works.publishedAt', typeDisplay: '日期' },
        '数据最后更新时间': { dbFieldDisplay: 'works.t7/t21_statsUpdatedAt', typeDisplay: '日期' }, // 示例：可以更具体
        '播放量': { dbFieldDisplay: 'works.t7/t21_totalViews', typeDisplay: '数字' },
        '点赞量': { dbFieldDisplay: 'works.t7/t21_likeCount', typeDisplay: '数字' },
        '评论量': { dbFieldDisplay: 'works.t7/t21_commentCount', typeDisplay: '数字' },
        '分享量': { dbFieldDisplay: 'works.t7/t21_shareCount', typeDisplay: '数字' },
        '组件曝光量': { dbFieldDisplay: 'works.t7/t21_componentImpressionCount', typeDisplay: '数字' },
        '组件点击量': { dbFieldDisplay: 'works.t7/t21_componentClickCount', typeDisplay: '数字' },
        '视频完播率': { dbFieldDisplay: 'works.t7/t21_completionRate', typeDisplay: '百分比' },
        '分频次触达人数-1次': { dbFieldDisplay: 'works.t7/t21_reachByFrequency.freq1', typeDisplay: '数字' },
        '分频次触达人数-2次': { dbFieldDisplay: 'works.t7/t21_reachByFrequency.freq2', typeDisplay: '数字' },
        '分频次触达人数-3次': { dbFieldDisplay: 'works.t7/t21_reachByFrequency.freq3', typeDisplay: '数字' },
        '分频次触达人数-4次': { dbFieldDisplay: 'works.t7/t21_reachByFrequency.freq4', typeDisplay: '数字' },
        '分频次触达人数-5次': { dbFieldDisplay: 'works.t7/t21_reachByFrequency.freq5', typeDisplay: '数字' },
        '分频次触达人数-6次': { dbFieldDisplay: 'works.t7/t21_reachByFrequency.freq6', typeDisplay: '数字' },
        '分频次触达人数-7次及以上': { dbFieldDisplay: 'works.t7/t21_reachByFrequency.freq7plus', typeDisplay: '数字' },
    };

    // --- Page-Specific Functions ---
    function renderMappingTable() {
        mappingTableBody.innerHTML = '';
        // 使用 DATA_MAPPING_DISPLAY 渲染表格
        for (const feishuCol in DATA_MAPPING_DISPLAY) {
            const mapping = DATA_MAPPING_DISPLAY[feishuCol];
            const row = `
                <tr class="bg-white border-b hover:bg-gray-50">
                    <td class="px-6 py-4 font-medium text-gray-900">${feishuCol}</td>
                    <td class="px-6 py-4 font-mono text-sm text-indigo-600">${mapping.dbFieldDisplay}</td>
                    <td class="px-6 py-4"><span class="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-800">${mapping.typeDisplay}</span></td>
                </tr>
            `;
            mappingTableBody.innerHTML += row;
        }
    }

    function extractSpreadsheetToken(url) {
        // 优先匹配 sheets/ URL 格式
        let match = url.match(/\/(?:sheets)\/([a-zA-Z0-9]+)/);
        if (match && match[1]) {
            return match[1];
        }
        // 备用匹配 spreadsheet/ URL 格式
        match = url.match(/\/(?:spreadsheet)\/([a-zA-Z0-9]+)/);
        if (match && match[1]) {
            return match[1];
        }
        // 如果上面两种格式都没匹配上，尝试将整个输入作为 token (可能是用户直接粘贴 token)
        if (url && !url.includes('/')) {
            return url;
        }
        return null; // 如果是无效 URL 或无法提取，返回 null
    }


    async function handleSync() {
        const url = spreadsheetUrlInput.value.trim();
        if (!url) {
            showResult('请输入飞书电子表格链接或 Token。', 'error'); // 提示信息优化
            return;
        }
        const spreadsheetToken = extractSpreadsheetToken(url);
        if (!spreadsheetToken) {
            showResult('无法从链接或输入中解析出有效的 Spreadsheet Token，请检查链接格式或直接粘贴 Token。', 'error'); // 提示信息优化
            return;
        }

        // Get selected data type (including the new manual option)
        const selectedDataType = document.querySelector('input[name="dataType"]:checked').value;

        setLoadingState(true);
        syncResultDiv.classList.add('hidden'); // 开始同步时隐藏旧结果

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

            // 检查 success 字段是否存在且为 true
            if (!response.ok || !result.success) {
                 // 优先使用 result.message，其次 result.error，最后是通用错误
                const errorMessage = result.message || result.error || '未知错误';
                throw new Error(errorMessage);
            }

            // 处理成功响应，确保 result.data 存在
            const data = result.data || {}; // 使用空对象作为默认值
            const successMessage = `同步成功！共处理 ${data.processedRows || 0} 行数据。<br>新建记录: ${data.created || 0} | 更新记录: ${data.updated || 0}`;
            showResult(successMessage, 'success');

        } catch (error) {
            // catch 块现在只处理网络错误或上面抛出的 Error
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
        renderMappingTable(); // 使用新的 DATA_MAPPING_DISPLAY 渲染
        syncBtn.addEventListener('click', handleSync);
        mappingToggleBtn.addEventListener('click', () => {
            mappingTableContainer.classList.toggle('hidden');
            mappingToggleIcon.classList.toggle('rotate-180'); // 使用 rotate-180 而不是 rotate(180deg)
        });

        // 添加新的 radio button 选项
        const dataTypeFieldset = document.querySelector('fieldset'); // 假设只有一个 fieldset
        if (dataTypeFieldset) {
            const manualOptionDiv = document.createElement('div');
            manualOptionDiv.className = 'flex items-center';
            manualOptionDiv.innerHTML = `
                <input id="data-type-manual" name="dataType" type="radio" value="manualDailyUpdate" class="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500">
                <label for="data-type-manual" class="ml-2 block text-sm text-gray-900">手动日报更新 (&gt;14天)</label>
            `;
            dataTypeFieldset.appendChild(manualOptionDiv);
        }
    }

    initializePage();
});
