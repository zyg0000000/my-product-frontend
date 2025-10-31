/**
 * modal-batch.js - 批量操作 Modal 模块
 * 基于 talent_pool.js v6.2.1
 *
 * 包含功能：
 * 1. 批量更新达人 (Batch Update) - 勾选/筛选范围
 * 2. 批量导入新达人 (Bulk Import) - Excel导入
 * 3. 导入更新现有达人 (Import for Update) - Excel更新
 * 4. 导出模板功能
 */

export class BatchModal {
    constructor(app) {
        this.app = app;
        this.elements = {};
    }

    init() {
        this.cacheElements();
        this.bindEvents();
    }

    cacheElements() {
        this.elements = {
            // 批量更新 Modal
            batchUpdateModal: document.getElementById('batch-update-modal'),
            closeBatchUpdateBtn: document.getElementById('close-batch-update-modal-btn'),
            batchUpdateForm: document.getElementById('batch-update-form'),
            batchUpdateSummary: document.getElementById('batch-update-summary'),
            batchUpdateFieldSelect: document.getElementById('batch-update-field-select'),
            batchUpdateValueContainer: document.getElementById('batch-update-value-container'),

            // 批量导入 Modal
            bulkImportModal: document.getElementById('bulk-import-modal'),
            closeBulkImportBtn: document.getElementById('close-bulk-import-modal-btn'),
            bulkImportFileInput: document.getElementById('bulk-import-file-input'),
            bulkImportFileName: document.getElementById('bulk-import-file-name'),
            confirmBulkImportBtn: document.getElementById('confirm-bulk-import-btn'),

            // 导入更新 Modal
            importForUpdateModal: document.getElementById('import-for-update-modal'),
            closeImportForUpdateBtn: document.getElementById('close-import-for-update-modal-btn'),
            importForUpdateFileInput: document.getElementById('import-for-update-file-input'),
            importForUpdateFileName: document.getElementById('import-for-update-file-name'),
            confirmImportForUpdateBtn: document.getElementById('confirm-import-for-update-btn')
        };
    }

    bindEvents() {
        // 批量更新 Modal
        this.elements.closeBatchUpdateBtn?.addEventListener('click', () => this.closeBatchUpdate());
        this.elements.batchUpdateModal?.addEventListener('click', (e) => {
            if (e.target === this.elements.batchUpdateModal) this.closeBatchUpdate();
        });
        this.elements.batchUpdateForm?.addEventListener('submit', (e) => this.handleBatchUpdateSubmit(e));
        this.elements.batchUpdateFieldSelect?.addEventListener('change', () => this.renderBatchUpdateValueInput());

        // 监听范围选择变化
        const scopeRadios = document.querySelectorAll('input[name="update-scope"]');
        scopeRadios.forEach(radio => {
            radio.addEventListener('change', () => this.updateBatchUpdateSummary());
        });

        // 批量导入 Modal
        this.elements.closeBulkImportBtn?.addEventListener('click', () => this.closeBulkImport());
        this.elements.bulkImportModal?.addEventListener('click', (e) => {
            if (e.target === this.elements.bulkImportModal) this.closeBulkImport();
        });
        this.elements.bulkImportFileInput?.addEventListener('change', (e) => {
            const fileName = e.target.files[0]?.name || '未选择任何文件';
            if (this.elements.bulkImportFileName) {
                this.elements.bulkImportFileName.textContent = fileName;
            }
        });
        this.elements.confirmBulkImportBtn?.addEventListener('click', () => this.handleBulkImportSubmit());

        // 导入更新 Modal
        this.elements.closeImportForUpdateBtn?.addEventListener('click', () => this.closeImportForUpdate());
        this.elements.importForUpdateModal?.addEventListener('click', (e) => {
            if (e.target === this.elements.importForUpdateModal) this.closeImportForUpdate();
        });
        this.elements.importForUpdateFileInput?.addEventListener('change', (e) => {
            const fileName = e.target.files[0]?.name || '未选择任何文件';
            if (this.elements.importForUpdateFileName) {
                this.elements.importForUpdateFileName.textContent = fileName;
            }
        });
        this.elements.confirmImportForUpdateBtn?.addEventListener('click', () => this.handleImportForUpdateSubmit());
    }

    // ========== 批量更新 Modal ==========

    openBatchUpdate() {
        const radioSelected = document.getElementById('update-scope-selected');
        const radioAll = document.getElementById('update-scope-all');

        if (radioSelected) {
            radioSelected.disabled = this.app.selectedTalents.size === 0;
            if (this.app.selectedTalents.size === 0) {
                radioAll.checked = true;
            } else {
                radioSelected.checked = true;
            }
        }

        this.updateBatchUpdateSummary();
        this.renderBatchUpdateValueInput();
        if (this.elements.batchUpdateModal) {
            this.elements.batchUpdateModal.classList.remove('hidden');
        }
    }

    closeBatchUpdate() {
        if (this.elements.batchUpdateModal) {
            this.elements.batchUpdateModal.classList.add('hidden');
        }
    }

    updateBatchUpdateSummary() {
        const scope = document.querySelector('input[name="update-scope"]:checked')?.value;
        if (!this.elements.batchUpdateSummary) return;

        if (scope === 'selected') {
            this.elements.batchUpdateSummary.textContent = `您即将对 ${this.app.selectedTalents.size} 位已勾选的达人进行批量更新。`;
        } else {
            this.elements.batchUpdateSummary.textContent = `您即将对筛选出的 ${this.app.totalFilteredItems} 位达人进行批量更新。`;
        }
    }

    renderBatchUpdateValueInput() {
        if (!this.elements.batchUpdateFieldSelect || !this.elements.batchUpdateValueContainer) return;

        const field = this.elements.batchUpdateFieldSelect.value;
        let inputHtml = '';

        switch (field) {
            case 'talentTier':
                const tierOptions = Array.from(this.app.talentTiers).map(tier =>
                    '<option value="' + tier + '">' + tier + '</option>'
                ).join('');
                inputHtml = '<select name="value" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">' + tierOptions + '</select>';
                break;
            case 'talentSource':
                inputHtml = '<select name="value" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"><option value="野生达人">野生达人</option><option value="机构达人">机构达人</option></select>';
                break;
            case 'talentType':
                inputHtml = '<input type="text" name="value" placeholder="输入新标签, 多个用英文逗号隔开" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">';
                break;
        }

        this.elements.batchUpdateValueContainer.innerHTML = inputHtml;
    }

    async handleBatchUpdateSubmit(e) {
        e.preventDefault();

        const scope = document.querySelector('input[name="update-scope"]:checked')?.value;
        const formData = new FormData(this.elements.batchUpdateForm);
        const field = formData.get('field');
        let value = formData.get('value');

        if (!value && field !== 'talentType') {
            this.app.showToast('更新值不能为空。', true);
            return;
        }

        if (scope === 'selected') {
            await this.handleBatchUpdateForSelected(field, value);
        } else {
            await this.handleBatchUpdateForFiltered(field, value);
        }
    }

    async handleBatchUpdateForFiltered(field, value) {
        const confirmText = `您确定要将 ${this.app.totalFilteredItems} 位筛选出的达人 "${field}" 字段更新为 "${value}" 吗？`;

        this.app.openConfirmModal(confirmText, async () => {
            try {
                let updateValue = value;
                if (field === 'talentType') {
                    updateValue = value.split(/,|，/).map(t => t.trim()).filter(Boolean);
                }

                const payload = {
                    filters: this.app.queryState,
                    updateData: { [field]: updateValue }
                };

                const result = await this.app.apiRequest(this.app.API_PATHS.batchUpdate, 'POST', payload);
                this.app.showToast(`批量更新成功！共更新 ${result.data.updated} 条记录。`);
                this.closeBatchUpdate();
                this.app.fetchTalents();
            } finally {
                this.app.closeConfirmModal();
            }
        });
    }

    async handleBatchUpdateForSelected(field, value) {
        if (this.app.selectedTalents.size === 0) {
            this.app.showToast('没有勾选任何达人。', true);
            return;
        }

        const confirmText = `您确定要将 ${this.app.selectedTalents.size} 位勾选的达人 "${field}" 更新为 "${value}" 吗？`;

        this.app.openConfirmModal(confirmText, async () => {
            try {
                const response = await this.app.apiRequest(this.app.API_PATHS.getByIds, 'POST', {
                    ids: Array.from(this.app.selectedTalents)
                });
                const talentsToUpdate = response.data;

                if (!talentsToUpdate || talentsToUpdate.length === 0) {
                    throw new Error("无法获取勾选达人的详细信息。");
                }

                const payload = {
                    updates: talentsToUpdate.map(talent => {
                        const updateData = { xingtuId: talent.xingtuId };
                        if (field === 'talentType') {
                            updateData[field] = value.split(/,|，/).map(t => t.trim()).filter(Boolean);
                        } else {
                            updateData[field] = value;
                        }
                        return updateData;
                    })
                };

                const result = await this.app.apiRequest(this.app.API_PATHS.bulkUpdate, 'PUT', payload);
                this.app.showToast(`批量修改操作完成！成功: ${result.data.updated}, 失败: ${result.data.failed}。`);
                this.closeBatchUpdate();
                this.app.fetchTalents();
            } finally {
                this.app.closeConfirmModal();
            }
        });
    }

    // ========== 批量导入 Modal ==========

    openBulkImport() {
        if (this.elements.bulkImportModal) {
            this.elements.bulkImportModal.classList.remove('hidden');
        }
        if (this.elements.bulkImportFileInput) {
            this.elements.bulkImportFileInput.value = '';
        }
        if (this.elements.bulkImportFileName) {
            this.elements.bulkImportFileName.textContent = '未选择任何文件';
        }
    }

    closeBulkImport() {
        if (this.elements.bulkImportModal) {
            this.elements.bulkImportModal.classList.add('hidden');
        }
    }

    async handleBulkImportSubmit() {
        if (!this.elements.bulkImportFileInput) return;

        const file = this.elements.bulkImportFileInput.files[0];
        if (!file) {
            this.app.showToast('请选择要导入的Excel文件。', true);
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                if (jsonData.length === 0) {
                    this.app.showToast("Excel文件为空或格式不正确。", true);
                    return;
                }

                this.app.showToast(`正在导入 ${jsonData.length} 条新达人数据...`);

                const result = await this.app.apiRequest(this.app.API_PATHS.bulkCreate, 'POST', jsonData);

                let message = `导入操作完成。\n成功创建: ${result.data.created} 条。`;
                if (result.data.failed > 0) {
                    message += `\n失败: ${result.data.failed} 条（星图ID可能已存在）。`;
                }

                this.app.showToast(message, result.data.failed > 0);
                this.closeBulkImport();
                await this.app.loadConfigurations();
                this.app.fetchTalents();
            } catch (error) {
                this.app.showToast("文件处理或导入失败，请检查文件格式和内容。", true);
            }
        };

        reader.readAsArrayBuffer(file);
    }

    // ========== 导入更新 Modal ==========

    openImportForUpdate() {
        if (this.elements.importForUpdateModal) {
            this.elements.importForUpdateModal.classList.remove('hidden');
        }
        if (this.elements.importForUpdateFileInput) {
            this.elements.importForUpdateFileInput.value = '';
        }
        if (this.elements.importForUpdateFileName) {
            this.elements.importForUpdateFileName.textContent = '未选择任何文件';
        }
    }

    closeImportForUpdate() {
        if (this.elements.importForUpdateModal) {
            this.elements.importForUpdateModal.classList.add('hidden');
        }
    }

    async handleImportForUpdateSubmit() {
        if (!this.elements.importForUpdateFileInput) return;

        const file = this.elements.importForUpdateFileInput.files[0];
        if (!file) {
            this.app.showToast('请选择要导入的Excel更新文件。', true);
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });

                if (jsonData.length === 0) {
                    this.app.showToast("Excel文件为空或格式不正确。", true);
                    return;
                }

                const payload = jsonData.map(row => {
                    if (!row.xingtuId) return null;

                    try {
                        if (row.rebates) row.rebates = JSON.parse(row.rebates);
                        if (row.prices) row.prices = JSON.parse(row.prices);
                        if (row.talentType && typeof row.talentType === 'string') {
                            row.talentType = row.talentType.split(',').map(t => t.trim()).filter(Boolean);
                        }
                    } catch (jsonError) {
                        console.error('Failed to parse JSON fields for row:', row, jsonError);
                    }

                    return row;
                }).filter(Boolean);

                this.app.showToast(`正在提交 ${payload.length} 条达人更新数据...`);

                const result = await this.app.apiRequest(this.app.API_PATHS.bulkUpdate, 'PUT', {
                    updates: payload
                });

                let message = `差异化更新操作完成。\n成功更新: ${result.data.updated} 条。`;
                if (result.data.failed > 0) {
                    message += `\n失败: ${result.data.failed} 条（星图ID可能不存在）。`;
                }

                this.app.showToast(message, result.data.failed > 0);
                this.closeImportForUpdate();
                this.app.fetchTalents();
            } catch (error) {
                this.app.showToast("文件处理或更新失败，请检查文件格式和内容。", true);
            }
        };

        reader.readAsArrayBuffer(file);
    }

    // ========== 导出功能 ==========

    handleDownloadTemplate() {
        const sampleData = [{
            nickname: '示例达人',
            xingtuId: '1234567890 (必填)',
            uid: '0987654321',
            talentType: '美妆,剧情',
            talentSource: '机构达人',
            talentTier: '头部达人',
        }];

        const worksheet = XLSX.utils.json_to_sheet(sampleData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "新达人导入模板");
        XLSX.writeFile(workbook, "新达人导入模板.xlsx");
        this.app.showToast('模板已开始下载。');
    }

    async handleExportAll(e) {
        e.preventDefault();
        this.app.showToast('正在准备导出全量达人基础模板...');

        try {
            const response = await this.app.apiRequest(this.app.API_PATHS.exportAll, 'GET');
            const talentsToExport = response.data;

            if (!talentsToExport || talentsToExport.length === 0) {
                this.app.showToast('没有可导出的达人数据。', true);
                return;
            }

            const dataForSheet = talentsToExport.map(t => ({
                xingtuId: t.xingtuId,
                nickname: t.nickname,
                uid: t.uid || '',
                talentType: (t.talentType || []).join(','),
                talentSource: t.talentSource || '',
                talentTier: t.talentTier || ''
            }));

            const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "全量达人基础模板");
            XLSX.writeFile(workbook, `全量达人基础模板-${new Date().toISOString().slice(0,10)}.xlsx`);
            this.app.showToast(`已成功导出 ${talentsToExport.length} 位达人的基础信息。`);
        } catch (error) {
            this.app.showToast('导出失败，无法获取达人数据。', true);
        }
    }

    async handleExportForUpdate() {
        if (this.app.selectedTalents.size === 0) {
            this.app.showToast("请先勾选需要导出的达人。", true);
            return;
        }

        this.app.showToast(`正在准备导出 ${this.app.selectedTalents.size} 位达人的数据...`);

        try {
            const response = await this.app.apiRequest(this.app.API_PATHS.getByIds, 'POST', {
                ids: Array.from(this.app.selectedTalents)
            });
            const talentsToExport = response.data;

            const dataForSheet = talentsToExport.map(t => ({
                xingtuId: t.xingtuId,
                nickname: t.nickname,
                uid: t.uid || '',
                talentType: (t.talentType || []).join(','),
                talentSource: t.talentSource || '',
                talentTier: t.talentTier || '',
                rebates: JSON.stringify(t.rebates || []),
                prices: JSON.stringify(t.prices || [])
            }));

            const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "达人更新模板");
            XLSX.writeFile(workbook, `达人差异化更新模板-${new Date().toISOString().slice(0,10)}.xlsx`);
            this.app.showToast(`已成功导出 ${talentsToExport.length} 位达人的更新模板。`);
        } catch (error) {
            this.app.showToast('导出失败，无法获取最新的达人数据。', true);
        }
    }
}
