/**
 * @file search-panel.js
 * @description 搜索面板模块 - 负责达人搜索和筛选功能
 */

export class SearchPanel {
    constructor(elements) {
        this.elements = elements;
        this.searchCallback = null;
    }

    /**
     * 绑定搜索事件
     */
    bindEvents() {
        this.elements.talentSearchInput.addEventListener('input', () => {
            if (this.searchCallback) {
                this.searchCallback();
            }
        });
    }

    /**
     * 设置搜索回调
     * @param {Function} callback - 搜索时的回调函数
     */
    onSearch(callback) {
        this.searchCallback = callback;
    }

    /**
     * 获取搜索关键词
     * @returns {string} 搜索关键词（小写）
     */
    getSearchQuery() {
        return this.elements.talentSearchInput.value.toLowerCase().trim();
    }

    /**
     * 过滤达人列表
     * @param {Array} talents - 完整达人列表
     * @returns {Array} 过滤后的达人列表
     */
    filterTalents(talents) {
        const query = this.getSearchQuery();
        if (!query) return talents;

        return talents.filter(talent =>
            (talent.nickname || '').toLowerCase().includes(query)
        );
    }
}
