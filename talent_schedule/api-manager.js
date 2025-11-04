/**
 * @file api-manager.js
 * @description API管理模块 - 负责所有API请求
 */

import { AppCore } from '../common/app-core.js';

const { Modal } = AppCore;

// API基础URL - 使用火山引擎API Gateway
const API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';

export class APIManager {
    /**
     * 通用API请求封装
     * @param {string} endpoint - API端点
     * @param {string} method - 请求方法
     * @param {Object} body - 请求体
     * @returns {Promise<any>} API响应数据
     */
    async apiRequest(endpoint, method = 'GET', body = null) {
        try {
            const options = { method, headers: { 'Content-Type': 'application/json' } };
            if (body) options.body = JSON.stringify(body);
            const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
            const data = await response.json();
            if (!response.ok) {
                Modal.showAlert(data.message || '请求失败', '错误');
                throw new Error(data.message || '请求失败');
            }
            return data;
        } catch (error) {
            console.error('API请求失败:', error);
            if (error.message !== '请求失败') {
                Modal.showAlert('网络错误，请稍后重试', '错误');
            }
            throw error;
        }
    }

    /**
     * 加载所有达人信息
     * @returns {Promise<Array>} 达人列表
     */
    async loadTalents() {
        const response = await this.apiRequest('/talents');
        return response.data || [];
    }

    /**
     * 更新达人档期信息
     * @param {string} talentId - 达人ID
     * @param {Object} updateData - 更新数据（包含schedules和remarks）
     * @returns {Promise<Object>} 更新结果
     */
    async updateTalentSchedule(talentId, updateData) {
        return await this.apiRequest(`/update-talent/${talentId}`, 'PUT', updateData);
    }

    /**
     * 预处理合作数据，生成统计信息
     * @param {Array} collaborations - 合作列表
     * @returns {Object} 达人ID到统计信息的映射
     */
    preprocessCollaborationData(collaborations) {
        const stats = {};
        collaborations.forEach(collab => {
            if (collab.status === '草稿' || !collab.talentId) return;
            if (!stats[collab.talentId]) {
                stats[collab.talentId] = { total: 0, published: 0 };
            }
            stats[collab.talentId].total++;
            if (collab.status === '视频已发布') {
                stats[collab.talentId].published++;
            }
        });
        return stats;
    }

    /**
     * 加载合作统计数据
     * @returns {Promise<Object>} 达人合作统计
     */
    async loadCollaborationStats() {
        const response = await this.apiRequest('/collaborations?allowGlobal=true&limit=9999');
        const collaborations = response.data || [];
        return this.preprocessCollaborationData(collaborations);
    }
}
