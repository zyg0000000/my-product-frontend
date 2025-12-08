/**
 * @file order_list/tab-financial.js
 * @description 财务信息 Tab 模块
 * @version 1.0.0
 *
 * 功能:
 * - 财务列表渲染 (主行 + 详情行)
 * - 批量操作 (下单日期/回款日期)
 * - 全选/单选 Checkbox
 * - 展开/收起财务详情
 * - 下单日期/回款日期编辑
 * - 下单方式编辑
 * - 收支调整项管理 (增删改)
 * - 分页控制
 */

import { AppCore } from '../common/app-core.js';

const { API, Modal, Format, Pagination, Utils } = AppCore;

export class FinancialTab {
    constructor(projectId, project, adjustmentTypes) {
        this.projectId = projectId;
        this.project = project;
        this.adjustmentTypes = adjustmentTypes;

        // 数据
        this.collaborators = [];
        this.totalItems = 0;
        this.currentPage = 1;
        this.itemsPerPage = 10;

        // 状态
        this.openDetails = new Set();           // 展开的详情行
        this.pendingDateChanges = {};            // 待保存的日期修改
        this.editingOrderTypeId = null;         // 正在编辑下单方式的行ID

        // DOM 元素
        this.elements = {
            listBody: document.getElementById('financial-list-body'),
            noDataMessage: document.getElementById('no-financial-message'),
            paginationControls: document.getElementById('pagination-controls-financial'),

            // 批量操作相关
            batchActionSelect: document.getElementById('batch-action-select'),
            batchDateInput: document.getElementById('batch-date-input'),
            executeBatchBtn: document.getElementById('execute-batch-btn'),
            selectAllCheckbox: document.getElementById('select-all-on-page-financial'),

            // 调整项相关
            adjustmentsListBody: document.getElementById('adjustments-list-body'),
            addAdjustmentBtn: document.getElementById('add-adjustment-btn'),
            adjustmentModal: document.getElementById('adjustment-modal'),
            closeAdjustmentModalBtn: document.getElementById('close-adjustment-modal-btn'),
            adjustmentForm: document.getElementById('adjustment-form'),
            adjustmentModalTitle: document.getElementById('adjustment-modal-title'),
            editingAdjustmentIdInput: document.getElementById('editing-adjustment-id'),
            adjustmentTypeSelect: document.getElementById('adjustment-type'),

            // Excel 导入相关
            excelImportBtn: document.getElementById('excel-import-btn'),
            excelFileInput: document.getElementById('excel-file-input')
        };

        // 绑定事件处理器
        this.handleClick = this.handleClick.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.handleBatchAction = this.handleBatchAction.bind(this);
        this.handleAdjustmentSubmit = this.handleAdjustmentSubmit.bind(this);
        this.handleExcelImport = this.handleExcelImport.bind(this);
    }

    /**
     * 绑定全局事件（只执行一次，不依赖数据）
     */
    bindGlobalEvents() {
        // 防止重复绑定
        if (this._globalEventsBound) return;
        this._globalEventsBound = true;

        const { excelImportBtn, excelFileInput, batchActionSelect, batchDateInput, executeBatchBtn, addAdjustmentBtn, closeAdjustmentModalBtn, adjustmentForm, selectAllCheckbox } = this.elements;

        // Excel 导入事件
        if (excelImportBtn && excelFileInput) {
            excelImportBtn.addEventListener('click', () => excelFileInput.click());
            excelFileInput.addEventListener('change', this.handleExcelImport);
        }

        // 批量操作下拉框改变事件
        if (batchActionSelect) {
            batchActionSelect.addEventListener('change', () => {
                if (batchDateInput) {
                    batchDateInput.classList.toggle('hidden', !batchActionSelect.value);
                }
                if (executeBatchBtn) {
                    executeBatchBtn.disabled = !batchActionSelect.value;
                }
            });
        }

        if (executeBatchBtn) {
            executeBatchBtn.addEventListener('click', this.handleBatchAction);
        }

        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', () => this.handleSelectAll());
        }

        if (addAdjustmentBtn) {
            addAdjustmentBtn.addEventListener('click', () => this.openAdjustmentModal());
        }

        if (closeAdjustmentModalBtn) {
            closeAdjustmentModalBtn.addEventListener('click', () => this.closeAdjustmentModal());
        }

        if (adjustmentForm) {
            adjustmentForm.addEventListener('submit', this.handleAdjustmentSubmit);
        }
    }

    /**
     * 加载数据
     */
    async load() {
        // 首次加载时绑定全局事件
        this.bindGlobalEvents();

        this.showLoading();

        try {
            // 财务Tab显示"客户已定档"和"视频已发布"状态的达人
            const requiredStatuses = ['客户已定档', '视频已发布'];

            const params = {
                projectId: this.projectId,
                page: this.currentPage,
                limit: this.itemsPerPage,
                sortBy: 'createdAt',
                order: 'desc',
                statuses: requiredStatuses.join(',')
            };

            const response = await API.request('/collaborations', 'GET', params);

            this.collaborators = response.data || [];
            this.totalItems = response.total || 0;

            this.render();
        } catch (error) {
            console.error('加载财务信息失败:', error);
            this.showError();
        }
    }

    /**
     * 显示加载状态
     */
    showLoading() {
        const { listBody } = this.elements;
        if (listBody) {
            listBody.innerHTML = '<tr><td colspan="10" class="text-center py-12 text-gray-500">正在加载...</td></tr>';
        }
    }

    /**
     * 显示错误状态
     */
    showError() {
        const { listBody } = this.elements;
        if (listBody) {
            listBody.innerHTML = '<tr><td colspan="10" class="text-center py-12 text-red-500">加载失败，请刷新重试</td></tr>';
        }
    }

    /**
     * 渲染列表
     */
    render() {
        const { listBody, noDataMessage, paginationControls } = this.elements;

        if (!listBody || !noDataMessage) return;

        const isReadOnly = this.project.status === '已终结';

        // 无数据时显示提示
        if (this.collaborators.length === 0) {
            noDataMessage.classList.remove('hidden');
            listBody.closest('table').classList.add('hidden');
            if (paginationControls) paginationControls.innerHTML = '';
            this.renderAdjustments(isReadOnly);
            return;
        }

        // 有数据时渲染列表
        noDataMessage.classList.add('hidden');
        listBody.closest('table').classList.remove('hidden');

        const fragment = document.createDocumentFragment();

        this.collaborators.forEach(collab => {
            const { mainRow, detailRow } = this.renderRow(collab, isReadOnly);
            fragment.appendChild(mainRow);
            fragment.appendChild(detailRow);
        });

        listBody.innerHTML = '';
        listBody.appendChild(fragment);

        // 渲染分页
        this.renderPagination();

        // 渲染调整项
        this.renderAdjustments(isReadOnly);

        // 绑定事件
        this.bindEvents();
    }

    /**
     * 渲染单行数据
     */
    renderRow(collab, isReadOnly) {
        const financials = collab.metrics;

        // 计算返点状态
        const { rebateStatus, rebateStatusColor } = this.calculateRebateStatus(collab, financials);

        // 主行
        const mainRow = document.createElement('tr');
        mainRow.className = 'bg-white border-b hover:bg-gray-50';
        mainRow.dataset.id = collab.id;

        mainRow.innerHTML = `
            <td class="px-4 py-4 w-12 text-center">
                <input type="checkbox" class="collaborator-checkbox-financial rounded text-blue-600" data-id="${collab.id}" ${isReadOnly ? 'disabled' : ''}>
            </td>
            <td class="px-6 py-4 font-medium text-gray-900">${collab.talentInfo?.nickname || '(已删除)'}</td>
            <td class="px-6 py-4">${collab.plannedReleaseDate || '<span class="text-gray-400">待定</span>'}</td>
            <td class="px-6 py-4">${collab.talentSource || '未指定'}</td>
            <td class="px-6 py-4">¥ ${Number(collab.amount || 0).toLocaleString()}</td>
            <td class="px-6 py-4">¥ ${(financials?.income ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            <td class="px-6 py-4">¥ ${(financials?.expense ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            <td class="px-6 py-4 font-semibold ${(financials?.grossProfit ?? 0) < 0 ? 'text-red-600' : 'text-blue-600'}">¥ ${(financials?.grossProfit ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            <td class="px-6 py-4">
                <span class="text-xs font-semibold px-2.5 py-1 rounded-full ${rebateStatusColor}">${rebateStatus}</span>
            </td>
            <td class="px-6 py-4 text-center">
                <button data-id="${collab.id}" class="toggle-details-btn p-1 rounded-md text-gray-500 hover:bg-gray-100">
                    <svg class="w-5 h-5 rotate-icon ${this.openDetails.has(collab.id) ? 'rotated' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>
            </td>
        `;

        // 详情行
        const detailRow = this.renderDetailRow(collab, financials, isReadOnly);

        return { mainRow, detailRow };
    }

    /**
     * 计算返点状态
     */
    calculateRebateStatus(collab, financials) {
        const talentSource = collab.talentSource || '未指定';
        let rebateStatus, rebateStatusColor;

        if (talentSource === '机构达人') {
            rebateStatus = '统一处理';
            rebateStatusColor = 'bg-indigo-100 text-indigo-800';
        } else if (collab.status !== '视频已发布') {
            rebateStatus = '视频未发布';
            rebateStatusColor = 'bg-blue-100 text-blue-800';
        } else {
            if (collab.actualRebate != null) {
                const diff = Math.abs(collab.actualRebate - (financials?.rebateReceivable ?? 0));
                rebateStatus = diff > 0.01 ? '有差异' : '已回收';
            } else {
                rebateStatus = '待回收';
            }
            rebateStatusColor = {
                '已回收': 'bg-green-100 text-green-800',
                '有差异': 'bg-red-100 text-red-800',
                '待回收': 'bg-yellow-100 text-yellow-800'
            }[rebateStatus];
        }

        return { rebateStatus, rebateStatusColor };
    }

    /**
     * 渲染详情行
     */
    renderDetailRow(collab, financials, isReadOnly) {
        const detailRow = document.createElement('tr');
        detailRow.className = `collapsible-row bg-gray-50/70 ${this.openDetails.has(collab.id) ? 'expanded' : ''}`;
        detailRow.dataset.id = collab.id;

        const isEditingOrderType = this.editingOrderTypeId === collab.id;
        const orderTypeHtml = this.renderOrderTypeCell(collab, isEditingOrderType, isReadOnly);

        const hasPending = this.pendingDateChanges[collab.id];
        const dateInputStyles = "rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-sm w-36 text-right disabled:bg-gray-100 disabled:cursor-not-allowed";

        // 项目折扣显示
        const discountValue = this.project.discount || '1';
        const discountDisplayName = `${(Number(discountValue) * 100).toFixed(0)}%`;

        const talentSource = collab.talentSource || '未指定';

        detailRow.innerHTML = `
            <td colspan="10" class="p-4 bg-gray-50 border-t">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                    <!-- 左列：基础信息 -->
                    <div class="space-y-2">
                        <h4 class="font-semibold text-gray-800 mb-2 border-b pb-1">基础信息</h4>
                        <div class="flex justify-between items-center">
                            <span>星图一口价:</span>
                            <span class="font-medium">¥ ${Number(collab.amount || 0).toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span>项目折扣:</span>
                            <span class="font-medium">${discountDisplayName}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span>返点率:</span>
                            <span class="font-medium">${collab.rebate ?? 'N/A'}%</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span>下单方式:</span>
                            <div class="flex items-center">${orderTypeHtml}</div>
                        </div>
                        <div class="flex justify-between items-center">
                            <label class="font-medium">下单日期:</label>
                            <input type="date" class="date-input ${dateInputStyles}" data-type="orderDate" data-id="${collab.id}" value="${hasPending?.orderDate ?? collab.orderDate ?? ''}" ${isReadOnly ? 'disabled' : ''}>
                        </div>
                        <div class="flex justify-between items-center">
                            <label class="font-medium">回款日期:</label>
                            <input type="date" class="date-input ${dateInputStyles}" data-type="paymentDate" data-id="${collab.id}" value="${hasPending?.paymentDate ?? collab.paymentDate ?? ''}" ${isReadOnly ? 'disabled' : ''}>
                        </div>
                    </div>

                    <!-- 右列：财务明细 -->
                    <div class="space-y-2">
                        <h4 class="font-semibold text-gray-800 mb-2 border-b pb-1">财务明细</h4>
                        <div class="flex justify-between items-center">
                            <span>收入 (执行价格):</span>
                            <span class="font-medium text-green-600">¥ ${(financials?.income ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span>支出 (下单金额):</span>
                            <span class="font-medium text-red-600">¥ ${(financials?.expense ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span>应收/实收返点:</span>
                            <span>¥ ${(financials?.rebateReceivable ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} / ${collab.actualRebate != null ? '¥ ' + Number(collab.actualRebate).toLocaleString(undefined, { minimumFractionDigits: 2 }) : 'N/A'}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span>资金占用费用:</span>
                            <span class="font-medium text-red-600">¥ ${(financials?.fundsOccupationCost ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div class="flex justify-between items-center border-t pt-2 mt-1">
                            <strong>下单毛利:</strong>
                            <strong class="${(financials?.grossProfit ?? 0) < 0 ? 'text-red-600' : 'text-blue-600'}">¥ ${(financials?.grossProfit ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                        </div>
                        <div class="flex justify-between items-center">
                            <strong>下单毛利率:</strong>
                            <strong class="${(financials?.grossProfitMargin ?? 0) < 0 ? 'text-red-600' : 'text-green-600'}">${(financials?.grossProfitMargin ?? 0).toFixed(2)}%</strong>
                        </div>
                        ${collab.status === '视频已发布' && talentSource !== '机构达人' ? `
                        <div class="text-right mt-4">
                            <a href="rebate_management.html?from=order_list&projectId=${this.projectId}" class="text-blue-600 hover:underline">前往返点管理 &rarr;</a>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <!-- 保存按钮 -->
                <div class="mt-4 text-right ${hasPending || isEditingOrderType ? '' : 'hidden'}">
                    <span class="text-sm text-yellow-700 mr-4">有未保存的更改</span>
                    <button class="save-dates-btn px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700" data-id="${collab.id}">保存更改</button>
                </div>
            </td>
        `;

        return detailRow;
    }

    /**
     * 渲染下单方式单元格
     */
    renderOrderTypeCell(collab, isEditing, isReadOnly) {
        if (isEditing && !isReadOnly) {
            return `
                <select class="order-type-select table-select w-full">
                    <option value="original" ${collab.orderType === 'original' ? 'selected' : ''}>原价下单</option>
                    <option value="modified" ${collab.orderType === 'modified' ? 'selected' : ''}>改价下单</option>
                </select>
            `;
        } else {
            return `
                <strong>${collab.orderType === 'original' ? '原价下单' : '改价下单'}</strong>
                <button class="edit-ordertype-btn p-1 rounded-md text-gray-500 hover:bg-gray-200 ml-2" data-id="${collab.id}" title="修改下单方式" ${isReadOnly ? 'disabled' : ''}>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"></path>
                    </svg>
                </button>
            `;
        }
    }

    /**
     * 渲染调整项列表
     */
    renderAdjustments(isReadOnly) {
        const { adjustmentsListBody, addAdjustmentBtn } = this.elements;
        if (!adjustmentsListBody) return;

        adjustmentsListBody.innerHTML = '';

        if (addAdjustmentBtn) {
            addAdjustmentBtn.style.display = isReadOnly ? 'none' : 'flex';
        }

        (this.project.adjustments || []).forEach(adj => {
            const amount = Number(adj.amount) || 0;
            const row = document.createElement('tr');
            row.className = 'bg-white border-b';
            row.innerHTML = `
                <td class="px-6 py-4">${adj.date || ''}</td>
                <td class="px-6 py-4">${adj.type || '未分类'}</td>
                <td class="px-6 py-4">${adj.description || ''}</td>
                <td class="px-6 py-4 font-medium ${amount > 0 ? 'text-green-600' : 'text-red-600'}">${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td class="px-6 py-4 text-center">
                    <button data-id="${adj.id}" class="edit-adjustment-btn font-medium text-blue-600 hover:underline mr-2" ${isReadOnly ? 'disabled' : ''}>编辑</button>
                    <button data-id="${adj.id}" class="delete-adjustment-btn font-medium text-red-600 hover:underline" ${isReadOnly ? 'disabled' : ''}>删除</button>
                </td>
            `;
            adjustmentsListBody.appendChild(row);
        });
    }

    /**
     * 渲染分页
     */
    renderPagination() {
        const { paginationControls } = this.elements;
        if (!paginationControls) return;

        Pagination.render(
            paginationControls,
            this.currentPage,
            this.totalItems,
            this.itemsPerPage,
            (page) => {
                this.currentPage = page;
                this.load();
            }
        );
    }

    /**
     * 绑定表格事件（每次渲染后调用，使用事件委托）
     */
    bindEvents() {
        const { listBody } = this.elements;

        // 使用事件委托，只需绑定一次
        if (listBody && !listBody._bindEventsAttached) {
            listBody.addEventListener('click', this.handleClick);
            listBody.addEventListener('change', this.handleChange);
            listBody._bindEventsAttached = true;
        }
    }

    /**
     * 处理点击事件
     */
    handleClick(e) {
        const target = e.target.closest('button');
        if (!target) return;

        const collabId = target.dataset.id;

        if (target.classList.contains('toggle-details-btn')) {
            this.handleToggleDetails(collabId);
        } else if (target.classList.contains('edit-ordertype-btn')) {
            this.handleEditOrderType(collabId);
        } else if (target.classList.contains('save-dates-btn')) {
            this.handleSaveDates(collabId);
        } else if (target.classList.contains('edit-adjustment-btn')) {
            this.openAdjustmentModal(collabId);
        } else if (target.classList.contains('delete-adjustment-btn')) {
            this.handleDeleteAdjustment(collabId);
        }
    }

    /**
     * 处理change事件
     */
    handleChange(e) {
        const target = e.target;

        if (target.classList.contains('date-input')) {
            const collabId = target.dataset.id;
            const dateType = target.dataset.type;
            const newValue = target.value;

            if (!this.pendingDateChanges[collabId]) {
                this.pendingDateChanges[collabId] = {};
            }
            this.pendingDateChanges[collabId][dateType] = newValue;

            // 显示保存按钮
            this.render();
        }
    }

    /**
     * 展开/收起详情
     */
    handleToggleDetails(collabId) {
        if (this.openDetails.has(collabId)) {
            this.openDetails.delete(collabId);
        } else {
            this.openDetails.add(collabId);
        }

        // 切换显示
        const rows = this.elements.listBody.querySelectorAll(`tr[data-id="${collabId}"]`);
        const mainRow = rows[0];
        const detailRow = rows[1];

        if (mainRow && detailRow) {
            const icon = mainRow.querySelector('.rotate-icon');

            if (this.openDetails.has(collabId)) {
                detailRow.classList.add('expanded');
                if (icon) icon.classList.add('rotated');
            } else {
                detailRow.classList.remove('expanded');
                if (icon) icon.classList.remove('rotated');
            }
        }
    }

    /**
     * 编辑下单方式
     */
    handleEditOrderType(collabId) {
        this.editingOrderTypeId = collabId;
        this.render();
    }

    /**
     * 保存日期/下单方式更改
     */
    async handleSaveDates(collabId) {
        const payload = { id: collabId };

        // 添加日期更改
        if (this.pendingDateChanges[collabId]) {
            Object.assign(payload, this.pendingDateChanges[collabId]);
        }

        // 添加下单方式更改
        if (this.editingOrderTypeId === collabId) {
            const detailRow = this.elements.listBody.querySelector(`.collapsible-row[data-id="${collabId}"]`);
            const orderTypeSelect = detailRow?.querySelector('.order-type-select');
            if (orderTypeSelect) {
                payload.orderType = orderTypeSelect.value;
            }
        }

        const loading = Modal.showLoading('正在保存...');

        try {
            await API.request('/update-collaboration', 'PUT', payload);

            delete this.pendingDateChanges[collabId];
            this.editingOrderTypeId = null;

            loading.close();
            Modal.showAlert('保存成功！', '成功', () => {
                this.load();
                // 触发项目数据刷新
                document.dispatchEvent(new CustomEvent('refreshProject'));
            });
        } catch (error) {
            loading.close();
        }
    }

    /**
     * 全选/取消全选
     */
    handleSelectAll() {
        const { selectAllCheckbox, listBody } = this.elements;
        if (!selectAllCheckbox || !listBody) return;

        const isChecked = selectAllCheckbox.checked;
        const checkboxes = listBody.querySelectorAll('.collaborator-checkbox-financial');

        checkboxes.forEach(cb => {
            cb.checked = isChecked;
        });
    }

    /**
     * 批量操作
     */
    async handleBatchAction() {
        if (this.project.status === '已终结') return;

        const { batchActionSelect, batchDateInput, listBody } = this.elements;

        const selectedAction = batchActionSelect.value;
        const batchDate = batchDateInput.value;
        const selectedIds = Array.from(listBody.querySelectorAll('.collaborator-checkbox-financial:checked'))
            .map(cb => cb.dataset.id);

        if (!selectedAction || !batchDate || selectedIds.length === 0) {
            Modal.showAlert('请选择操作、日期并至少勾选一位达人。');
            return;
        }

        Modal.showConfirm(`确定要为 ${selectedIds.length} 位达人批量录入日期吗？`, '批量操作确认', async (confirmed) => {
            if (!confirmed) return;

            const loading = Modal.showLoading(`正在为 ${selectedIds.length} 位达人批量更新...`);

            try {
                const updatePromises = selectedIds.map(id => {
                    const payload = {
                        id: id,
                        [selectedAction === 'setOrderDate' ? 'orderDate' : 'paymentDate']: batchDate
                    };
                    return API.request('/update-collaboration', 'PUT', payload);
                });

                await Promise.all(updatePromises);
                loading.close();
                Modal.showAlert('批量更新成功！', '成功', () => {
                    this.load();
                    // 触发项目数据刷新
                    document.dispatchEvent(new CustomEvent('refreshProject'));
                });
            } catch (error) {
                loading.close();
            }
        });
    }

    /**
     * 打开调整项Modal
     */
    openAdjustmentModal(adjId = null) {
        const { adjustmentForm, adjustmentTypeSelect, editingAdjustmentIdInput, adjustmentModalTitle, adjustmentModal } = this.elements;

        if (!adjustmentForm) return;

        adjustmentForm.reset();
        adjustmentTypeSelect.innerHTML = (this.adjustmentTypes || [])
            .map(type => `<option value="${type}">${type}</option>`)
            .join('');
        editingAdjustmentIdInput.value = '';

        if (adjId) {
            const adjToEdit = this.project.adjustments.find(a => a.id === adjId);
            if (adjToEdit) {
                adjustmentModalTitle.textContent = '编辑调整项';
                editingAdjustmentIdInput.value = adjId;
                document.getElementById('adjustment-date').value = adjToEdit.date;
                adjustmentTypeSelect.value = adjToEdit.type;
                document.getElementById('adjustment-desc').value = adjToEdit.description;
                document.getElementById('adjustment-amount').value = adjToEdit.amount;
            }
        } else {
            adjustmentModalTitle.textContent = '添加调整项';
        }

        adjustmentModal.classList.remove('hidden');
    }

    /**
     * 关闭调整项Modal
     */
    closeAdjustmentModal() {
        const { adjustmentModal } = this.elements;
        if (adjustmentModal) {
            adjustmentModal.classList.add('hidden');
        }
    }

    /**
     * 提交调整项
     */
    async handleAdjustmentSubmit(e) {
        e.preventDefault();

        if (this.project.status === '已终结') return;

        const date = document.getElementById('adjustment-date').value;
        const type = this.elements.adjustmentTypeSelect.value;
        const desc = document.getElementById('adjustment-desc').value.trim();
        const amount = parseFloat(document.getElementById('adjustment-amount').value);
        const editingId = this.elements.editingAdjustmentIdInput.value;

        if (!date || !type || !desc || isNaN(amount)) {
            Modal.showAlert('请填写所有必填项。');
            return;
        }

        if (!this.project.adjustments) {
            this.project.adjustments = [];
        }

        if (editingId) {
            // 编辑现有调整项
            const adjIndex = this.project.adjustments.findIndex(a => a.id === editingId);
            if (adjIndex > -1) {
                this.project.adjustments[adjIndex] = {
                    ...this.project.adjustments[adjIndex],
                    date,
                    type,
                    description: desc,
                    amount
                };
            }
        } else {
            // 添加新调整项
            this.project.adjustments.push({
                id: `adj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                date,
                type,
                description: desc,
                amount
            });
        }

        const loading = Modal.showLoading('正在保存调整项...');

        try {
            await API.request('/update-project', 'PUT', {
                id: this.projectId,
                adjustments: this.project.adjustments
            });

            loading.close();
            this.closeAdjustmentModal();

            // 触发项目数据刷新
            document.dispatchEvent(new CustomEvent('refreshProject'));

            Modal.showAlert('调整项保存成功！', '成功');
        } catch (error) {
            loading.close();
        }
    }

    /**
     * 删除调整项
     */
    async handleDeleteAdjustment(adjId) {
        Modal.showConfirm('确定要删除此条调整记录吗？', '确认删除', async (confirmed) => {
            if (!confirmed) return;

            const loading = Modal.showLoading('正在删除...');

            try {
                const updatedAdjustments = this.project.adjustments.filter(adj => adj.id !== adjId);

                await API.request('/update-project', 'PUT', {
                    id: this.projectId,
                    adjustments: updatedAdjustments
                });

                loading.close();

                // 触发项目数据刷新
                document.dispatchEvent(new CustomEvent('refreshProject'));

                Modal.showAlert('删除成功！', '成功');
            } catch (error) {
                loading.close();
            }
        });
    }

    // ==================== Excel 导入功能 ====================

    /**
     * 处理 Excel 文件导入
     */
    async handleExcelImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        // 重置 input 以便可以重复选择同一文件
        event.target.value = '';

        if (this.project.status === '已终结') {
            Modal.showAlert('项目已终结，无法导入数据。');
            return;
        }

        const loading = Modal.showLoading('正在解析 Excel 文件...');

        try {
            // 解析 Excel 文件
            const excelData = await this.parseExcelFile(file);

            if (excelData.length === 0) {
                loading.close();
                Modal.showAlert('Excel 文件中没有有效数据。');
                return;
            }

            // 加载所有合作记录用于匹配
            const allCollabs = await this.loadAllCollaborationsForMatching();

            // 匹配数据
            const matchResult = this.matchCollaborations(excelData, allCollabs);

            loading.close();

            // 显示导入预览弹窗
            this.showImportPreview(matchResult);

        } catch (error) {
            loading.close();
            console.error('Excel 导入失败:', error);
            Modal.showAlert('Excel 文件解析失败，请检查文件格式。');
        }
    }

    /**
     * 解析 Excel 文件
     * 注意：Excel 可能有两行表头（第1行是分组标题，第2行是列名），需要智能检测
     */
    async parseExcelFile(file) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        // 先尝试默认方式解析（第1行为表头）
        let jsonData = XLSX.utils.sheet_to_json(sheet);

        // 检查是否能找到达人名称列
        const hasValidHeader = jsonData.length > 0 && jsonData.some(row =>
            row['发布达人名称（不可修改）'] || row['发布达人名称'] || row['达人昵称'] || row['达人名称']
        );

        // 如果默认方式找不到，尝试跳过第1行（从第2行开始作为表头）
        if (!hasValidHeader) {
            jsonData = XLSX.utils.sheet_to_json(sheet, { range: 1 });
        }

        return jsonData.map(row => ({
            // 支持多种可能的列名格式
            talentName: row['发布达人名称（不可修改）'] || row['发布达人名称'] || row['达人昵称'] || row['达人名称'],
            orderDate: this.parseExcelDate(row['下单日期（不可修改）'] || row['下单日期'])
        })).filter(item => item.talentName && item.orderDate);
    }

    /**
     * 解析 Excel 日期格式
     */
    parseExcelDate(value) {
        if (!value) return null;

        // 如果是数字（Excel 日期序列号）
        if (typeof value === 'number') {
            const date = XLSX.SSF.parse_date_code(value);
            return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
        }

        // 如果是字符串，尝试解析
        const strValue = String(value).trim();

        // 尝试解析 YYYY-MM-DD 格式
        if (/^\d{4}-\d{2}-\d{2}$/.test(strValue)) {
            return strValue;
        }

        // 尝试解析 YYYY/MM/DD 格式
        if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(strValue)) {
            const parts = strValue.split('/');
            return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }

        // 尝试通过 Date 对象解析
        const parsed = new Date(strValue);
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0];
        }

        return null;
    }

    /**
     * 加载所有合作记录用于匹配
     */
    async loadAllCollaborationsForMatching() {
        const requiredStatuses = ['客户已定档', '视频已发布'];
        const response = await API.request('/collaborations', 'GET', {
            projectId: this.projectId,
            limit: 9999,
            statuses: requiredStatuses.join(',')
        });
        return response.data || [];
    }

    /**
     * 匹配合作记录
     */
    matchCollaborations(excelData, allCollabs) {
        const results = {
            matched: [],
            unmatched: [],
            duplicates: []
        };

        excelData.forEach(item => {
            const matches = allCollabs.filter(
                c => c.talentInfo?.nickname === item.talentName
            );

            if (matches.length === 1) {
                results.matched.push({
                    collab: matches[0],
                    orderDate: item.orderDate,
                    talentName: item.talentName
                });
            } else if (matches.length > 1) {
                results.duplicates.push({
                    talentName: item.talentName,
                    count: matches.length
                });
            } else {
                results.unmatched.push(item.talentName);
            }
        });

        return results;
    }

    /**
     * 显示导入预览弹窗
     */
    showImportPreview(matchResult) {
        const { matched, unmatched, duplicates } = matchResult;

        // 创建弹窗
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.id = 'excel-import-modal';

        const unmatchedHtml = unmatched.length > 0
            ? `<div class="flex items-start gap-2 text-yellow-700 bg-yellow-50 p-3 rounded-lg">
                <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                <div>
                    <span class="font-medium">未找到达人: ${unmatched.length} 条</span>
                    <p class="text-sm mt-1">${unmatched.slice(0, 5).join('、')}${unmatched.length > 5 ? ` 等${unmatched.length}人` : ''}</p>
                </div>
            </div>`
            : '';

        const duplicatesHtml = duplicates.length > 0
            ? `<div class="flex items-start gap-2 text-red-700 bg-red-50 p-3 rounded-lg">
                <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div>
                    <span class="font-medium">达人重复: ${duplicates.length} 条</span>
                    <p class="text-sm mt-1">${duplicates.slice(0, 3).map(d => `${d.talentName}(${d.count}个同名)`).join('、')}</p>
                </div>
            </div>`
            : '';

        const matchedTableHtml = matched.length > 0
            ? `<div class="mt-4">
                <h4 class="text-sm font-medium text-gray-700 mb-2">匹配成功的记录：</h4>
                <div class="max-h-60 overflow-y-auto border rounded-lg">
                    <table class="w-full text-sm">
                        <thead class="bg-gray-50 sticky top-0">
                            <tr>
                                <th class="px-4 py-2 text-left">达人昵称</th>
                                <th class="px-4 py-2 text-left">原下单日期</th>
                                <th class="px-4 py-2 text-left">新下单日期</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${matched.map(item => `
                                <tr class="border-t">
                                    <td class="px-4 py-2">${item.talentName}</td>
                                    <td class="px-4 py-2 text-gray-500">${item.collab.orderDate || '无'}</td>
                                    <td class="px-4 py-2 font-medium text-green-600">${item.orderDate}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`
            : '';

        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
                <div class="px-6 py-4 border-b flex justify-between items-center">
                    <h3 class="text-lg font-semibold text-gray-900">Excel 导入预览</h3>
                    <button id="close-import-modal-btn" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <div class="p-6 overflow-y-auto flex-1">
                    <div class="space-y-3">
                        <div class="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <span class="font-medium">匹配成功: ${matched.length} 条</span>
                        </div>
                        ${unmatchedHtml}
                        ${duplicatesHtml}
                    </div>
                    ${matchedTableHtml}
                </div>
                <div class="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
                    <button id="cancel-import-btn" class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">取消</button>
                    <button id="confirm-import-btn" class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400" ${matched.length === 0 ? 'disabled' : ''}>
                        确认导入 ${matched.length} 条
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 绑定事件
        const closeModal = () => modal.remove();

        modal.querySelector('#close-import-modal-btn').addEventListener('click', closeModal);
        modal.querySelector('#cancel-import-btn').addEventListener('click', closeModal);
        modal.querySelector('#confirm-import-btn').addEventListener('click', async () => {
            closeModal();
            await this.executeImport(matched);
        });

        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    /**
     * 执行批量导入
     */
    async executeImport(matchedItems) {
        const loading = Modal.showLoading(`正在导入 ${matchedItems.length} 条记录...`);

        try {
            const updatePromises = matchedItems.map(item =>
                API.request('/update-collaboration', 'PUT', {
                    id: item.collab.id,
                    orderDate: item.orderDate
                })
            );

            await Promise.all(updatePromises);

            loading.close();
            Modal.showAlert(`成功导入 ${matchedItems.length} 条下单日期！`, '导入成功', () => {
                this.load();
                // 触发项目数据刷新
                document.dispatchEvent(new CustomEvent('refreshProject'));
            });
        } catch (error) {
            loading.close();
            console.error('批量导入失败:', error);
            Modal.showAlert('部分数据导入失败，请刷新页面查看结果。');
        }
    }
}

export default FinancialTab;
