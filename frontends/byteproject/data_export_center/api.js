/**
 * @module api
 * @description API请求封装模块
 */

import { showToast } from './utils.js';

/**
 * 发送API请求的通用方法
 * @param {string} endpoint - API端点URL
 * @param {Object} options - 请求选项
 * @param {string} [options.method='POST'] - HTTP请求方法
 * @param {Object} [options.body=null] - 请求体数据
 * @param {Object} [options.headers={}] - 额外的请求头
 * @returns {Promise<Object>} API响应数据
 * @throws {Error} 当请求失败时抛出错误
 */
export async function apiRequest(endpoint, options = {}) {
    const {
        method = 'POST',
        body = null,
        headers = {}
    } = options;

    const requestOptions = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        }
    };

    if (body) {
        requestOptions.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(endpoint, requestOptions);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                message: `HTTP error! status: ${response.status}`
            }));
            throw new Error(errorData.message || 'Unknown API error');
        }

        // 处理无内容响应
        if (response.status === 204) {
            return { success: true, data: null };
        }

        const result = await response.json();

        // 检查业务逻辑错误
        if (result.success === false) {
            throw new Error(result.message || 'API returned an error');
        }

        return result;
    } catch (error) {
        console.error(`API request error for ${method} ${endpoint}:`, error);
        showToast(`操作失败: ${error.message}`, false);
        throw error;
    }
}

/**
 * GET请求的便捷方法
 * @param {string} endpoint - API端点URL
 * @param {Object} [headers={}] - 额外的请求头
 * @returns {Promise<Object>} API响应数据
 */
export async function getRequest(endpoint, headers = {}) {
    return apiRequest(endpoint, { method: 'GET', headers });
}

/**
 * POST请求的便捷方法
 * @param {string} endpoint - API端点URL
 * @param {Object} body - 请求体数据
 * @param {Object} [headers={}] - 额外的请求头
 * @returns {Promise<Object>} API响应数据
 */
export async function postRequest(endpoint, body, headers = {}) {
    return apiRequest(endpoint, { method: 'POST', body, headers });
}