/**
 * @module utils
 * @description 通用工具函数
 */

/**
 * 显示Toast提示消息
 * @param {string} message - 提示消息内容
 * @param {boolean} isSuccess - 是否为成功消息
 */
export function showToast(message, isSuccess = false) {
    // 使用alert作为简单实现，可以后续替换为更优雅的Toast组件
    if (isSuccess) {
        console.log(`✓ ${message}`);
    } else {
        console.error(`✗ ${message}`);
    }
    alert(message);
}

/**
 * 设置默认的时间月份（当前月份）
 * @returns {string} 格式化的年月字符串 (YYYY-MM)
 */
export function getDefaultTimeMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * 设置加载状态
 * @param {HTMLElement} loadingOverlay - 加载遮罩元素
 * @param {HTMLButtonElement} button - 导出按钮元素
 * @param {HTMLElement} buttonText - 按钮文本元素
 * @param {HTMLElement} buttonLoader - 按钮加载动画元素
 * @param {boolean} isLoading - 是否正在加载
 * @param {string} message - 加载消息
 */
export function setLoadingState(loadingOverlay, button, buttonText, buttonLoader, isLoading, message = '') {
    if (isLoading) {
        loadingOverlay.classList.remove('hidden');
        if (message) {
            const msgElement = loadingOverlay.querySelector('span');
            if (msgElement) {
                msgElement.textContent = message;
            }
        }
    } else {
        loadingOverlay.classList.add('hidden');
    }

    button.disabled = isLoading;
    buttonText.classList.toggle('hidden', isLoading);
    buttonLoader.classList.toggle('hidden', !isLoading);
}

/**
 * 检查XLSX库是否已加载
 * @returns {boolean} 库是否可用
 */
export function checkXLSXLibrary() {
    if (typeof XLSX === 'undefined') {
        console.error("XLSX library is not loaded. Please include it in your HTML.");
        showToast("导出功能所需的核心库加载失败，请刷新页面或联系管理员。", false);
        return false;
    }
    return true;
}

/**
 * 生成Excel文件名
 * @param {string} baseFilename - 基础文件名
 * @returns {string} 完整的文件名（带.xlsx扩展名）
 */
export function generateExcelFilename(baseFilename) {
    let filename = baseFilename.trim() || '数据导出报表';
    if (!filename.endsWith('.xlsx')) {
        filename += '.xlsx';
    }
    return filename;
}