/**
 * @file order_list/tab-performance.js
 * @description 执行信息 Tab 模块
 * @version 1.0.0
 *
 * 功能:
 * - 执行信息列表渲染
 * - 任务ID/视频ID/内容文件编辑
 * - 发布时间录入
 * - 行内编辑/保存逻辑
 * - 状态自动更新 (录入发布日期→自动变为"视频已发布")
 * - 复制/打开链接功能
 * - 分页控制
 */

import { AppCore } from '../common/app-core.js';

const { API, Modal, Format, Pagination, Utils } = AppCore;

export class PerformanceTab {
    constructor(projectId, project) {
        this.projectId = projectId;
        this.project = project;

        // 数据
        this.collaborators = [];
        this.totalItems = 0;
        this.currentPage = 1;
        this.itemsPerPage = 10;

        // 状态
        this.editingRowId = null; // 正在编辑的行ID

        // DOM 元素
        this.elements = {
            listBody: document.getElementById('data-performance-list-body'),
            noDataMessage: document.getElementById('no-data-performance-message'),
            paginationControls: document.getElementById('pagination-controls-performance')
        };

        // 绑定事件处理器
        this.handleClick = this.handleClick.bind(this);
    }

    /**
     * 加载数据
     */
    async load() {
        this.showLoading();

        try {
            // 执行信息Tab只显示"客户已定档"和"视频已发布"状态的达人
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
            console.error('加载执行信息失败:', error);
            this.showError();
        }
    }

    /**
     * 显示加载状态
     */
    showLoading() {
        const { listBody } = this.elements;
        if (listBody) {
            listBody.innerHTML = '<tr><td colspan="8" class="text-center py-12 text-gray-500">正在加载...</td></tr>';
        }
    }

    /**
     * 显示错误状态
     */
    showError() {
        const { listBody } = this.elements;
        if (listBody) {
            listBody.innerHTML = '<tr><td colspan="8" class="text-center py-12 text-red-500">加载失败，请刷新重试</td></tr>';
        }
    }

    /**
     * 渲染列表
     */
    render() {
        const { listBody, noDataMessage, paginationControls } = this.elements;

        if (!listBody || !noDataMessage) return;

        const isReadOnly = this.project.status !== '执行中';

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
            const row = this.renderRow(collab, isReadOnly);
            fragment.appendChild(row);
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
     */
    renderRow(collab, isReadOnly) {
        const row = document.createElement('tr');
        row.className = 'bg-white border-b data-row';
        row.dataset.id = collab.id;

        const isEditingThisRow = this.editingRowId === collab.id;

        // 构建可编辑单元格
        const renderCell = (value, fieldName) => {
            if (isEditingThisRow && !isReadOnly) {
                return `<input type="text" class="data-input performance-input rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="${fieldName}" value="${value || ''}">`;
            }

            if (!value) return `<div class="text-gray-400">N/A</div>`;

            const displayValue = value.length > 15 ? `${value.substring(0, 8)}...${value.slice(-4)}` : value;
            const actionButtons = `
                <div class="flex items-center ml-2">
                    <button class="copy-btn p-1 rounded-md text-gray-400 hover:bg-gray-100" title="复制" data-value="${value}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                        </svg>
                    </button>
                    ${fieldName === 'contentFile' ? `<button class="open-link-btn p-1 rounded-md text-blue-500 hover:bg-blue-100" title="打开链接" data-url="${value}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                        </svg>
                    </button>` : ''}
                    ${fieldName === 'videoId' ? `<button class="open-video-btn p-1 rounded-md text-red-500 hover:bg-red-100" title="打开抖音视频" data-videoid="${value}">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
                        </svg>
                    </button>` : ''}
                </div>`;
            return `<div class="flex items-center justify-between" title="${value}"><span class="truncate">${displayValue}</span>${actionButtons}</div>`;
        };

        // 操作按钮
        let actionsCellHtml = '';
        if (isEditingThisRow && !isReadOnly) {
            actionsCellHtml = `
                <button class="save-performance-row-btn px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700" data-id="${collab.id}">保存</button>
                <button class="cancel-edit-performance-row-btn px-3 py-1 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 ml-2" data-id="${collab.id}">取消</button>
            `;
        } else {
            actionsCellHtml = `<button class="edit-performance-btn px-3 py-1 text-sm bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50" data-id="${collab.id}" ${isReadOnly ? 'disabled' : ''}>编辑</button>`;
        }

        row.innerHTML = `
            <td class="px-6 py-4 font-medium whitespace-nowrap">${collab.talentInfo?.nickname || 'N/A'}</td>
            <td class="px-6 py-4">${collab.plannedReleaseDate || '<span class="text-gray-400">待定</span>'}</td>
            <td class="px-6 py-4">${collab.talentSource || '野生达人'}</td>
            <td class="px-6 py-4">${renderCell(collab.contentFile, 'contentFile')}</td>
            <td class="px-6 py-4">${renderCell(collab.taskId, 'taskId')}</td>
            <td class="px-6 py-4">${renderCell(collab.videoId, 'videoId')}</td>
            <td class="px-6 py-4">
                ${isEditingThisRow && !isReadOnly ?
                `<input type="date" class="data-input publish-date-input rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" data-field="publishDate" value="${collab.publishDate || ''}">` :
                (collab.publishDate || '<span class="text-gray-400">N/A</span>')
            }
            </td>
            <td class="px-6 py-4 text-center">${actionsCellHtml}</td>
        `;

        return row;
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
    }

    /**
     * 处理点击事件
     */
    handleClick(e) {
        const target = e.target.closest('button');
        if (!target) return;

        const collabId = target.dataset.id;

        if (target.classList.contains('edit-performance-btn')) {
            this.handleEdit(collabId);
        } else if (target.classList.contains('save-performance-row-btn')) {
            this.handleSave(collabId);
        } else if (target.classList.contains('cancel-edit-performance-row-btn')) {
            this.handleCancel();
        } else if (target.classList.contains('copy-btn')) {
            this.handleCopy(target.dataset.value);
        } else if (target.classList.contains('open-link-btn')) {
            this.handleOpenLink(target.dataset.url);
        } else if (target.classList.contains('open-video-btn')) {
            this.handleOpenVideo(target.dataset.videoid);
        }
    }

    /**
     * 进入编辑模式
     */
    handleEdit(collabId) {
        this.editingRowId = collabId;
        this.render();
    }

    /**
     * 取消编辑
     */
    handleCancel() {
        this.editingRowId = null;
        this.render();
    }

    /**
     * 保存编辑
     */
    async handleSave(collabId) {
        const row = this.elements.listBody.querySelector(`tr[data-id="${collabId}"]`);
        if (!row) return;

        const currentCollaborator = this.collaborators.find(c => c.id === collabId);
        if (!currentCollaborator) return;

        const payload = {
            id: collabId,
            publishDate: row.querySelector('.publish-date-input')?.value.trim() || null,
            contentFile: row.querySelector('input[data-field="contentFile"]')?.value.trim() || null,
            taskId: row.querySelector('input[data-field="taskId"]')?.value.trim() || null,
            videoId: row.querySelector('input[data-field="videoId"]')?.value.trim() || null,
        };

        let statusChangeMessage = '';
        if (payload.publishDate && currentCollaborator.status !== '视频已发布') {
            payload.status = '视频已发布';
            statusChangeMessage = '<br><br><b>请注意：</b>录入发布日期后，该合作状态将自动更新为 <b>[视频已发布]</b>。';
        } else if (!payload.publishDate && currentCollaborator.status === '视频已发布') {
            payload.status = '客户已定档';
            statusChangeMessage = '<br><br><b>请注意：</b>清空发布日期后，该合作状态将自动回滚至 <b>[客户已定档]</b>。';
        }

        Modal.showConfirm(`您确定要保存这些更改吗？${statusChangeMessage}`, '确认保存', async (confirmed) => {
            if (!confirmed) return;

            const loading = Modal.showLoading('正在保存...');

            try {
                await API.request('/update-collaboration', 'PUT', payload);
                this.editingRowId = null;
                loading.close();
                Modal.showAlert('保存成功！', '成功', () => {
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
     * 复制文本到剪贴板
     */
    handleCopy(value) {
        if (!value) return;

        navigator.clipboard.writeText(value).then(() => {
            Modal.showAlert('已复制到剪贴板！', '成功');
        }).catch(() => {
            // 降级方案
            const textarea = document.createElement('textarea');
            textarea.value = value;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            Modal.showAlert('已复制到剪贴板！', '成功');
        });
    }

    /**
     * 打开链接
     */
    handleOpenLink(url) {
        if (url) {
            window.open(url, '_blank');
        }
    }

    /**
     * 打开抖音视频
     */
    handleOpenVideo(videoId) {
        if (videoId) {
            const douyinUrl = `https://www.douyin.com/video/${videoId}`;
            window.open(douyinUrl, '_blank');
        }
    }
}

export default PerformanceTab;
