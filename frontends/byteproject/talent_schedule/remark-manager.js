/**
 * @file remark-manager.js
 * @description 备注管理模块 - 负责月度备注的显示和编辑
 */

export class RemarkManager {
    constructor(elements) {
        this.elements = elements;
        this.monthlyRemarks = {};
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 备注输入
        this.elements.remarksSection.addEventListener('input', (e) => {
            if (e.target.tagName === 'TEXTAREA') {
                this.monthlyRemarks[e.target.dataset.month] = e.target.value;
            }
        });

        // 标签页切换
        this.elements.remarkTabs.addEventListener('click', (e) => {
            const tab = e.target.closest('.remark-tab');
            if (!tab) return;

            this.elements.remarkTabs.querySelectorAll('.remark-tab').forEach(t =>
                t.classList.remove('active')
            );
            tab.classList.add('active');

            this.elements.remarkTabPanels.querySelectorAll('.remark-tab-panel').forEach(p =>
                p.classList.toggle('hidden', p.id !== tab.dataset.targetPanel)
            );
        });
    }

    /**
     * 加载备注数据
     * @param {Object} remarks - 备注对象（月份 -> 备注内容）
     */
    loadRemarks(remarks) {
        this.monthlyRemarks = JSON.parse(JSON.stringify(remarks));
    }

    /**
     * 获取当前备注数据
     * @returns {Object} 备注对象
     */
    getRemarks() {
        return this.monthlyRemarks;
    }

    /**
     * 渲染备注区域
     * @param {Array<string>} months - 可见月份列表（YYYY-MM格式）
     */
    render(months) {
        this.elements.singleMonthRemark.classList.add('hidden');
        this.elements.multiMonthRemark.classList.add('hidden');
        this.elements.remarkTabs.innerHTML = '';
        this.elements.remarkTabPanels.innerHTML = '';

        if (months.length === 1) {
            // 单月模式
            const month = months[0];
            this.elements.singleMonthRemark.classList.remove('hidden');
            this.elements.singleMonthLabel.textContent = `${month.replace('-', '年 ')}月 备注`;
            this.elements.singleMonthTextarea.value = this.monthlyRemarks[month] || '';
            this.elements.singleMonthTextarea.dataset.month = month;
        } else if (months.length > 1) {
            // 多月模式（标签页）
            this.elements.multiMonthRemark.classList.remove('hidden');
            months.sort().forEach((month, index) => {
                // 创建标签
                const tab = document.createElement('button');
                tab.className = `remark-tab ${index === 0 ? 'active' : ''}`;
                tab.textContent = `${month.replace('-', '年 ')}月`;
                tab.dataset.targetPanel = `panel-${month}`;
                this.elements.remarkTabs.appendChild(tab);

                // 创建内容面板
                const panel = document.createElement('div');
                panel.id = `panel-${month}`;
                panel.className = `remark-tab-panel ${index > 0 ? 'hidden' : ''}`;
                panel.innerHTML = `
                    <textarea rows="4" class="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                              data-month="${month}">${this.monthlyRemarks[month] || ''}</textarea>
                `;
                this.elements.remarkTabPanels.appendChild(panel);
            });
        }
    }
}
