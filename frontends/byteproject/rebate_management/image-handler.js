/**
 * @file image-handler.js
 * @description 图片处理模块 - 上传和查看功能
 */

import { apiRequest } from './api.js';
import { showCustomAlert, showCustomConfirm, hideModal } from './utils.js';
import { currentUploadTaskId, getTaskById, updateTask, openRowId } from './state-manager.js';
import { smartRefreshDetailsView } from './details-panel.js';

/**
 * 处理图片上传
 * @param {FileList} files - 文件列表
 * @param {string} taskId - 任务ID
 */
export async function handleImageUpload(files, taskId) {
    if (!taskId) return;

    const task = getTaskById(taskId);
    if (!task) return;

    if (((task.screenshots || []).length + files.length) > 5) {
        showCustomAlert(`最多上传5张凭证。您还可以上传 ${5 - (task.screenshots || []).length} 张。`);
        const imageUploadInput = document.getElementById('image-upload-input');
        imageUploadInput.value = '';
        return;
    }

    showCustomAlert('正在上传凭证，请稍候...', '上传中');

    try {
        const uploadPromises = Array.from(files).map(file => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const response = await apiRequest('/upload-file', 'POST', {
                            fileName: file.name,
                            fileData: e.target.result
                        });
                        resolve(response.data.url);
                    } catch (err) {
                        reject(err);
                    }
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        });

        const newUrls = await Promise.all(uploadPromises);
        const updatedScreenshots = [...(task.screenshots || []), ...newUrls];

        await apiRequest('/update-collaboration', 'PUT', {
            id: taskId,
            rebateScreenshots: updatedScreenshots
        });

        hideModal();

        await smartRefreshDetailsView(taskId, {
            screenshots: updatedScreenshots
        });

        showCustomAlert('凭证上传成功!');

    } catch (error) {
        console.error("Image upload process failed:", error);
        hideModal();
    } finally {
        const imageUploadInput = document.getElementById('image-upload-input');
        imageUploadInput.value = '';
    }
}

/**
 * 处理删除单个截图
 * @param {number} index - 截图索引
 * @param {string} fileUrl - 文件URL
 */
export async function handleDeleteScreenshot(index, fileUrl) {
    const task = getTaskById(openRowId);
    if (!task || !fileUrl) return;

    showCustomConfirm(
        '您确定要删除此凭证吗？<br><span class="text-xs text-red-500">文件将从服务器永久删除。</span>',
        '确认删除',
        async (confirmed) => {
            if (confirmed) {
                try {
                    // Step 1: Delete file from TOS
                    await apiRequest('/delete-file', 'POST', {
                        projectId: task.projectId,
                        fileUrl: fileUrl
                    });

                    // Step 2: Update the database record
                    const updatedScreenshots = task.screenshots.filter((_, i) => i !== index);
                    await apiRequest('/update-collaboration', 'PUT', {
                        id: openRowId,
                        rebateScreenshots: updatedScreenshots
                    });

                    // Step 3: Refresh the view
                    await smartRefreshDetailsView(openRowId, {
                        screenshots: updatedScreenshots
                    });

                    showCustomAlert('凭证删除成功!');
                } catch(error) {
                    // Error handled by apiRequest
                }
            }
        }
    );
}

/**
 * 初始化图片查看器
 */
export function initImageViewer() {
    const imageViewerModal = document.getElementById('image-viewer-modal');
    const closeImageViewerBtn = document.getElementById('close-image-viewer-btn');

    if (closeImageViewerBtn) {
        closeImageViewerBtn.addEventListener('click', () => {
            imageViewerModal.classList.add('hidden');
        });
    }
}

/**
 * 显示图片查看器
 * @param {string} imageUrl - 图片URL
 */
export function showImageViewer(imageUrl) {
    const imageViewerModal = document.getElementById('image-viewer-modal');
    const modalImage = document.getElementById('modal-image');

    if (modalImage && imageViewerModal) {
        modalImage.src = imageUrl;
        imageViewerModal.classList.remove('hidden');
    }
}