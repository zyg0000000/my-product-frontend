/**
 * @file data-manager.js
 * @description 数据管理模块 - 负责项目和合作数据的加载、筛选和聚合
 */

import { AppCore } from '../common/app-core.js';
import { PROJECT_COLORS } from './utils.js';

const { API, Modal } = AppCore;

export class DataManager {
    constructor() {
        // 数据
        this.allProjects = []; // 所有项目简化数据
        this.selectedProjects = []; // 当前选中月份的项目详细数据
        this.allCollaborations = []; // 所有合作数据（聚合自多个项目）
        this.projectColorMap = new Map(); // 项目ID -> 颜色映射

        // 当前筛选条件
        this.selectedYear = new Date().getFullYear();
        this.selectedMonth = `M${new Date().getMonth() + 1}`;
    }

    /**
     * 加载所有项目（简化版）
     */
    async loadAllProjects() {
        try {
            const loading = Modal.showLoading('正在加载项目数据...');
            const response = await API.request('/projects');
            this.allProjects = response.data || [];
            loading.close();

            console.log(`加载了 ${this.allProjects.length} 个项目`);

            // 调试：打印前3个项目的详细信息
            if (this.allProjects.length > 0) {
                console.log('=== 项目数据样例（前3个）===');
                this.allProjects.slice(0, 3).forEach((p, i) => {
                    console.log(`项目${i + 1}:`, {
                        name: p.name,
                        financialYear: p.financialYear,
                        financialMonth: p.financialMonth,
                        yearType: typeof p.financialYear,
                        monthType: typeof p.financialMonth,
                        collaborationsCount: (p.collaborations || []).length
                    });
                });
            }
        } catch (error) {
            console.error('加载项目列表失败:', error);
            Modal.showAlert('加载项目列表失败');
        }
    }

    /**
     * 加载选中月份的项目详细数据
     * @param {string} year - 年份
     * @param {string} month - 月份 (M1-M12)
     * @returns {Object} { hasProjects: boolean }
     */
    async loadSelectedMonthProjects(year, month) {
        this.selectedYear = year;
        this.selectedMonth = month;

        console.log('=== 筛选条件 ===');
        console.log('选择的年份:', this.selectedYear, '类型:', typeof this.selectedYear);
        console.log('选择的月份:', this.selectedMonth, '类型:', typeof this.selectedMonth);

        // 前端筛选该月份的项目（使用 financialYear 和 financialMonth 字段）
        this.selectedProjects = this.allProjects.filter(p => {
            const yearMatch = p.financialYear === this.selectedYear;
            const monthMatch = p.financialMonth === this.selectedMonth;

            // 调试：打印不匹配的项目信息
            if (!yearMatch || !monthMatch) {
                console.log('未匹配项目:', p.name, {
                    项目年份: p.financialYear,
                    筛选年份: this.selectedYear,
                    年份匹配: yearMatch,
                    项目月份: p.financialMonth,
                    筛选月份: this.selectedMonth,
                    月份匹配: monthMatch
                });
            }

            return yearMatch && monthMatch;
        });

        console.log(`${this.selectedYear}年${this.selectedMonth}月有 ${this.selectedProjects.length} 个项目`);

        // 输出匹配项目信息用于调试
        this.selectedProjects.forEach(p => {
            console.log(`✓ 匹配项目：${p.name}, 年份：${p.financialYear}, 月份：${p.financialMonth}, 合作数：${(p.collaborations || []).length}`);
        });

        // 如果没有项目，返回false
        if (this.selectedProjects.length === 0) {
            return { hasProjects: false };
        }

        try {
            // 聚合所有合作数据
            this.aggregateCollaborations();

            // 分配项目颜色
            this.assignProjectColors();

            return { hasProjects: true };

        } catch (error) {
            console.error('处理项目数据失败:', error);
            Modal.showAlert('处理项目数据失败');
            return { hasProjects: false };
        }
    }

    /**
     * 聚合所有合作数据
     */
    aggregateCollaborations() {
        this.allCollaborations = [];

        this.selectedProjects.forEach(project => {
            const collaborations = project.collaborations || [];

            // 为每个合作添加项目信息
            collaborations.forEach(collab => {
                this.allCollaborations.push({
                    ...collab,
                    projectId: project.id,
                    projectName: project.name,
                    projectStatus: project.status,
                    projectYear: project.financialYear,
                    projectMonth: project.financialMonth
                });
            });
        });

        // 只保留"客户已定档"和"视频已发布"状态的合作
        this.allCollaborations = this.allCollaborations.filter(c =>
            c.status === '客户已定档' || c.status === '视频已发布'
        );

        console.log(`聚合了 ${this.allCollaborations.length} 个合作`);
    }

    /**
     * 分配项目颜色
     */
    assignProjectColors() {
        this.projectColorMap.clear();
        this.selectedProjects.forEach((project, index) => {
            const colorIndex = index % PROJECT_COLORS.length;
            this.projectColorMap.set(project.id, {
                color: PROJECT_COLORS[colorIndex],
                index: colorIndex
            });
        });
    }

    /**
     * 更新单个合作
     * @param {string} collabId - 合作ID
     * @param {Object} payload - 更新数据
     */
    async updateCollaboration(collabId, payload) {
        try {
            await API.request('/update-collaboration', 'PUT', {
                id: collabId,
                ...payload
            });
            return { success: true };
        } catch (error) {
            return { success: false, error };
        }
    }
}
