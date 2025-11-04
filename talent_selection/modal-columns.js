/**
 * @file talent_selection/modal-columns.js
 * @description 自定义列弹窗模块 - 使用 Sortable.js 实现拖拽排序
 */

export default class ColumnsModal {
    constructor(options) {
        this.allConfigurations = options.allConfigurations;
        this.visibleColumns = options.visibleColumns;
        this.VISIBLE_COLUMNS_KEY = options.VISIBLE_COLUMNS_KEY;

        // DOM Elements
        this.columnsModal = document.getElementById('columns-modal');
        this.availablePool = document.getElementById('ts-available-dimensions-pool');
        this.selectedList = document.getElementById('ts-selected-dimensions-list');
        this.selectedPlaceholder = document.getElementById('ts-selected-placeholder');
        this.closeColumnsModalBtn = document.getElementById('close-columns-modal-btn');
        this.saveColumnsBtn = document.getElementById('save-columns-btn');

        // State
        this.sortableInstance = null;

        // Bind methods
        this.open = this.open.bind(this);
        this.close = this.close.bind(this);
        this.handleSaveColumns = this.handleSaveColumns.bind(this);
        this.handleAddDimension = this.handleAddDimension.bind(this);
        this.handleRemoveDimension = this.handleRemoveDimension.bind(this);
    }

    setupEventListeners() {
        if (this.closeColumnsModalBtn) {
            this.closeColumnsModalBtn.addEventListener('click', this.close);
        }

        if (this.saveColumnsBtn) {
            this.saveColumnsBtn.addEventListener('click', this.handleSaveColumns);
        }

        // Event delegation for add/remove buttons
        if (this.columnsModal) {
            this.columnsModal.addEventListener('click', (e) => {
                if (e.target.classList.contains('add-dim-btn')) {
                    this.handleAddDimension(e);
                } else if (e.target.closest('.remove-dim-btn')) {
                    this.handleRemoveDimension(e);
                }
            });
        }
    }

    init() {
        this.setupEventListeners();
    }

    open() {
        if (!this.availablePool || !this.selectedList) return;

        this.availablePool.innerHTML = '';
        this.selectedList.innerHTML = '';

        const selectedDimensions = this.visibleColumns.filter(d => d.visible && !d.required);
        const availableDimensions = this.visibleColumns.filter(d => !d.visible && !d.required);

        // Render Available Pool
        if (availableDimensions.length > 0) {
            availableDimensions.forEach(d => {
                this.availablePool.innerHTML += `<div class="p-2 rounded-md bg-white border cursor-pointer hover:bg-blue-50 hover:border-blue-300 add-dim-btn text-sm" data-id="${d.id}">${d.name}</div>`;
            });
        } else {
            this.availablePool.innerHTML = `<p class="text-sm text-gray-400 text-center py-4">无更多可选维度</p>`;
        }

        // Render Selected List
        if (selectedDimensions.length > 0) {
            if (this.selectedPlaceholder) this.selectedPlaceholder.classList.add('hidden');
            selectedDimensions.forEach(d => {
                const item = document.createElement('div');
                item.className = 'flex items-center justify-between p-2 rounded-md bg-white border dimension-item';
                item.dataset.id = d.id;
                item.innerHTML = `
                    <div class="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-400 drag-handle" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        <span class="text-sm">${d.name}</span>
                    </div>
                    <button class="remove-dim-btn text-red-500 text-xl font-light leading-none" data-id="${d.id}">&times;</button>
                `;
                this.selectedList.appendChild(item);
            });
        } else {
            if (this.selectedPlaceholder) {
                this.selectedPlaceholder.classList.remove('hidden');
            }
        }

        // Initialize Sortable.js
        if (this.sortableInstance) {
            this.sortableInstance.destroy();
        }

        // Check if Sortable is available globally
        if (typeof Sortable !== 'undefined') {
            this.sortableInstance = new Sortable(this.selectedList, {
                animation: 150,
                handle: '.drag-handle',
                ghostClass: 'sortable-ghost',
            });
        }

        this.columnsModal.classList.remove('hidden');
    }

    close() {
        if (this.columnsModal) {
            this.columnsModal.classList.add('hidden');
        }
    }

    handleAddDimension(e) {
        const id = e.target.dataset.id;
        const dim = this.visibleColumns.find(d => d.id === id);
        if (dim) {
            dim.visible = true;
            this.open(); // Re-render the modal
        }
    }

    handleRemoveDimension(e) {
        const id = e.target.closest('.remove-dim-btn').dataset.id;
        const dim = this.visibleColumns.find(d => d.id === id);
        if (dim && !dim.required) {
            dim.visible = false;
            this.open(); // Re-render the modal
        }
    }

    handleSaveColumns() {
        const newOrderedIds = [...document.querySelectorAll('#ts-selected-dimensions-list .dimension-item')].map(el => el.dataset.id);

        const newDimensions = [];
        const addedIds = new Set();

        // First, add all required columns in their original order
        this.visibleColumns.forEach(dim => {
            if (dim.required) {
                newDimensions.push({ ...dim, visible: true });
                addedIds.add(dim.id);
            }
        });

        // Then, add user-selected items in their new order
        newOrderedIds.forEach(id => {
            const dim = this.visibleColumns.find(d => d.id === id);
            if (dim && !addedIds.has(dim.id)) {
                newDimensions.push({ ...dim, visible: true });
                addedIds.add(id);
            }
        });

        // Finally, add the rest of the unselected items
        this.visibleColumns.forEach(dim => {
            if (!addedIds.has(dim.id)) {
                newDimensions.push({ ...dim, visible: false });
            }
        });

        this.visibleColumns = newDimensions;

        // Save to localStorage
        const configToSave = this.visibleColumns.map(({ id, visible }) => ({ id, visible }));
        localStorage.setItem(this.VISIBLE_COLUMNS_KEY, JSON.stringify(configToSave));

        // Trigger event to update table
        document.dispatchEvent(new CustomEvent('columnsUpdated', {
            detail: { visibleColumns: this.visibleColumns }
        }));

        this.close();
    }
}
