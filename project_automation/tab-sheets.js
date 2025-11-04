/**
 * @file project_automation/tab-sheets.js
 * @description 飞书表格Tab - 显示已生成的表格历史记录
 */

export default class SheetsTab {
    constructor(options) {
        this.options = options;
        this.projectId = options.projectId;
        this.apiRequest = options.apiRequest;
        this.showToast = options.showToast;
        this.showConfirm = options.showConfirm;

        // --- API URLs ---
        this.API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';
        this.GENERATED_SHEETS_API = `${this.API_BASE_URL}/generated-sheets`;

        // --- State ---
        this.allSheetsCache = [];
        this.currentPage = 1;
        this.ITEMS_PER_PAGE = 10;

        // --- DOM Elements ---
        this.generatedSheetsContainer = document.getElementById('generated-sheets-container');
        this.generatedSheetsPaginationContainer = document.getElementById('generated-sheets-pagination-container');
        this.openSheetGeneratorBtn = document.getElementById('open-sheet-generator-btn');

        // --- Bind Methods ---
        this.handleSheetHistoryClick = this.handleSheetHistoryClick.bind(this);
        this.openSheetGenerator = this.openSheetGenerator.bind(this);
    }

    async load() {
        console.log('[SheetsTab] 加载飞书表格历史记录');
        this.setupEventListeners();
        await this.loadGeneratedSheets(1);
    }

    unload() {
        console.log('[SheetsTab] 卸载Tab');
    }

    setupEventListeners() {
        if (this.generatedSheetsContainer) {
            this.generatedSheetsContainer.removeEventListener('click', this.handleSheetHistoryClick);
            this.generatedSheetsContainer.addEventListener('click', this.handleSheetHistoryClick);
        }

        if (this.openSheetGeneratorBtn) {
            this.openSheetGeneratorBtn.removeEventListener('click', this.openSheetGenerator);
            this.openSheetGeneratorBtn.addEventListener('click', this.openSheetGenerator);
        }
    }

    async loadGeneratedSheets(page) {
        this.currentPage = page;

        try {
            // 如果缓存为空，则从服务器加载
            if (this.allSheetsCache.length === 0) {
                const response = await this.apiRequest(`${this.GENERATED_SHEETS_API}?projectId=${this.projectId}`);
                this.allSheetsCache = response.data || [];
            }

            const history = this.allSheetsCache.sort((a, b) =>
                new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp)
            );

            if (history.length === 0) {
                this.generatedSheetsContainer.innerHTML = `
                    <tr><td colspan="4" class="text-center py-6 text-sm text-gray-400">暂无历史记录</td></tr>`;
                this.renderPaginationControls(0);
                return;
            }

            // 分页
            const start = (page - 1) * this.ITEMS_PER_PAGE;
            const end = start + this.ITEMS_PER_PAGE;
            const paginatedHistory = history.slice(start, end);

            // 渲染表格历史
            this.generatedSheetsContainer.innerHTML = paginatedHistory.map(item => `
                <tr class="bg-white border-b hover:bg-gray-50">
                    <td class="px-6 py-4">
                        <p class="font-medium text-gray-800 truncate" title="${item.fileName}">${item.fileName}</p>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-500">${this.formatDate(item.createdAt || item.timestamp, true)}</td>
                    <td class="px-6 py-4">
                        <a href="${item.sheetUrl}" target="_blank" class="text-sm text-blue-600 hover:underline">打开表格</a>
                    </td>
                    <td class="px-6 py-4 text-right space-x-4">
                        <button data-action="copy-token"
                                data-token="${item.sheetToken}"
                                class="font-medium text-gray-600 hover:underline">复制TOKEN</button>
                        <button data-action="delete-sheet"
                                data-id="${item._id}"
                                class="font-medium text-red-600 hover:underline">删除</button>
                    </td>
                </tr>
            `).join('');

            // 渲染分页
            this.renderPaginationControls(history.length);

        } catch (error) {
            console.error('加载历史记录失败:', error);
            this.generatedSheetsContainer.innerHTML = `
                <tr><td colspan="4" class="text-center py-6 text-sm text-red-500">加载历史记录失败</td></tr>`;
        }
    }

    renderPaginationControls(totalItems) {
        if (!this.generatedSheetsPaginationContainer) return;

        this.generatedSheetsPaginationContainer.innerHTML = '';
        if (totalItems <= this.ITEMS_PER_PAGE) return;

        const totalPages = Math.ceil(totalItems / this.ITEMS_PER_PAGE);
        const prevDisabled = this.currentPage === 1;
        const nextDisabled = this.currentPage === totalPages;

        let paginationHtml = `<span class="text-sm text-gray-700 mr-4">总计 ${totalItems} 项</span>`;
        paginationHtml += `
            <button data-page="${this.currentPage - 1}"
                    class="px-3 py-1 text-sm rounded-md ${prevDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-600 hover:bg-gray-50 border'}"
                    ${prevDisabled ? 'disabled' : ''}>上一页</button>`;
        paginationHtml += `<span class="px-4 text-sm text-gray-700">第 ${this.currentPage} / ${totalPages} 页</span>`;
        paginationHtml += `
            <button data-page="${this.currentPage + 1}"
                    class="px-3 py-1 text-sm rounded-md ${nextDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-600 hover:bg-gray-50 border'}"
                    ${nextDisabled ? 'disabled' : ''}>下一页</button>`;

        this.generatedSheetsPaginationContainer.innerHTML = paginationHtml;

        // 绑定分页按钮事件
        this.generatedSheetsPaginationContainer.querySelectorAll('button[data-page]').forEach(button => {
            button.addEventListener('click', (e) => {
                const targetPage = parseInt(e.currentTarget.dataset.page, 10);
                this.loadGeneratedSheets(targetPage);
            });
        });
    }

    async handleSheetHistoryClick(e) {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;

        if (action === 'copy-token') {
            const token = target.dataset.token;
            try {
                await navigator.clipboard.writeText(token);
                this.showToast('表格TOKEN已复制!');
            } catch (err) {
                this.showToast('复制失败: ' + err, 'error');
            }
            return;
        }

        if (action === 'delete-sheet') {
            const sheetId = target.dataset.id;
            this.showConfirm('确定要删除这条历史记录吗？此操作将一并删除云端的飞书表格。', '确认删除', async (confirmed) => {
                if (confirmed) {
                    try {
                        await this.apiRequest(`${this.GENERATED_SHEETS_API}?id=${sheetId}`, 'DELETE');
                        this.allSheetsCache = this.allSheetsCache.filter(s => s._id !== sheetId);
                        this.loadGeneratedSheets(this.currentPage);
                        this.showToast('记录已删除');
                    } catch (error) {
                        // 错误已在 apiRequest 中处理
                    }
                }
            });
        }
    }

    openSheetGenerator() {
        // 触发打开表格生成抽屉事件
        document.dispatchEvent(new CustomEvent('openSheetGeneratorDrawer'));
    }

    // 清空缓存（生成新表格后调用）
    clearCache() {
        this.allSheetsCache = [];
    }

    formatDate(isoString, includeTime = false) {
        if (!isoString) return 'N/A';
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return '无效日期';

        const pad = (num) => num.toString().padStart(2, '0');
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());

        if (includeTime) {
            const hours = pad(date.getHours());
            const minutes = pad(date.getMinutes());
            return `${year}-${month}-${day} ${hours}:${minutes}`;
        }
        return `${year}-${month}-${day}`;
    }
}
