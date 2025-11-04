/**
 * @file modal-view.js
 * @description 查看详情弹窗模块 - 只读模式，用于已结束的项目
 */

import { AppCore } from '../common/app-core.js';

const { Modal } = AppCore;

export class ModalView {
    constructor(dataManager, elements) {
        this.dataManager = dataManager;
        this.elements = elements;
    }

    /**
     * 打开查看详情弹窗（只读模式）
     * @param {string} collabId - 合作ID
     */
    openViewModal(collabId) {
        const collab = this.dataManager.allCollaborations.find(c => c.id === collabId);
        if (!collab) return;

        const talentName = collab.talentInfo?.nickname || '未知达人';

        // 填充数据
        this.elements.viewProjectName.value = collab.projectName || '';
        this.elements.viewTalentName.value = talentName;

        // 显示正确的日期
        if (collab.status === '视频已发布' && collab.publishDate) {
            this.elements.viewDate.value = collab.publishDate;
        } else {
            this.elements.viewDate.value = collab.plannedReleaseDate || '';
        }

        this.elements.viewVideoId.value = collab.videoId || '';
        this.elements.viewTaskId.value = collab.taskId || '';

        // 更新复制和链接按钮状态
        const hasVideoId = !!collab.videoId;
        const hasTaskId = !!collab.taskId;

        this.elements.copyVideoIdBtn.disabled = !hasVideoId;
        this.elements.viewOpenVideoLinkBtn.disabled = !hasVideoId;
        this.elements.copyTaskIdBtn.disabled = !hasTaskId;
        this.elements.viewOpenTaskLinkBtn.disabled = !hasTaskId;

        // 显示弹窗
        this.elements.viewDetailModal.classList.remove('hidden');
        this.elements.viewDetailModal.classList.add('flex');
    }

    /**
     * 关闭查看详情弹窗
     */
    closeViewModal() {
        this.elements.viewDetailModal.classList.add('hidden');
        this.elements.viewDetailModal.classList.remove('flex');
    }

    /**
     * 复制到剪贴板
     * @param {string} text - 要复制的文本
     * @param {string} label - 标签名称
     */
    async copyToClipboard(text, label) {
        if (!text) {
            Modal.showAlert(`${label}为空，无法复制`);
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            Modal.showAlert(`${label}已复制：${text}`);
        } catch (err) {
            // 降级方案
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                Modal.showAlert(`${label}已复制：${text}`);
            } catch (e) {
                Modal.showAlert('复制失败，请手动复制');
            }
            document.body.removeChild(textarea);
        }
    }

    /**
     * 打开抖音视频链接（查看模式）
     */
    openViewVideoLink() {
        const videoId = this.elements.viewVideoId.value.trim();
        if (!videoId) {
            Modal.showAlert('视频ID为空');
            return;
        }

        const url = `https://www.douyin.com/video/${videoId}`;
        window.open(url, '_blank');
    }

    /**
     * 打开星图任务链接（查看模式）
     */
    openViewTaskLink() {
        const taskId = this.elements.viewTaskId.value.trim();
        if (!taskId) {
            Modal.showAlert('任务ID为空');
            return;
        }

        const url = `https://www.xingtu.cn/ad/creator/task/detail/${taskId}`;
        window.open(url, '_blank');
    }
}
