/**
 * @file main.js
 * @description 达人档期管理主入口 - 协调所有模块
 * @version 2.0.0
 *
 * 功能:
 * - 达人档期管理
 * - 日历选择（支持单击和拖拽）
 * - 月度备注管理
 * - 达人搜索和分页
 */

import { APIManager } from './api-manager.js';
import { SearchPanel } from './search-panel.js';
import { TalentList } from './talent-list.js';
import { CalendarModal } from './calendar-modal.js';
import { RemarkManager } from './remark-manager.js';
import { AppCore } from '../common/app-core.js';

const { Modal } = AppCore;

class TalentSchedule {
    constructor() {
        // 缓存DOM元素
        this.elements = this.cacheElements();

        // 初始化各个模块
        this.apiManager = new APIManager();
        this.searchPanel = new SearchPanel(this.elements);
        this.talentList = new TalentList(this.elements);
        this.remarkManager = new RemarkManager(this.elements);
        this.calendarModal = new CalendarModal(this.elements, this.remarkManager);

        // 数据
        this.allTalents = [];
        this.talentCollaborationStats = {};

        // 绑定事件
        this.bindEvents();

        // 初始化
        this.init();
    }

    /**
     * 缓存DOM元素
     */
    cacheElements() {
        return {
            // 搜索
            talentSearchInput: document.getElementById('talent-search'),

            // 达人列表
            talentListContainer: document.getElementById('talent-list-container'),
            paginationControls: document.getElementById('pagination-controls'),
            noTalentsPrompt: document.getElementById('no-talents-prompt'),

            // 日历弹窗
            calendarModal: document.getElementById('calendar-modal'),
            calendarModalContent: document.getElementById('calendar-modal-content'),
            modalTalentName: document.getElementById('modal-talent-name').querySelector('b'),
            closeModalBtn: document.getElementById('close-modal-btn'),

            // 日历控制
            prevWeekBtn: document.getElementById('prev-week-btn'),
            nextWeekBtn: document.getElementById('next-week-btn'),
            backToTodayBtn: document.getElementById('back-to-today-btn'),
            currentDateRange: document.getElementById('current-date-range'),
            calendarGrid: document.getElementById('calendar-grid'),

            // 备注
            remarksSection: document.getElementById('remarks-section'),
            singleMonthRemark: document.getElementById('single-month-remark'),
            singleMonthLabel: document.getElementById('single-month-label'),
            singleMonthTextarea: document.getElementById('single-month-textarea'),
            multiMonthRemark: document.getElementById('multi-month-remark'),
            remarkTabs: document.getElementById('remark-tabs'),
            remarkTabPanels: document.getElementById('remark-tab-panels'),

            // 保存按钮
            saveScheduleBtn: document.getElementById('save-schedule-btn')
        };
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 搜索面板
        this.searchPanel.onSearch(() => {
            this.talentList.resetToFirstPage();
            this.renderPage();
        });

        // 达人列表
        this.talentList.onOpenCalendar((talentId) => {
            const talent = this.allTalents.find(t => t.id === talentId);
            if (talent) {
                this.calendarModal.open(talentId, talent);
            }
        });

        this.talentList.onPageChange(() => this.renderPage());

        // 日历弹窗
        this.calendarModal.onSave(async (talentId, data) => {
            await this.handleSaveSchedule(talentId, data);
        });

        // 备注管理器
        this.remarkManager.bindEvents();

        // 绑定所有模块的事件
        this.searchPanel.bindEvents();
        this.talentList.bindEvents();
        this.calendarModal.bindEvents();
    }

    /**
     * 初始化
     */
    async init() {
        await this.loadData();
        this.renderPage();
    }

    /**
     * 加载数据
     */
    async loadData() {
        try {
            // 并行加载达人和合作统计
            const [talents, stats] = await Promise.all([
                this.apiManager.loadTalents(),
                this.apiManager.loadCollaborationStats()
            ]);

            this.allTalents = talents;
            this.talentCollaborationStats = stats;
        } catch (error) {
            console.error('加载数据失败:', error);
        }
    }

    /**
     * 渲染页面
     */
    renderPage() {
        const filteredTalents = this.searchPanel.filterTalents(this.allTalents);
        this.talentList.render(filteredTalents, this.talentCollaborationStats);
    }

    /**
     * 处理保存档期
     * @param {string} talentId - 达人ID
     * @param {Object} data - 档期和备注数据
     */
    async handleSaveSchedule(talentId, data) {
        try {
            this.elements.saveScheduleBtn.disabled = true;
            this.elements.saveScheduleBtn.textContent = '保存中...';

            await this.apiManager.updateTalentSchedule(talentId, data);

            // 更新本地数据
            const talent = this.allTalents.find(t => t.id === talentId);
            if (talent) {
                talent.schedules = data.schedules;
                talent.remarks = data.remarks;
            }

            this.calendarModal.close();
            Modal.showAlert('档期保存成功！', '成功', () => {
                this.renderPage();
            });
        } catch (error) {
            console.error('保存档期失败:', error);
        } finally {
            this.elements.saveScheduleBtn.disabled = false;
            this.elements.saveScheduleBtn.textContent = '保存更改';
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new TalentSchedule();
});
