/**
 * modal-history.js - 合作历史 Modal 模块
 * 基于 talent_pool.js v6.2.1 - 独立可扩展设计
 *
 * 未来升级路径：
 * 1. 数据可视化：添加趋势图表（合作次数、金额变化）
 * 2. 高级筛选：按日期范围、项目类型、合作状态筛选
 * 3. 评级系统：为每次合作添加评分和备注
 * 4. 对比分析：对比不同达人的合作表现（ROI、CPM趋势）
 * 5. 报表导出：生成PDF格式的合作历史报告
 */

export class HistoryModal {
    constructor(app) {
        this.app = app;
        this.elements = {};
    }

    init() {
        this.cacheElements();
        this.bindEvents();
    }

    cacheElements() {
        this.elements = {
            modal: document.getElementById('history-modal'),
            talentName: document.getElementById('history-talent-name'),
            tableContainer: document.getElementById('history-table-container'),
            closeBtn: document.getElementById('close-history-modal-btn')
        };
    }

    bindEvents() {
        this.elements.closeBtn?.addEventListener('click', () => this.close());
        this.elements.modal?.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) this.close();
        });
    }

    async open(talentId) {
        const talent = this.app.currentTalentData.find(t => t.id === talentId);
        if (!talent || !this.elements.talentName || !this.elements.tableContainer) return;

        this.elements.talentName.textContent = talent.nickname;
        this.elements.tableContainer.innerHTML = '<p class="text-center text-gray-500 py-8">正在加载合作历史...</p>';

        if (this.elements.modal) {
            this.elements.modal.classList.remove('hidden');
        }

        // 获取该达人的合作历史
        const historyData = (this.app.allCollaborations.get(talentId) || []).map(collab => {
            const project = this.app.allProjects.find(p => p.id === collab.projectId);
            return { ...collab, projectName: project ? project.name : '未知项目' };
        }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        this.renderCooperationHistory(historyData);
    }

    close() {
        if (this.elements.modal) {
            this.elements.modal.classList.add('hidden');
        }
    }

    renderCooperationHistory(historyData) {
        if (!this.elements.tableContainer) return;

        if (historyData.length === 0) {
            this.elements.tableContainer.innerHTML = '<p class="text-center text-gray-500 py-8">暂无合作历史记录。</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'min-w-full divide-y divide-gray-200';
        table.innerHTML = '<thead class="bg-gray-50"><tr><th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">项目名称</th><th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">合作状态</th><th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">星图一口价</th><th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">返点率</th><th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">视频链接</th></tr></thead><tbody class="bg-white divide-y divide-gray-200">' + historyData.map(item => {
            const projectLink = '<a href="order_list.html?projectId=' + item.projectId + '" target="_blank">' + item.projectName + '</a>';
            const status = item.status || 'N/A';
            const amount = '¥ ' + Number(item.amount || 0).toLocaleString();
            const rebate = item.rebate === null || item.rebate === undefined ? 'N/A' : item.rebate + '%';
            const videoLink = item.videoId ? '<a href="https://www.douyin.com/video/' + item.videoId + '" target="_blank">查看视频</a>' : 'N/A';

            return '<tr class="bg-white"><td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:underline">' + projectLink + '</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">' + status + '</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">' + amount + '</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">' + rebate + '</td><td class="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:underline">' + videoLink + '</td></tr>';
        }).join('') + '</tbody>';

        this.elements.tableContainer.innerHTML = '';
        this.elements.tableContainer.appendChild(table);
    }
}
