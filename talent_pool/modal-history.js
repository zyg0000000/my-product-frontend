/**
 * modal-history.js
 * 合作历史模态框模块（独立可扩展设计）
 *
 * 功能：
 * - 查看达人的历史合作记录
 * - 显示项目名称、合作状态、一口价、返点率、视频链接
 * - 按创建时间倒序排列
 * - 点击项目名称跳转到订单详情页
 *
 * 可扩展方向（预留接口）：
 * 1. 数据可视化：添加合作趋势图表、ROI分析
 * 2. 高级筛选：按日期范围、项目类型、合作状态筛选
 * 3. 评级系统：对每次合作进行评分和备注
 * 4. 对比分析：多次合作的效果对比、CPM趋势分析
 * 5. 报告导出：生成PDF格式的合作报告
 *
 * 架构说明：
 * - 独立模块，最小依赖主控制器
 * - 数据获取通过 app.allCollaborations 和 app.allProjects
 * - 渲染逻辑与数据逻辑分离，便于扩展
 * - 预留 hooks 用于未来功能扩展
 */

export class HistoryModal {
    constructor(app) {
        this.app = app;  // Reference to main TalentPoolApp
        this.currentTalentId = null;
        this.currentTalentName = '';
        this.historyData = [];  // Processed collaboration data

        this.elements = {
            modal: null,
            talentName: null,
            closeBtn: null,
            tableContainer: null
        };

        // ========== 扩展接口（预留） ==========
        this.hooks = {
            beforeRender: null,      // 渲染前钩子
            afterRender: null,       // 渲染后钩子
            onDataLoaded: null,      // 数据加载后钩子
            customRenderer: null     // 自定义渲染器
        };

        // 配置选项（为未来扩展预留）
        this.config = {
            enableVisualization: false,  // 是否启用数据可视化
            enableFiltering: false,      // 是否启用高级筛选
            enableRating: false,         // 是否启用评级系统
            enableExport: false,         // 是否启用导出功能
            sortBy: 'createdAt',         // 排序字段
            sortOrder: 'desc'            // 排序方向
        };
    }

    /**
     * 初始化模块
     */
    init() {
        this.cacheElements();
        this.bindEvents();
    }

    /**
     * 缓存DOM元素
     */
    cacheElements() {
        this.elements.modal = document.getElementById('history-modal');
        this.elements.talentName = document.getElementById('history-talent-name');
        this.elements.closeBtn = document.querySelector('#history-modal .close-modal-btn');
        this.elements.tableContainer = document.getElementById('history-table-container');
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // Close button
        this.elements.closeBtn?.addEventListener('click', () => this.close());

        // Click outside to close
        this.elements.modal?.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) {
                this.close();
            }
        });
    }

    /**
     * 打开模态框
     * @param {string} talentId - 达人ID
     */
    async open(talentId) {
        if (!this.elements.modal || !this.elements.talentName || !this.elements.tableContainer) {
            console.error('HistoryModal: Required elements not found');
            return;
        }

        this.currentTalentId = talentId;
        const talent = this.app.currentTalentData.find(t => t.id === talentId);

        if (!talent) {
            console.error('HistoryModal: Talent not found:', talentId);
            return;
        }

        this.currentTalentName = talent.nickname;
        this.elements.talentName.textContent = this.currentTalentName;

        // Show loading state
        this.elements.tableContainer.innerHTML = '<p class="text-center text-gray-500 py-8">正在加载合作历史...</p>';

        // Show modal
        this.elements.modal.classList.remove('hidden');

        // Load and render data
        await this.loadHistoryData();
        this.render();
    }

    /**
     * 关闭模态框
     */
    close() {
        if (this.elements.modal) {
            this.elements.modal.classList.add('hidden');
        }
    }

    /**
     * 加载合作历史数据
     * （独立数据加载逻辑，便于扩展）
     */
    async loadHistoryData() {
        try {
            // 从主控获取该达人的合作历史
            const collaborations = this.app.allCollaborations.get(this.currentTalentId) || [];

            // 处理数据：关联项目信息
            this.historyData = collaborations.map(collab => {
                const project = this.app.allProjects.find(p => p.id === collab.projectId);
                return {
                    ...collab,
                    projectName: project ? project.name : '未知项目'
                };
            });

            // 排序（按配置排序）
            this.sortHistoryData();

            // 执行数据加载后钩子
            if (this.hooks.onDataLoaded) {
                this.hooks.onDataLoaded(this.historyData);
            }

            console.log('[HistoryModal] Data loaded:', this.historyData.length, 'records');
        } catch (error) {
            console.error('[HistoryModal] Failed to load data:', error);
            this.historyData = [];
        }
    }

    /**
     * 排序历史数据
     * （独立排序逻辑，便于扩展）
     */
    sortHistoryData() {
        const { sortBy, sortOrder } = this.config;

        this.historyData.sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];

            // 日期字段特殊处理
            if (sortBy === 'createdAt') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }

            if (sortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
    }

    /**
     * 渲染合作历史
     * （独立渲染逻辑，便于扩展）
     */
    render() {
        if (!this.elements.tableContainer) return;

        // 执行渲染前钩子
        if (this.hooks.beforeRender) {
            this.hooks.beforeRender(this.historyData);
        }

        // 使用自定义渲染器（如果有）
        if (this.hooks.customRenderer) {
            this.elements.tableContainer.innerHTML = '';
            this.elements.tableContainer.appendChild(this.hooks.customRenderer(this.historyData));
            return;
        }

        // 默认渲染逻辑
        if (this.historyData.length === 0) {
            this.elements.tableContainer.innerHTML = '<p class="text-center text-gray-500 py-8">暂无合作历史记录。</p>';
            return;
        }

        const table = this.createHistoryTable();
        this.elements.tableContainer.innerHTML = '';
        this.elements.tableContainer.appendChild(table);

        // 执行渲染后钩子
        if (this.hooks.afterRender) {
            this.hooks.afterRender(this.historyData);
        }
    }

    /**
     * 创建合作历史表格
     * @returns {HTMLTableElement}
     */
    createHistoryTable() {
        const table = document.createElement('table');
        table.className = 'min-w-full divide-y divide-gray-200';

        // 表头
        const thead = document.createElement('thead');
        thead.className = 'bg-gray-50';
        thead.innerHTML = `
            <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">项目名称</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">合作状态</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">星图一口价</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">返点率</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">视频链接</th>
            </tr>
        `;
        table.appendChild(thead);

        // 表体
        const tbody = document.createElement('tbody');
        tbody.className = 'bg-white divide-y divide-gray-200';

        this.historyData.forEach(item => {
            const row = this.createHistoryRow(item);
            tbody.appendChild(row);
        });

        table.appendChild(tbody);

        return table;
    }

    /**
     * 创建单行合作历史记录
     * @param {Object} item - 合作记录数据
     * @returns {HTMLTableRowElement}
     */
    createHistoryRow(item) {
        const row = document.createElement('tr');
        row.className = 'bg-white';

        // 项目名称（可点击跳转）
        const projectLink = `<a href="order_list.html?projectId=${item.projectId}"
                               target="_blank"
                               class="text-blue-600 hover:underline">${item.projectName}</a>`;

        // 星图一口价
        const amount = Number(item.amount || 0).toLocaleString();

        // 返点率
        const rebate = item.rebate === null || item.rebate === undefined
            ? 'N/A'
            : `${item.rebate}%`;

        // 视频链接
        const videoLink = item.videoId
            ? `<a href="https://www.douyin.com/video/${item.videoId}"
                 target="_blank"
                 class="text-blue-600 hover:underline">查看视频</a>`
            : 'N/A';

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">${projectLink}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.status || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">¥ ${amount}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${rebate}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">${videoLink}</td>
        `;

        return row;
    }

    // ========== 扩展方法（预留接口） ==========

    /**
     * 设置配置选项
     * @param {Object} config - 配置对象
     */
    setConfig(config) {
        this.config = { ...this.config, ...config };
    }

    /**
     * 注册钩子函数
     * @param {string} hookName - 钩子名称
     * @param {Function} callback - 回调函数
     */
    registerHook(hookName, callback) {
        if (this.hooks.hasOwnProperty(hookName)) {
            this.hooks[hookName] = callback;
        } else {
            console.warn(`[HistoryModal] Unknown hook: ${hookName}`);
        }
    }

    /**
     * 获取当前历史数据
     * @returns {Array} 历史数据数组
     */
    getHistoryData() {
        return this.historyData;
    }

    /**
     * 刷新数据并重新渲染
     */
    async refresh() {
        await this.loadHistoryData();
        this.render();
    }

    /**
     * 导出数据（预留接口）
     * @param {string} format - 导出格式 ('json', 'csv', 'pdf')
     * @returns {Promise<void>}
     */
    async exportData(format = 'json') {
        console.log(`[HistoryModal] Export to ${format} - Feature coming soon!`);
        // TODO: 实现导出功能
        // 可以集成 jsPDF、csv-export 等库
    }
}
