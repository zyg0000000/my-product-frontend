/**
 * @file app-core.js
 * @description 通用核心库 - 所有页面共享的基础功能
 * @version 1.1.0 (Date & Utils Enhancement)
 *
 * 变更日志:
 * - v1.1.0:
 * - [新增] `Utils` 类中添加 `daysBetween(date1, date2)` 方法，用于计算两个日期之间的天数。
 * - [增强] `Formatters.date()` 方法重写，支持传入格式字符串 (如 'YYYY-MM-DD', 'MM.DD')，并修复时区问题。
 *
 * 功能模块:
 * - API 请求封装
 * - Modal 管理器 (Alert/Confirm/Loading)
 * - 格式化工具 (金额/日期/百分比等)
 * - 分页组件
 * - 通用工具函数
 */

// ============================================
// 1. API 请求封装
// ============================================

const API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';

export class APIService {
    constructor(baseUrl = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    /**
     * 统一的 API 请求方法
     * @param {string} endpoint - API 端点
     * @param {string} method - HTTP 方法 (GET/POST/PUT/DELETE)
     * @param {object} body - 请求体或查询参数
     * @returns {Promise} API 响应
     */
    async request(endpoint, method = 'GET', body = null) {
        const url = new URL(`${this.baseUrl}${endpoint}`);

        // GET 请求时将 body 转为查询参数
        if (method === 'GET' && body) {
            Object.keys(body).forEach(key => {
                if (body[key] !== undefined && body[key] !== null && body[key] !== '') {
                    url.searchParams.append(key, body[key]);
                }
            });
        }

        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        };

        // POST/PUT/DELETE 请求时添加 body
        if (body && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(url.toString(), options);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            // 处理 PDF 响应
            if (response.headers.get('Content-Type')?.includes('application/pdf')) {
                return response.blob();
            }

            const text = await response.text();

            // 处理非 JSON 响应 (兼容性处理)
            if (endpoint.includes('getTalentHistory') && !text.startsWith('{') && !text.startsWith('[')) {
                console.warn("Backend returned non-JSON. Simulating empty array.");
                return { success: true, data: [] };
            }

            return text ? JSON.parse(text) : {};
        } catch (error) {
            ModalManager.showAlert(`操作失败: ${error.message}`, '错误');
            throw error;
        }
    }
}

// 创建全局 API 实例
export const API = new APIService();


// ============================================
// 2. Modal 管理器
// ============================================

export class ModalManager {
    static _initialized = false;
    static alertModal = null;
    static confirmModal = null;
    static loadingModal = null;

    /**
     * 初始化所有 Modal DOM 元素
     */
    static init() {
        if (this._initialized) return;

        // 创建 Alert Modal
        this.alertModal = this._createAlertModal();
        document.body.appendChild(this.alertModal.element);

        // 创建 Confirm Modal
        this.confirmModal = this._createConfirmModal();
        document.body.appendChild(this.confirmModal.element);

        // 创建 Loading Modal
        this.loadingModal = this._createLoadingModal();
        document.body.appendChild(this.loadingModal.element);

        this._initialized = true;
    }

    /**
     * 创建 Alert Modal
     */
    static _createAlertModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full hidden z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="relative mx-auto p-5 border w-full max-w-sm shadow-lg rounded-md bg-white">
                <h3 class="text-lg font-bold text-gray-900" id="alert-modal-title"></h3>
                <div class="mt-2 py-3">
                    <p class="text-sm text-gray-500" id="alert-modal-message"></p>
                </div>
                <div class="mt-4 flex justify-end">
                    <button id="alert-modal-ok-btn" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">确定</button>
                </div>
            </div>
        `;

        const titleEl = modal.querySelector('#alert-modal-title');
        const messageEl = modal.querySelector('#alert-modal-message');
        const okBtn = modal.querySelector('#alert-modal-ok-btn');

        return { element: modal, titleEl, messageEl, okBtn };
    }

    /**
     * 创建 Confirm Modal
     */
    static _createConfirmModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full hidden z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="relative mx-auto p-5 border w-full max-w-sm shadow-lg rounded-md bg-white">
                <h3 class="text-lg font-bold text-gray-900" id="confirm-modal-title"></h3>
                <div class="mt-2 py-3">
                    <p class="text-sm text-gray-500" id="confirm-modal-message"></p>
                </div>
                <div class="mt-4 flex justify-end space-x-2">
                    <button id="confirm-modal-cancel-btn" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">取消</button>
                    <button id="confirm-modal-confirm-btn" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">确定</button>
                </div>
            </div>
        `;

        const titleEl = modal.querySelector('#confirm-modal-title');
        const messageEl = modal.querySelector('#confirm-modal-message');
        const confirmBtn = modal.querySelector('#confirm-modal-confirm-btn');
        const cancelBtn = modal.querySelector('#confirm-modal-cancel-btn');

        return { element: modal, titleEl, messageEl, confirmBtn, cancelBtn };
    }

    /**
     * 创建 Loading Modal
     */
    static _createLoadingModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full hidden z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="relative mx-auto p-5 border w-full max-w-sm shadow-lg rounded-md bg-white">
                <h3 class="text-lg font-bold text-gray-900" id="loading-modal-title"></h3>
                <div class="mt-2 py-3">
                    <p class="text-sm text-gray-500" id="loading-modal-message"></p>
                </div>
            </div>
        `;

        const titleEl = modal.querySelector('#loading-modal-title');
        const messageEl = modal.querySelector('#loading-modal-message');

        return { element: modal, titleEl, messageEl };
    }

    /**
     * 显示 Alert 弹窗
     * @param {string} message - 消息内容
     * @param {string} title - 标题
     * @param {function} callback - 确认后的回调
     */
    static showAlert(message, title = '提示', callback) {
        this.init();

        this.alertModal.titleEl.textContent = title;
        this.alertModal.messageEl.innerHTML = message;
        this.alertModal.okBtn.onclick = () => {
            this.alertModal.element.classList.add('hidden');
            if (callback) callback();
        };
        this.alertModal.element.classList.remove('hidden');
    }

    /**
     * 显示 Confirm 弹窗
     * @param {string} message - 消息内容
     * @param {string} title - 标题
     * @param {function} callback - 回调函数，参数为 true(确认) 或 false(取消)
     */
    static showConfirm(message, title = '确认操作', callback) {
        this.init();

        this.confirmModal.titleEl.textContent = title;
        this.confirmModal.messageEl.innerHTML = message;
        this.confirmModal.confirmBtn.onclick = () => {
            this.confirmModal.element.classList.add('hidden');
            if (callback) callback(true);
        };
        this.confirmModal.cancelBtn.onclick = () => {
            this.confirmModal.element.classList.add('hidden');
            if (callback) callback(false);
        };
        this.confirmModal.element.classList.remove('hidden');
    }

    /**
     * 显示 Loading 弹窗
     * @param {string} message - 消息内容
     * @param {string} title - 标题
     * @returns {object} 包含 close 方法的对象
     */
    static showLoading(message, title = '请稍候') {
        this.init();

        this.loadingModal.titleEl.textContent = title;
        this.loadingModal.messageEl.innerHTML = message;
        this.loadingModal.element.classList.remove('hidden');

        return {
            close: () => {
                this.loadingModal.element.classList.add('hidden');
            }
        };
    }
}


// ============================================
// 3. 格式化工具
// ============================================

export class Formatters {
    /**
     * 格式化金额
     * @param {number} num - 数值
     * @returns {string} 格式化后的金额字符串
     */
    static currency(num) {
        return `¥ ${(Number(num) || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }

    /**
     * 格式化百分比
     * @param {number} num - 数值
     * @param {number} decimals - 小数位数，默认2位
     * @returns {string} 格式化后的百分比字符串
     */
    static percent(num, decimals = 2) {
        return `${(Number(num) || 0).toFixed(decimals)}%`;
    }

    /**
     * [增强] 格式化日期，支持自定义格式
     * @param {string|Date} dateInput - 日期
     * @param {string} formatStr - 格式 (YYYY-MM-DD, MM.DD, zh-CN)
     * @returns {string} 格式化后的日期字符串
     */
    static date(dateInput, formatStr = 'YYYY-MM-DD') {
        if (!dateInput) return 'N/A';
        
        let d;
        if (dateInput instanceof Date) {
            d = dateInput;
        } else {
            // 尝试解析 YYYY-MM-DD 字符串，避免时区问题
            // 2025-10-26T00:00:00Z 这样的 ISO 字符串会被正确解析为 UTC
            // 2025-10-26 这样的字符串会被解析为本地时区的 00:00
            const parts = String(dateInput).split('T')[0].split('-');
            if (parts.length === 3) {
                // 创建一个本地时区的日期
                d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            } else {
                d = new Date(dateInput); // 回退到标准解析
            }
        }

        if (isNaN(d.getTime())) return 'N/A';

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');

        switch (formatStr) {
            case 'YYYY-MM-DD':
                return `${year}-${month}-${day}`;
            case 'MM.DD':
                return `${month}.${day}`;
            case 'zh-CN':
                return d.toLocaleDateString('zh-CN');
            default:
                return `${year}-${month}-${day}`;
        }
    }


    /**
     * 格式化数字 (千分位)
     * @param {number} num - 数值
     * @returns {string} 格式化后的数字字符串
     */
    static number(num) {
        return (Number(num) || 0).toLocaleString();
    }

    /**
     * 格式化文件大小
     * @param {number} bytes - 字节数
     * @returns {string} 格式化后的文件大小字符串
     */
    static fileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }
}


// ============================================
// 4. 分页组件
// ============================================

export class PaginationComponent {
    /**
     * 渲染分页控件
     * @param {HTMLElement} container - 容器元素
     * @param {number} currentPage - 当前页码
     * @param {number} totalItems - 总条目数
     * @param {number} itemsPerPage - 每页条目数
     * @param {function} onPageChange - 页码变化回调
     */
    static render(container, currentPage, totalItems, itemsPerPage, onPageChange) {
        if (!container) return;

        const totalPages = Math.ceil(totalItems / itemsPerPage);

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        const startItem = (currentPage - 1) * itemsPerPage + 1;
        const endItem = Math.min(currentPage * itemsPerPage, totalItems);

        let html = `
            <div class="flex items-center justify-between">
                <div class="text-sm text-gray-700">
                    显示 <span class="font-medium">${startItem}</span> 到 <span class="font-medium">${endItem}</span> 条，
                    共 <span class="font-medium">${totalItems}</span> 条
                </div>
                <div class="flex items-center space-x-2">
        `;

        // 上一页按钮
        html += `
            <button class="pagination-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>
                上一页
            </button>
        `;

        // 页码按钮
        const pageNumbers = this._getPageNumbers(currentPage, totalPages);
        pageNumbers.forEach(pageNum => {
            if (pageNum === '...') {
                html += `<span class="px-2 text-gray-500">...</span>`;
            } else {
                html += `
                    <button class="pagination-btn ${pageNum === currentPage ? 'active' : ''}" data-page="${pageNum}">
                        ${pageNum}
                    </button>
                `;
            }
        });

        // 下一页按钮
        html += `
            <button class="pagination-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>
                下一页
            </button>
        `;

        html += `
                </div>
            </div>
        `;

        container.innerHTML = html;

        // 绑定事件
        container.querySelectorAll('.pagination-btn[data-page]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // [修复] 确保回调被正确调用
                const target = e.currentTarget; // 使用 currentTarget 避免点到 svg 等子元素
                if (target.disabled) return;
                const page = parseInt(target.dataset.page);
                if (page >= 1 && page <= totalPages && page !== currentPage) {
                    onPageChange(page);
                }
            });
        });
    }

    /**
     * 计算要显示的页码数组
     * @param {number} current - 当前页
     * @param {number} total - 总页数
     * @returns {Array} 页码数组
     */
    static _getPageNumbers(current, total) {
        const delta = 2; // 当前页前后显示的页码数
        const range = [];
        const rangeWithDots = [];

        for (let i = 1; i <= total; i++) {
            if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
                range.push(i);
            }
        }

        let prev = 0;
        for (const i of range) {
            if (prev && i - prev > 1) {
                rangeWithDots.push('...');
            }
            rangeWithDots.push(i);
            prev = i;
        }

        return rangeWithDots;
    }
}


// ============================================
// 5. 通用工具函数
// ============================================

export class Utils {
    /**
     * 防抖函数
     * @param {function} func - 要防抖的函数
     * @param {number} wait - 等待时间(毫秒)
     * @returns {function} 防抖后的函数
     */
    static debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * 节流函数
     * @param {function} func - 要节流的函数
     * @param {number} limit - 时间限制(毫秒)
     * @returns {function} 节流后的函数
     */
    static throttle(func, limit = 300) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * 深拷贝对象
     * @param {object} obj - 要拷贝的对象
     * @returns {object} 拷贝后的对象
     */
    static deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * 生成唯一ID
     * @returns {string} 唯一ID
     */
    static generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 延迟执行
     * @param {number} ms - 延迟时间(毫秒)
     * @returns {Promise}
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 下载文件
     * @param {string} url - 文件URL
     * @param {string} filename - 文件名
     */
    static downloadFile(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * 从URL获取查询参数
     * @param {string} param - 参数名
     * @returns {string|null} 参数值
     */
    static getUrlParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    /**
     * 更新URL参数(不刷新页面)
     * @param {object} params - 参数对象
     */
    static updateUrlParams(params) {
        const url = new URL(window.location);
        Object.keys(params).forEach(key => {
            if (params[key] === null || params[key] === undefined) {
                url.searchParams.delete(key);
            } else {
                url.searchParams.set(key, params[key]);
            }
        });
        window.history.replaceState({}, '', url);
    }

    /**
     * [新增] 计算两个日期之间的天数（忽略时间）
     * @param {Date|string} date1 - 开始日期
     * @param {Date|string} date2 - 结束日期
     * @returns {number} 两个日期之间的天数
     */
    static daysBetween(date1, date2) {
        if (!date1 || !date2) return 0;
        
        const d1 = (date1 instanceof Date) ? date1 : new Date(date1.split('T')[0]); // 修复时区问题
        const d2 = (date2 instanceof Date) ? date2 : new Date(date2.split('T')[0]); // 修复时区问题

        if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;

        // 确保比较的是日期，忽略时间
        const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
        const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());

        return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
    }
}


// ============================================
// 6. 导出便捷访问对象
// ============================================

export const AppCore = {
    API: new APIService(), // [修改] 导出一个单例
    APIService,
    Modal: ModalManager,
    Format: Formatters,
    Pagination: PaginationComponent,
    Utils
};

// 默认导出
export default AppCore;

