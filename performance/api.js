/**
 * api.js - API 请求封装模块
 * 统一处理所有 API 请求和错误处理
 */

import { API_BASE_URL } from './constants.js';
import { showCustomAlert } from './utils.js';

/**
 * 通用 API 请求函数
 * @param {string} endpoint - API 端点
 * @param {string} method - 请求方法
 * @param {Object} body - 请求体
 * @returns {Promise<Object>} 响应数据
 */
export async function apiRequest(endpoint, method = 'GET', body = null) {
    const url = `${API_BASE_URL}${endpoint}`;
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        return text ? JSON.parse(text) : {};
    } catch (error) {
        showCustomAlert(`操作失败: ${error.message}`);
        throw error;
    }
}

/**
 * 执行 API 请求并处理响应
 * @param {string} endpoint - API 端点
 * @param {string} method - 请求方法
 * @param {Object} body - 请求体
 * @param {Object} options - 选项配置
 * @returns {Promise<Object>} 响应数据
 */
export async function apiRequestWithHandler(endpoint, method = 'GET', body = null, options = {}) {
    const {
        showLoading = false,
        loadingMessage = '正在处理...',
        successMessage = null,
        errorMessage = null
    } = options;

    if (showLoading) {
        showCustomAlert(loadingMessage, '处理中');
    }

    try {
        const response = await apiRequest(endpoint, method, body);

        if (successMessage) {
            showCustomAlert(successMessage, '成功');
        }

        return response;
    } catch (error) {
        if (errorMessage) {
            showCustomAlert(errorMessage || `操作失败: ${error.message}`, '错误');
        }
        throw error;
    }
}