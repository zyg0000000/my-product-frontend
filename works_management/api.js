/**
 * @file api.js
 * @description API request wrapper for works management
 */

import { API_BASE_URL } from './constants.js';
import { showConfirmModal } from './utils.js';

/**
 * Make API request with error handling
 * @param {string} endpoint - API endpoint path
 * @param {string} method - HTTP method (GET, POST, DELETE, etc.)
 * @param {Object} body - Request body for POST/PUT/DELETE requests
 * @returns {Promise<Object>} Response data
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
        showConfirmModal(`操作失败: ${error.message}`, '错误', true);
        throw error;
    }
}