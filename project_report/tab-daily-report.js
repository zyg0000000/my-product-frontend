/**
 * @file tab-daily-report.js
 * @description 日报 Tab 模块
 * @version 1.0.0
 *
 * 职责:
 * - 加载日报数据
 * - 渲染KPI统计看板
 * - 渲染分类详情表格
 * - 处理"后续解决方案"输入
 * - 显示数据录入提醒
 */

import { AppCore } from '../common/app-core.js';
import { API_ENDPOINTS } from './constants.js';
import { ReportUtils } from './utils.js';

const { API, Modal, Format } = AppCore;

export class DailyReportTab {
    constructor(app, projectId, project) {
        this.app = app;
        this.projectId = projectId;
        this.project = project;

        // 防抖定时器
        this.solutionSaveTimer = null;

        // DOM 元素
        this.elements = {
            reportDatePicker: document.getElementById('report-date-picker'),
            overviewKPIs: document.getElementById('overview-kpis'),
            detailsContainer: document.getElementById('details-container'),
            missingDataAlertContainer: document.getElementById('missing-data-alert-container')
        };
    }

    /**
     * 加载日报数据
     * @param {string} date - 日期（可选，默认使用 reportDatePicker 的值）
     */
    async load(date) {
        const reportDate = date || this.elements.reportDatePicker.value;

        if (!this.elements.overviewKPIs || !this.elements.detailsContainer) {
            console.error('日报Tab DOM元素未找到');
            return;
        }

        this.elements.overviewKPIs.innerHTML = '<div class="text-center py-8 text-gray-500 col-span-5">加载中...</div>';
        this.elements.detailsContainer.innerHTML = `<div class="text-center py-16 text-gray-500">正在加载报告详情...</div>`;
        this.elements.missingDataAlertContainer.innerHTML = '';

        try {
            const apiUrl = `${API_ENDPOINTS.REPORT}?projectId=${this.projectId}&date=${reportDate}`;
            const response = await API.request(apiUrl);
            this.renderReport(response.data, reportDate);
        } catch(e) {
            this.elements.overviewKPIs.innerHTML = `<div class="text-center py-8 text-red-500 col-span-5">加载总览失败: ${e.message}</div>`;
            this.elements.detailsContainer.innerHTML = `<div class="text-center py-16 text-red-500">加载详情失败: ${e.message}</div>`;
        }
    }

    /**
     * 渲染日报数据
     * @param {object} data - 日报数据
     * @param {string} reportDate - 报告日期
     */
    renderReport(data, reportDate) {
        if (!data) {
            this.elements.overviewKPIs.innerHTML = '<div class="text-center py-8 text-gray-500 col-span-5">暂无数据</div>';
            this.elements.detailsContainer.innerHTML = '<div class="text-center py-16 text-gray-500">暂无报告详情</div>';
            return;
        }

        // 调试日志
        console.group('📊 项目日报数据调试');
        console.log('🗓️  选择的日期:', reportDate);
        console.log('📦 后端返回的完整数据:', data);
        console.groupEnd();

        this.renderOverviewKPIs(data.overview);
        this.renderMissingDataAlert(data.missingDataVideos, reportDate);
        this.renderDetails(data.details);
    }

    /**
     * 渲染KPI统计看板
     * @param {object} overview - 概览数据
     */
    renderOverviewKPIs(overview = {}) {
        const kpis = [
            {
                label: '定档内容数量',
                value: overview.totalTalents || 0,
                color: 'text-gray-900',
                icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>'
            },
            {
                label: '已发布视频数量',
                value: overview.publishedVideos || 0,
                color: 'text-gray-900',
                icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
            },
            {
                label: '总计金额',
                value: Format.currency(overview.totalAmount),
                color: 'text-green-600',
                icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
            },
            {
                label: '视频总曝光',
                value: Format.number(overview.totalViews),
                color: 'text-blue-600',
                icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>'
            },
            {
                label: '当前CPM',
                value: (overview.averageCPM || 0).toFixed(1),
                color: 'text-purple-600',
                icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>'
            }
        ];

        this.elements.overviewKPIs.innerHTML = kpis.map(kpi => `
            <div class="bg-gradient-to-br from-gray-50 to-white p-5 rounded-xl text-center border border-gray-200 hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-default">
                <div class="flex justify-center mb-2 ${kpi.color}">
                    ${kpi.icon}
                </div>
                <dt class="text-sm font-medium text-gray-600">${kpi.label}</dt>
                <dd class="mt-2 text-3xl font-bold ${kpi.color}">${kpi.value}</dd>
            </div>
        `).join('');
    }

    /**
     * 渲染数据录入提醒
     * @param {Array} missingDataVideos - 缺少数据的视频列表
     * @param {string} selectedDate - 选择的日期
     */
    renderMissingDataAlert(missingDataVideos, selectedDate) {
        this.elements.missingDataAlertContainer.innerHTML = '';

        if (!missingDataVideos || missingDataVideos.length === 0) {
            return;
        }

        // 过滤掉当日发布的视频（当日发布的视频次日才能录入数据）
        const filteredMissingVideos = missingDataVideos.filter(video => {
            if (video.publishDate && video.publishDate === selectedDate) {
                return false; // 过滤掉
            }
            return true; // 保留
        });

        if (filteredMissingVideos.length === 0) {
            return;
        }

        const missingVideosList = filteredMissingVideos.map(v => `<span class="font-semibold">${v.talentName}</span>`).join('、');

        this.elements.missingDataAlertContainer.innerHTML = `
            <div class="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-lg mb-8 shadow">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <svg class="h-6 w-6 text-orange-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fill-rule="evenodd" d="M8.257 3.099c.636-1.026 2.252-1.026 2.888 0l6.252 10.086c.636 1.026-.174 2.315-1.444 2.315H3.449c-1.27 0-2.08-1.289-1.444-2.315L8.257 3.099zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <div class="ml-3 flex-1 md:flex md:justify-between">
                        <p class="text-sm text-orange-700">
                            <strong>数据录入提醒：</strong> 共 ${filteredMissingVideos.length} 条已发布视频缺少当日数据 (${missingVideosList})。
                        </p>
                        <p class="mt-3 text-sm md:mt-0 md:ml-6">
                            <button id="go-to-entry-btn" class="whitespace-nowrap font-semibold text-white bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-lg transition-all shadow hover:shadow-lg transform hover:scale-105">
                                立即录入 →
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        `;

        // 绑定"立即录入"按钮事件
        const goToEntryBtn = document.getElementById('go-to-entry-btn');
        if (goToEntryBtn) {
            goToEntryBtn.addEventListener('click', () => {
                // 触发 CustomEvent 通知主控制器切换Tab
                document.dispatchEvent(new CustomEvent('switchToDataEntry'));
            });
        }
    }

    /**
     * 渲染分类详情
     * @param {object} details - 详情数据
     */
    renderDetails(details = {}) {
        const sectionConfig = {
            hotVideos: {
                title: '视频播放量大于1000万的达人',
                icon: '<svg class="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.362-1.44m0 0a8.25 8.25 0 00-3.362-1.44m3.362 1.44a8.983 8.983 0 013.362 1.44m-3.362-1.44a8.25 8.25 0 00-3.362 1.44" /></svg>'
            },
            goodVideos: {
                title: '符合预期CPM小于20',
                icon: '<svg class="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>'
            },
            normalVideos: {
                title: '暂不符合预期 CPM 大于20，小于40',
                icon: '<svg class="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>'
            },
            badVideos: {
                title: '不符合预期CPM大于40小于100',
                icon: '<svg class="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>'
            },
            worstVideos: {
                title: '极度不符合预期CPM大于100',
                icon: '<svg class="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>'
            }
        };

        const cpmChangeHtml = (change) => {
            if (change === null) return 'N/A';
            const color = change < 0 ? 'text-green-600' : 'text-red-600';
            const icon = change < 0
                ? '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19.5v-15m0 0l-6.75 6.75M12 4.5l6.75 6.75" /></svg>'
                : '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75" /></svg>';
            return `<span class="${color} flex items-center gap-1">${icon} ${change.toFixed(1)}</span>`;
        };

        this.elements.detailsContainer.innerHTML = Object.keys(sectionConfig)
            .filter(key => details[key] && details[key].length > 0)
            .map(key => {
                const videos = details[key];
                const sectionInfo = sectionConfig[key];

                return `
                    <div class="mb-8">
                        <h3 class="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-3">${sectionInfo.icon} ${sectionInfo.title}，共 ${videos.length} 条</h3>
                        <div class="border rounded-lg overflow-hidden shadow-md">
                            <table class="w-full text-sm">
                                <thead class="bg-gray-100 text-left">
                                    <tr>
                                        <th class="px-6 py-3 font-semibold text-gray-600">达人名称</th>
                                        <th class="px-6 py-3 font-semibold text-gray-600">发布时间</th>
                                        <th class="px-6 py-3 font-semibold text-gray-600">CPM</th>
                                        <th class="px-6 py-3 font-semibold text-gray-600">CPM环比前日</th>
                                        <th class="px-6 py-3 font-semibold text-gray-600 w-1/3">后续解决方案</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                    ${videos.map(video => `
                                        <tr class="hover:bg-indigo-50 transition-colors">
                                            <td class="px-6 py-4 font-medium text-gray-900">${video.talentName}</td>
                                            <td class="px-6 py-4 text-gray-500">${ReportUtils.formatDate(video.publishDate)}</td>
                                            <td class="px-6 py-4 font-semibold text-gray-800">${video.cpm.toFixed(1)}</td>
                                            <td class="px-6 py-4">${cpmChangeHtml(video.cpmChange)}</td>
                                            <td class="px-6 py-4 relative">
                                                <textarea
                                                    class="w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500 solution-textarea"
                                                    rows="1"
                                                    placeholder="输入解决方案..."
                                                    data-collaboration-id="${video.collaborationId}">${video.solution || ''}</textarea>
                                                <div class="absolute right-8 top-5 text-xs text-gray-400 hidden solution-feedback"></div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>`;
            }).join('');

        if (this.elements.detailsContainer.innerHTML.trim() === '') {
            this.elements.detailsContainer.innerHTML = '<div class="text-center py-16 text-gray-500">暂无报告详情</div>';
        } else {
            // 绑定解决方案输入事件
            this.setupSolutionInputHandlers();
        }
    }

    /**
     * 设置解决方案输入事件处理器
     */
    setupSolutionInputHandlers() {
        this.elements.detailsContainer.addEventListener('input', (e) => {
            if (e.target.classList.contains('solution-textarea')) {
                this.handleSolutionInput(e.target);
            }
        });
    }

    /**
     * 处理解决方案输入
     * @param {HTMLElement} textarea - 文本框元素
     */
    handleSolutionInput(textarea) {
        clearTimeout(this.solutionSaveTimer);
        const collabId = textarea.dataset.collaborationId;
        const solution = textarea.value;
        const feedbackEl = textarea.nextElementSibling;

        feedbackEl.innerHTML = `<span>保存中...</span>`;
        feedbackEl.classList.remove('hidden');

        this.solutionSaveTimer = setTimeout(async () => {
            try {
                const payload = {
                    collaborationId: collabId,
                    date: this.elements.reportDatePicker.value,
                    solution: solution
                };
                await API.request(API_ENDPOINTS.REPORT_SOLUTION, 'POST', payload);
                feedbackEl.innerHTML = `<span class="text-green-600">✓ 已保存</span>`;
                setTimeout(() => feedbackEl.classList.add('hidden'), 2000);
            } catch (e) {
                feedbackEl.innerHTML = `<span class="text-red-600">保存失败</span>`;
            }
        }, 1000);
    }

    /**
     * 更新数据（用于主控制器刷新）
     * @param {object} project - 项目数据
     */
    updateData(project) {
        this.project = project;
    }

    /**
     * 销毁Tab，清理资源
     */
    destroy() {
        clearTimeout(this.solutionSaveTimer);
    }
}
