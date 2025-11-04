/**
 * @file talent_selection/modal-batch-import.js
 * @description 批量录入弹窗模块 - V2.9 使用类型+时间选择器
 */

import { generateRebateOptions } from './utils.js';

export default class BatchImportModal {
    constructor(options) {
        this.executionMonthInput = options.executionMonthInput;
        this.targetProjectSelect = options.targetProjectSelect;
        this.apiRequest = options.apiRequest;
        this.showSuccess = options.showSuccess;
        this.showAlert = options.showAlert;

        // DOM Elements
        this.batchImportModal = document.getElementById('batch-import-modal');
        this.batchImportTableBody = document.getElementById('batch-import-table-body');
        this.closeImportModalBtn = document.getElementById('close-import-modal-btn');
        this.confirmImportBtn = document.getElementById('confirm-import-btn');

        // State
        this.richTalentData = [];
        this.selectedCollaborations = [];

        // Bind methods
        this.open = this.open.bind(this);
        this.close = this.close.bind(this);
        this.handleConfirmImport = this.handleConfirmImport.bind(this);
        this.handleBatchModalChange = this.handleBatchModalChange.bind(this);
    }

    setupEventListeners() {
        if (this.closeImportModalBtn) {
            this.closeImportModalBtn.addEventListener('click', this.close);
        }

        if (this.confirmImportBtn) {
            this.confirmImportBtn.addEventListener('click', this.handleConfirmImport);
        }

        if (this.batchImportTableBody) {
            this.batchImportTableBody.addEventListener('change', this.handleBatchModalChange);
        }
    }

    init(richTalentData) {
        this.richTalentData = richTalentData;
        this.setupEventListeners();
    }

    open(selectedCollaborations) {
        this.selectedCollaborations = selectedCollaborations;

        const projectId = this.targetProjectSelect.value;
        const execMonth = this.executionMonthInput.value;

        if (!projectId || !execMonth) {
            this.showAlert('请先选择目标项目和预估执行月份。');
            return;
        }

        const [defaultYear, defaultMonth] = execMonth.split('-').map(Number);

        this.batchImportTableBody.innerHTML = '';

        this.selectedCollaborations.forEach((collab, index) => {
            const row = document.createElement('tr');
            row.dataset.tempId = collab._tempId;
            row.dataset.talentId = collab.talentId || collab.talent?.id;

            const talent = collab.talent || collab;
            const rebateOptions = generateRebateOptions(talent);

            // 生成年月选项
            const availableTimes = this.getAvailablePriceTimes(talent);
            const timeOptions = availableTimes.length > 0
                ? availableTimes.map(t => `<option value="${t.year}-${t.month}" ${t.year === defaultYear && t.month === defaultMonth ? 'selected' : ''}>${t.year}年${t.month}月</option>`).join('')
                : '<option value="">无可用时间</option>';

            row.innerHTML = `
                <td class="p-2">${talent.nickname} (合作 ${index + 1})</td>
                <td class="p-2"><input type="date" class="block w-full text-sm rounded-md border-gray-300 shadow-sm planned-release-date-input"></td>
                <td class="p-2">
                    <select class="block w-full text-sm rounded-md border-gray-300 shadow-sm price-type-select">
                        <option value="60s_plus">60s+视频</option>
                        <option value="20_to_60s">20-60s视频</option>
                        <option value="1_to_20s">1-20s视频</option>
                    </select>
                </td>
                <td class="p-2">
                    <select class="block w-full text-sm rounded-md border-gray-300 shadow-sm price-time-select">
                        ${timeOptions}
                    </select>
                </td>
                <td class="p-2">
                    <div class="price-display-container">
                        <input type="text" class="block w-full text-sm rounded-md border-gray-300 shadow-sm bg-gray-50 price-display" readonly value="请选择类型和时间">
                        <input type="hidden" class="price-data" value="">
                    </div>
                </td>
                <td class="p-2"><select class="block w-full text-sm rounded-md border-gray-300 shadow-sm rebate-select">${rebateOptions}</select></td>
            `;

            this.batchImportTableBody.appendChild(row);

            // 初始化价格显示
            this.updatePriceDisplay(row);
        });

        this.batchImportModal.classList.remove('hidden');
    }

    close() {
        if (this.batchImportModal) {
            this.batchImportModal.classList.add('hidden');
        }
    }

    /**
     * [V2.9 新增] 获取达人的所有可用价格时间（去重）
     */
    getAvailablePriceTimes(talent) {
        if (!talent.prices || talent.prices.length === 0) return [];

        const timesSet = new Set();
        talent.prices.forEach(p => {
            timesSet.add(`${p.year}-${p.month}`);
        });

        return Array.from(timesSet)
            .map(timeStr => {
                const [year, month] = timeStr.split('-').map(Number);
                return { year, month };
            })
            .sort((a, b) => (b.year - a.year) || (b.month - a.month));
    }

    /**
     * [V2.9 新增] 处理批量录入弹窗中的选择变化
     */
    handleBatchModalChange(e) {
        if (e.target.classList.contains('price-type-select') || e.target.classList.contains('price-time-select')) {
            const row = e.target.closest('tr');
            this.updatePriceDisplay(row);
        }
    }

    /**
     * [V2.9 新增] 根据类型+时间选择更新价格显示
     * [V2.9.4 修复] 保持 price-display 类名统一，确保 querySelector 可靠性
     */
    updatePriceDisplay(row) {
        const talentId = row.dataset.talentId;
        const talent = this.richTalentData.find(t => t.talentId === talentId || t.id === talentId);

        if (!talent) return;

        const typeSelect = row.querySelector('.price-type-select');
        const timeSelect = row.querySelector('.price-time-select');
        const priceDisplay = row.querySelector('.price-display');
        const priceData = row.querySelector('.price-data');

        if (!priceDisplay) return;

        const selectedType = typeSelect.value;
        const selectedTime = timeSelect.value;

        if (!selectedTime) {
            priceDisplay.value = '无可用价格';
            priceDisplay.className = 'price-display block w-full text-sm rounded-md border-gray-300 shadow-sm bg-gray-50 text-gray-400';
            priceData.value = '';
            return;
        }

        const [year, month] = selectedTime.split('-').map(Number);

        // 查找匹配的价格
        const matchingPrices = talent.prices.filter(p =>
            p.year === year && p.month === month && p.type === selectedType
        );

        if (matchingPrices.length === 0) {
            priceDisplay.value = '没有此档位价格';
            priceDisplay.className = 'price-display block w-full text-sm rounded-md border-red-300 shadow-sm bg-red-50 text-red-600';
            priceData.value = '';
        } else {
            const confirmedPrice = matchingPrices.find(p => p.status !== 'provisional');
            const selectedPrice = confirmedPrice || matchingPrices[0];
            const statusLabel = selectedPrice.status === 'provisional' ? '(暂定价)' : '(已确认)';

            priceDisplay.value = `¥ ${selectedPrice.price.toLocaleString()} ${statusLabel}`;
            priceDisplay.className = 'price-display block w-full text-sm rounded-md border-gray-300 shadow-sm bg-gray-50 text-gray-800 font-medium';
            priceData.value = JSON.stringify(selectedPrice);
        }
    }

    /**
     * [V2.9 修改] 更新handleConfirmImport以适配新的批量录入UI
     */
    async handleConfirmImport() {
        const projectId = this.targetProjectSelect.value;
        const rows = this.batchImportTableBody.querySelectorAll('tr');
        const orderType = document.querySelector('input[name="batch-order-type"]:checked')?.value || '广告';

        let payloads = [];
        let allValid = true;
        let errorMessages = [];

        for (const row of rows) {
            const tempId = row.dataset.tempId;
            const collab = this.selectedCollaborations.find(c => c._tempId === tempId);
            if (!collab) continue;

            const priceData = row.querySelector('.price-data');
            const rebateSelect = row.querySelector('.rebate-select');
            const dateInput = row.querySelector('.planned-release-date-input');

            if (!priceData.value || !rebateSelect.value) {
                allValid = false;
                const talent = collab.talent || collab;
                errorMessages.push(`${talent.nickname}: 请选择有效的价格和返点率`);
                continue;
            }

            const priceObj = JSON.parse(priceData.value);

            // [V2.9 新增] 价格类型标签映射
            const priceTypeLabels = {
                '60s_plus': '60s+视频',
                '20_to_60s': '20-60s视频',
                '1_to_20s': '1-20s视频'
            };
            const typeLabel = priceTypeLabels[priceObj.type] || priceObj.type || '未知类型';

            const talent = collab.talent || collab;
            payloads.push({
                projectId,
                talentId: talent.talentId || talent.id,
                amount: priceObj.price,
                priceInfo: `${priceObj.year}年${priceObj.month}月 - ${typeLabel}`,
                rebate: rebateSelect.value,
                plannedReleaseDate: dateInput.value || null,
                status: '待提报工作台',
                orderType: orderType
            });
        }

        if (!allValid) {
            this.showAlert(errorMessages.join('<br>') || '请为所有合作选择有效的价格和返点率。');
            return;
        }

        if (payloads.length > 0) {
            try {
                const promises = payloads.map(payload => this.apiRequest('/collaborations', 'POST', payload));
                await Promise.all(promises);

                this.close();
                this.showSuccess(
                    "添加成功",
                    `已成功将 ${payloads.length} 次合作添加至项目。`,
                    projectId
                );

                // 触发导入成功事件
                document.dispatchEvent(new CustomEvent('importSuccess', {
                    detail: { projectId }
                }));

            } catch (error) {
                console.error("Failed to add collaborators:", error);
                this.showAlert(`添加合作时发生错误: ${error.message}`);
            }
        }
    }

    updateRichTalentData(richTalentData) {
        this.richTalentData = richTalentData;
    }
}
