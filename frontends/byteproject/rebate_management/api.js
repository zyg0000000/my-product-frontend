/**
 * @file api.js
 * @description API 请求模块
 */

import { API_BASE_URL } from './constants.js';
import { showCustomAlert } from './utils.js';

/**
 * 通用 API 请求函数
 * @param {string} endpoint - API 端点路径
 * @param {string} method - HTTP 方法
 * @param {Object} body - 请求体数据
 * @returns {Promise<Object>} - API 响应数据
 */
export async function apiRequest(endpoint, method = 'GET', body = null) {
    const url = `${API_BASE_URL}${endpoint}`;
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (body) {
        options.body = JSON.stringify(body);
    }
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        return text ? JSON.parse(text) : {};
    } catch (error) {
        console.error(`API request failed: ${method} ${endpoint}`, error);
        showCustomAlert(`操作失败: ${error.message}`);
        throw error;
    }
}