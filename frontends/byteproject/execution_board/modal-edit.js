/**
 * @file modal-edit.js
 * @description 编辑弹窗模块 - 负责编辑发布信息（仅用于执行中的项目）
 */

import { AppCore } from '../common/app-core.js';

const { Modal } = AppCore;

export class ModalEdit {
    constructor(dataManager, elements) {
        this.dataManager = dataManager;
        this.elements = elements;
    }

    /**
     * 打开编辑弹窗
     * @param {string} collabId - 合作ID
     */
    openEditModal(collabId) {
        const collab = this.dataManager.allCollaborations.find(c => c.id === collabId);
        if (!collab) return;

        this.elements.quickInputCollabId.value = collabId;
        this.elements.quickInputProjectId.value = collab.projectId;
        this.elements.quickInputProjectName.value = collab.projectName;
        this.elements.quickInputTalentName.value = collab.talentInfo?.nickname || '未知达人';

        // 根据状态显示不同的日期
        // 已发布：显示实际发布日期
        // 未发布：显示计划发布日期
        if (collab.status === '视频已发布' && collab.publishDate) {
            this.elements.quickInputDate.value = collab.publishDate;
        } else {
            this.elements.quickInputDate.value = collab.plannedReleaseDate || '';
        }

        this.elements.quickInputVideoId.value = collab.videoId || '';
        this.elements.quickInputTaskId.value = collab.taskId || '';

        // 更新链接按钮状态
        this.updateLinkButtons();

        this.elements.quickInputModal.classList.remove('hidden');
        this.elements.quickInputModal.classList.add('flex');
    }

    /**
     * 关闭弹窗
     */
    closeModal() {
        this.elements.quickInputModal.classList.add('hidden');
        this.elements.quickInputModal.classList.remove('flex');
        this.elements.quickInputForm.reset();
        // 重置链接按钮状态
        this.updateLinkButtons();
    }

    /**
     * 更新链接按钮的启用/禁用状态
     */
    updateLinkButtons() {
        const videoId = this.elements.quickInputVideoId.value.trim();
        const taskId = this.elements.quickInputTaskId.value.trim();

        // 视频ID按钮：有视频ID时启用
        this.elements.openVideoLinkBtn.disabled = !videoId;

        // 任务ID按钮：有任务ID时启用
        this.elements.openTaskLinkBtn.disabled = !taskId;
    }

    /**
     * 打开抖音视频链接
     */
    openVideoLink() {
        const videoId = this.elements.quickInputVideoId.value.trim();
        if (!videoId) {
            Modal.showAlert('请先输入视频ID');
            return;
        }

        const url = `https://www.douyin.com/video/${videoId}`;
        window.open(url, '_blank');
    }

    /**
     * 打开星图任务链接
     */
    openTaskLink() {
        const taskId = this.elements.quickInputTaskId.value.trim();
        if (!taskId) {
            Modal.showAlert('请先输入任务ID');
            return;
        }

        const url = `https://www.xingtu.cn/ad/creator/task/detail/${taskId}`;
        window.open(url, '_blank');
    }

    /**
     * 保存编辑
     * @param {Function} onSuccess - 成功回调
     */
    async saveEdit(onSuccess) {
        const collabId = this.elements.quickInputCollabId.value;
        const dateValue = this.elements.quickInputDate.value;
        const videoId = this.elements.quickInputVideoId.value.trim();
        const taskId = this.elements.quickInputTaskId.value.trim();

        if (!dateValue) {
            Modal.showAlert('请选择发布日期');
            return;
        }

        const payload = {
            videoId: videoId || null,
            taskId: taskId || null
        };

        // 自动判断状态并设置对应的日期字段
        if (videoId || taskId) {
            // 已发布：设置实际发布日期和状态
            payload.status = '视频已发布';
            payload.publishDate = dateValue;
            // 如果之前没有计划日期，也设置一下
            payload.plannedReleaseDate = dateValue;
        } else {
            // 未发布：只设置计划发布日期
            payload.status = '客户已定档';
            payload.plannedReleaseDate = dateValue;
        }

        try {
            this.elements.saveQuickInputBtn.disabled = true;
            this.elements.saveQuickInputBtn.textContent = '保存中...';

            const result = await this.dataManager.updateCollaboration(collabId, payload);

            if (result.success) {
                this.closeModal();
                Modal.showAlert('保存成功！', '成功', async () => {
                    // 调用成功回调
                    if (onSuccess) await onSuccess();
                });
            }
        } catch (error) {
            // API已处理错误提示
        } finally {
            this.elements.saveQuickInputBtn.disabled = false;
            this.elements.saveQuickInputBtn.textContent = '保存';
        }
    }
}
