/**
 * @file order_list/tab-basic.js
 * @description 基础信息 Tab 模块
 * @version 1.0.0
 *
 * 功能:
 * - 基础信息列表渲染
 * - 合作状态编辑
 * - 合作档期编辑
 * - 达人档案展开/收起
 * - 查看合作历史
 * - 删除合作达人
 * - 分页控制
 */

import { AppCore } from '../common/app-core.js';

const { API, Modal, Format, Pagination, Utils } = AppCore;

// 可手动编辑的状态选项
const MANUAL_STATUS_OPTIONS = ['待提报工作台', '工作台已提交', '客户已定档'];

// 历史记录API端点
const HISTORY_API_ENDPOINT = '/getTalentHistory';

export class BasicInfoTab {
    constructor(projectId, project, allDiscounts) {
        this.projectId = projectId;
        this.project = project;
        this.allDiscounts = allDiscounts;

        // 数据
        this.collaborators = [];
        this.totalItems = 0;
        this.currentPage = 1;
        this.itemsPerPage = 10;

        // 状态
        this.openDetails = new Set(); // 展开的详情行
        this.editingDateId = null;    // 正在编辑日期的行ID

        // DOM 元素
        this.elements = {
            listBody: document.getElementById('collaborator-list-body'),
            noDataMessage: document.getElementById('no-data-message'),
            paginationControls: document.getElementById('pagination-controls-basic'),
            addCollaboratorLink: document.getElementById('add-collaborator-link')
        };

        // 绑定事件处理器 (保持 this 上下文)
        this.handleClick = this.handleClick.bind(this);
        this.handleChange = this.handleChange.bind(this);
    }

    /**
     * 加载数据
     * @param {string} statuses - 筛选的状态 (逗号分隔)
     */
    async load(statuses = '') {
        this.showLoading();

        try {
            const params = {
                projectId: this.projectId,
                page: this.currentPage,
                limit: this.itemsPerPage,
                sortBy: 'createdAt',
                order: 'desc'
            };

            if (statuses) {
                params.statuses = statuses;
            }

            const response = await API.request('/collaborations', 'GET', params);

            this.collaborators = response.data || [];
            this.totalItems = response.total || 0;

            this.render();
        } catch (error) {
            console.error('加载基础信息失败:', error);
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
        const { listBody, noDataMessage, paginationControls, addCollaboratorLink } = this.elements;

        if (!listBody || !noDataMessage) return;

        // 更新添加链接
        if (addCollaboratorLink) {
            addCollaboratorLink.href = `order_form.html?projectId=${this.projectId}`;
        }

        // 无数据时显示提示
        if (this.collaborators.length === 0) {
            noDataMessage.classList.remove('hidden');
            listBody.closest('table').classList.add('hidden');
            if (paginationControls) paginationControls.innerHTML = '';
            return;
        }

        // 有数据时渲染列表
        noDataMessage.classList.add('hidden');
        listBody.closest('table').classList.remove('hidden');

        const fragment = document.createDocumentFragment();

        this.collaborators.forEach(collab => {
            const { mainRow, detailRow } = this.renderRow(collab);
            fragment.appendChild(mainRow);
            fragment.appendChild(detailRow);
        });

        listBody.innerHTML = '';
        listBody.appendChild(fragment);

        // 渲染分页
        this.renderPagination();

        // 绑定事件
        this.bindEvents();
    }

    /**
     * 渲染单行数据
     * @param {object} collab - 合作记录
     * @returns {object} { mainRow, detailRow }
     */
    renderRow(collab) {
        const talentInfo = collab.talentInfo || {};
        const talentNickname = talentInfo.nickname || '（已删除）';
        const financials = collab.metrics;

        const isProjectExecuting = this.project.status === '执行中';
        const isDeleteDisabled = collab.status === '视频已发布' || !isProjectExecuting;
        const canEditDate = !['视频已发布'].includes(collab.status) && isProjectExecuting;

        // 主行
        const mainRow = document.createElement('tr');
        mainRow.className = 'bg-white border-b hover:bg-gray-50';
        mainRow.id = `collab-row-${collab.id}`;
        mainRow.dataset.id = collab.id;

        // 构建星图链接
        const xingtuUrl = talentInfo.xingtuId ?
            `https://www.xingtu.cn/ad/creator/author-homepage/douyin-video/${talentInfo.xingtuId}` : '#';
        const talentLink = talentInfo.xingtuId ?
            `<a href="${xingtuUrl}" target="_blank" class="text-blue-600 hover:underline">${talentNickname}</a>` :
            talentNickname;

        // 构建状态单元格 (胶囊式下拉框或静态标签)
        const statusCellHtml = this.renderStatusCell(collab);

        // 构建日期单元格
        const dateCellHtml = this.renderDateCell(collab, canEditDate);

        // 订单类型
        const orderTypeText = collab.orderType === 'original' ? '原价下单' : '改价下单';

        mainRow.innerHTML = `
            <td class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">${talentLink}</td>
            <td class="px-6 py-4">${dateCellHtml}</td>
            <td class="px-6 py-4">${collab.talentSource || '未指定'}</td>
            <td class="px-6 py-4">${orderTypeText}</td>
            <td class="px-6 py-4" title="${collab.priceInfo || ''}">¥ ${Number(collab.amount || 0).toLocaleString()}</td>
            <td class="px-6 py-4 text-center">${collab.rebate ?? 'N/A'}%</td>
            <td class="px-6 py-4 font-medium">¥ ${(financials?.income ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="px-6 py-4 font-semibold text-center ${(financials?.grossProfitMargin ?? 0) < 0 ? 'text-red-600' : 'text-green-600'}">${(financials?.grossProfitMargin ?? 0).toFixed(2)}%</td>
            <td class="px-6 py-4">${statusCellHtml}</td>
            <td class="px-6 py-4 flex items-center justify-center space-x-2">
                <button data-id="${collab.id}" class="toggle-details-btn p-1 rounded-md text-gray-500 hover:bg-gray-100">
                    <svg class="w-5 h-5 icon-plus ${this.openDetails.has(collab.id) ? 'hidden' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    <svg class="w-5 h-5 icon-minus ${this.openDetails.has(collab.id) ? '' : 'hidden'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 12H6"></path></svg>
                </button>
                <button data-id="${collab.id}" class="delete-btn p-1 rounded-md text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed" ${isDeleteDisabled ? 'disabled' : ''}>
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </td>
        `;

        // 详情行
        const detailRow = this.renderDetailRow(collab, talentInfo, talentNickname, xingtuUrl);

        return { mainRow, detailRow };
    }

    /**
     * 渲染状态单元格
     */
    renderStatusCell(collab) {
        const isProjectExecuting = this.project.status === '执行中';
        const isStatusSelectEnabled = MANUAL_STATUS_OPTIONS.includes(collab.status) && isProjectExecuting;

        if (isStatusSelectEnabled) {
            // 可编辑的下拉框 (胶囊样式)
            const statusOptionsHtml = MANUAL_STATUS_OPTIONS.map(s =>
                `<option value="${s}" ${collab.status === s ? 'selected' : ''}>${s}</option>`
            ).join('');

            let bgColor, textColor, borderColor;
            switch (collab.status) {
                case '待提报工作台':
                    bgColor = 'bg-gray-100'; textColor = 'text-gray-700'; borderColor = 'border-gray-300';
                    break;
                case '工作台已提交':
                    bgColor = 'bg-yellow-100'; textColor = 'text-yellow-800'; borderColor = 'border-yellow-300';
                    break;
                case '客户已定档':
                    bgColor = 'bg-blue-100'; textColor = 'text-blue-800'; borderColor = 'border-blue-300';
                    break;
                default:
                    bgColor = 'bg-gray-100'; textColor = 'text-gray-700'; borderColor = 'border-gray-300';
            }

            return `
                <div class="relative inline-block w-36">
                    <select class="status-select text-xs font-semibold rounded-full py-1 pl-3 pr-8 ${bgColor} ${textColor} ${borderColor} border-2 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer w-full text-center" data-id="${collab.id}">
                        ${statusOptionsHtml}
                    </select>
                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 ${textColor}">
                        <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></path></svg>
                    </div>
                </div>
            `;
        } else {
            // 静态胶囊标签
            return this.getStatusCapsuleHtml(collab.status);
        }
    }

    /**
     * 获取状态胶囊HTML
     */
    getStatusCapsuleHtml(status) {
        let bgColor, textColor;
        switch (status) {
            case '待提报工作台':
                bgColor = 'bg-gray-100'; textColor = 'text-gray-700'; break;
            case '工作台已提交':
                bgColor = 'bg-yellow-100'; textColor = 'text-yellow-800'; break;
            case '客户已定档':
                bgColor = 'bg-blue-100'; textColor = 'text-blue-800'; break;
            case '视频已发布':
                bgColor = 'bg-green-100'; textColor = 'text-green-800'; break;
            default:
                bgColor = 'bg-gray-200'; textColor = 'text-gray-800';
        }

        return `<span class="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold ${bgColor} ${textColor} w-36 text-center">${status}</span>`;
    }

    /**
     * 渲染日期单元格
     */
    renderDateCell(collab, canEditDate) {
        if (canEditDate) {
            const isEditingThisRow = this.editingDateId === collab.id;
            const dateInputId = `planned-date-input-${collab.id}`;

            return `
                <div class="flex items-center gap-2">
                    <input type="date" id="${dateInputId}" class="data-input w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" value="${collab.plannedReleaseDate || ''}" ${!isEditingThisRow ? 'disabled' : ''}>
                    <button class="p-1 rounded-md text-gray-500 hover:bg-gray-200 transition-colors inline-edit-date-btn" data-id="${collab.id}" data-state="${isEditingThisRow ? 'save' : 'edit'}">
                        ${isEditingThisRow ?
                    '<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>' :
                    '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"></path></svg>'
                }
                    </button>
                </div>
            `;
        } else {
            return collab.plannedReleaseDate || '<span class="text-gray-400">待定</span>';
        }
    }

    /**
     * 渲染详情行
     */
    renderDetailRow(collab, talentInfo, talentNickname, xingtuUrl) {
        const detailRow = document.createElement('tr');
        detailRow.className = `collapsible-row bg-gray-50/70 ${this.openDetails.has(collab.id) ? 'expanded' : ''}`;
        detailRow.dataset.id = collab.id;

        const tagsHtml = (talentInfo.tags && talentInfo.tags.length > 0) ?
            talentInfo.tags.map(tag => `<span class="bg-blue-100 text-blue-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full">${tag}</span>`).join('') :
            '<span class="text-gray-500">暂无</span>';

        detailRow.innerHTML = `
            <td colspan="10" class="p-4">
                <div class="bg-white p-4 rounded-lg border">
                    <div class="flex justify-between items-center mb-3 border-b pb-2">
                        <h4 class="text-sm font-semibold text-gray-800">达人档案</h4>
                        <button class="view-history-btn text-sm font-medium text-blue-600 hover:underline" data-talent-id="${collab.talentId}" data-talent-name="${talentNickname}">
                            查看合作历史 &rarr;
                        </button>
                    </div>
                    <div class="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-500">星图ID:</span>
                            ${talentInfo.xingtuId ? `<a href="${xingtuUrl}" target="_blank" class="font-medium text-blue-600 hover:underline">${talentInfo.xingtuId}</a>` : '<span class="font-medium text-gray-500">N/A</span>'}
                        </div>
                        <div class="flex justify-between"><span class="text-gray-500">UID:</span><span class="font-medium text-gray-800">${talentInfo.uid || 'N/A'}</span></div>
                        <div class="flex justify-between"><span class="text-gray-500">达人层级:</span><span class="font-medium text-gray-800">${talentInfo.level || 'N/A'}</span></div>
                        <div class="flex items-start justify-between"><span class="text-gray-500 flex-shrink-0 mr-4">内容标签:</span><div class="text-right">${tagsHtml}</div></div>
                    </div>
                </div>
            </td>
        `;

        return detailRow;
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
     * 绑定事件
     */
    bindEvents() {
        const { listBody } = this.elements;
        if (!listBody) return;

        listBody.addEventListener('click', this.handleClick);
        listBody.addEventListener('change', this.handleChange);
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
        } else if (target.classList.contains('delete-btn')) {
            this.handleDelete(collabId);
        } else if (target.classList.contains('inline-edit-date-btn')) {
            const state = target.dataset.state;
            if (state === 'edit') {
                this.handleDateEdit(collabId);
            } else if (state === 'save') {
                this.handleDateSave(collabId);
            }
        } else if (target.classList.contains('view-history-btn')) {
            const talentId = target.dataset.talentId;
            const talentName = target.dataset.talentName;
            this.handleViewHistory(talentId, talentName);
        }
    }

    /**
     * 处理change事件
     */
    handleChange(e) {
        const target = e.target;

        if (target.classList.contains('status-select')) {
            const collabId = target.dataset.id;
            const newStatus = target.value;
            this.handleStatusChange(collabId, newStatus);
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
        const mainRow = document.querySelector(`#collab-row-${collabId}`);
        const detailRow = mainRow?.nextElementSibling;

        if (mainRow && detailRow) {
            const plusIcon = mainRow.querySelector('.icon-plus');
            const minusIcon = mainRow.querySelector('.icon-minus');

            if (this.openDetails.has(collabId)) {
                detailRow.classList.add('expanded');
                if (plusIcon) plusIcon.classList.add('hidden');
                if (minusIcon) minusIcon.classList.remove('hidden');
            } else {
                detailRow.classList.remove('expanded');
                if (plusIcon) plusIcon.classList.remove('hidden');
                if (minusIcon) minusIcon.classList.add('hidden');
            }
        }
    }

    /**
     * 删除合作达人
     */
    async handleDelete(collabId) {
        Modal.showConfirm('您确定要移除该达人吗？此操作不可撤销。', '确认移除', async (confirmed) => {
            if (!confirmed) return;

            const loading = Modal.showLoading('正在移除合作记录...');

            try {
                await API.request('/delete-collaboration', 'DELETE', { collaborationId: collabId });
                loading.close();
                Modal.showAlert('移除成功！', '操作成功', () => {
                    this.load();
                    // 触发项目数据刷新
                    document.dispatchEvent(new CustomEvent('refreshProject'));
                });
            } catch (error) {
                loading.close();
                console.error('删除合作时出错:', error);
            }
        });
    }

    /**
     * 状态修改
     */
    async handleStatusChange(collabId, newStatus) {
        // 如果改为"客户已定档",需要先检查是否有计划发布日期
        if (newStatus === '客户已定档') {
            const collab = this.collaborators.find(c => c.id === collabId);
            if (!collab || !collab.plannedReleaseDate) {
                Modal.showAlert('请先为该合作指定一个计划发布日期，才能将其状态设置为"客户已定档"。');
                this.render(); // 恢复下拉框显示
                return;
            }
        }

        const loading = Modal.showLoading('正在更新状态...');

        try {
            await API.request('/update-collaboration', 'PUT', { id: collabId, status: newStatus });

            // 更新本地数据
            const collab = this.collaborators.find(c => c.id === collabId);
            if (collab) collab.status = newStatus;

            loading.close();
            Modal.showAlert('状态更新成功！', '成功', () => {
                this.load();
                // 触发项目数据刷新
                document.dispatchEvent(new CustomEvent('refreshProject'));
            });
        } catch (error) {
            loading.close();
            this.render(); // 恢复显示
        }
    }

    /**
     * 日期编辑
     */
    handleDateEdit(collabId) {
        this.editingDateId = collabId;
        this.render();
    }

    /**
     * 日期保存
     */
    async handleDateSave(collabId) {
        const dateInput = document.getElementById(`planned-date-input-${collabId}`);
        if (!dateInput) return;

        const newDate = dateInput.value;
        const loading = Modal.showLoading('正在保存档期...');

        try {
            await API.request('/update-collaboration', 'PUT', {
                id: collabId,
                plannedReleaseDate: newDate || null
            });

            // 更新本地数据
            const collab = this.collaborators.find(c => c.id === collabId);
            if (collab) collab.plannedReleaseDate = newDate || null;

            this.editingDateId = null;
            loading.close();
            Modal.showAlert('合作档期更新成功！', '成功', () => {
                this.render();
            });
        } catch (error) {
            loading.close();
            Modal.showAlert('保存失败，请重试。', '错误');
        }
    }

    /**
     * 查看合作历史
     */
    async handleViewHistory(talentId, talentName) {
        if (!talentId) return;

        // 创建历史记录Modal
        const historyModal = document.createElement('div');
        historyModal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full z-50 flex items-center justify-center p-4';
        historyModal.innerHTML = `
            <div class="relative mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold text-gray-900" id="history-modal-title"></h3>
                    <button id="history-modal-close-btn" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>
                <div id="history-modal-body" class="max-h-[60vh] overflow-y-auto"></div>
            </div>
        `;

        document.body.appendChild(historyModal);

        const historyModalTitle = historyModal.querySelector('#history-modal-title');
        const historyModalBody = historyModal.querySelector('#history-modal-body');
        const closeModalBtn = historyModal.querySelector('#history-modal-close-btn');

        closeModalBtn.onclick = () => historyModal.remove();
        historyModal.onclick = (e) => { if (e.target === historyModal) historyModal.remove(); };

        historyModalTitle.textContent = `达人"${talentName}"的过往合作`;
        historyModalBody.innerHTML = '<p class="text-center text-gray-500">正在加载历史记录...</p>';

        try {
            const response = await API.request(HISTORY_API_ENDPOINT, 'GET', {
                talentId: talentId,
                excludeProjectId: this.projectId
            });

            if (response.success && response.data.length > 0) {
                const historyHtml = response.data.map(item => `
                    <div class="grid grid-cols-5 gap-4 text-sm py-2 border-b last:border-b-0">
                        <div class="col-span-2 font-medium text-gray-800" title="${item.projectName}">${item.projectName || 'N/A'}</div>
                        <div class="text-gray-600">${item.projectYear || ''}年${item.projectMonth || ''}月</div>
                        <div class="text-gray-600">¥${Number(item.amount || 0).toLocaleString()} / ${Number(item.actualRebate || 0)}%</div>
                        <div>${this.getStatusCapsuleHtml(item.status)}</div>
                    </div>
                `).join('');

                historyModalBody.innerHTML = `
                    <div class="grid grid-cols-5 gap-4 text-xs font-bold text-gray-500 uppercase px-0 py-2 border-b">
                        <div class="col-span-2">项目名称</div>
                        <div>项目月份</div>
                        <div>金额 / 返点率</div>
                        <div>最终状态</div>
                    </div>
                    ${historyHtml}
                `;
            } else {
                historyModalBody.innerHTML = '<p class="text-center text-gray-500">未找到该达人的其他合作历史。</p>';
            }
        } catch (error) {
            historyModalBody.innerHTML = '<p class="text-center text-red-500">加载历史记录失败，请稍后重试。</p>';
        }
    }
}

export default BasicInfoTab;
