/**
 * 返点对比看板 - 主页面
 * 公司返点库与 AgentWorks 返点对比管理
 */

import { useState, useCallback, useEffect } from 'react';
import { Button, Empty, Spin, message, Select } from 'antd';
import {
  UploadOutlined,
  SyncOutlined,
  SettingOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { PageTransition } from '../../../components/PageTransition';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';
import { useCompanyRebate } from './hooks';
import {
  ImportExcelModal,
  VersionSelector,
  VersionManagerModal,
  SummaryStats,
  ComparisonTable,
  SyncConfirmModal,
} from './components';
import type { Platform } from '../../../types/talent';
import type { ComparisonResult, ParsedExcelRecord } from './types';
import { batchSetIndependentRebate } from '../../../api/talent';

export function RebateComparison() {
  // 平台配置
  const { configs, loading: configLoading } = usePlatformConfig();

  // 平台选择 - 默认使用第一个启用的平台
  const [platform, setPlatform] = useState<Platform | null>(null);

  // 初始化平台选择
  useEffect(() => {
    if (!configLoading && configs.length > 0 && platform === null) {
      setPlatform(configs[0].platform);
    }
  }, [configLoading, configs, platform]);

  // 弹窗状态
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [versionManagerOpen, setVersionManagerOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);

  // 选中的行
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<ComparisonResult[]>([]);

  // 同步中状态
  const [syncing, setSyncing] = useState(false);

  // 公司返点库 hook
  const {
    versions,
    selectedVersionId,
    comparisons,
    summary,
    loading,
    importing,
    comparing,
    loadVersions,
    importVersion,
    deleteVersion,
    setDefaultVersion,
    runComparison,
    selectVersion,
  } = useCompanyRebate();

  // 初始加载版本列表
  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  // 处理导入
  const handleImport = useCallback(
    async (records: ParsedExcelRecord[], fileName: string, note?: string) => {
      return await importVersion(records, fileName, note);
    },
    [importVersion]
  );

  // 处理对比
  const handleCompare = useCallback(() => {
    if (!platform) return;
    runComparison(platform, selectedVersionId || undefined);
    setSelectedRowKeys([]);
    setSelectedRows([]);
  }, [platform, selectedVersionId, runComparison]);

  // 处理选择变化
  const handleSelectionChange = useCallback(
    (keys: string[], rows: ComparisonResult[]) => {
      setSelectedRowKeys(keys);
      setSelectedRows(rows);
    },
    []
  );

  // 处理同步确认
  const handleSyncConfirm = useCallback(async () => {
    if (selectedRows.length === 0 || !platform) return;

    setSyncing(true);
    try {
      // 构建同步数据
      const talents = selectedRows.map(row => ({
        oneId: row.talentId,
        rebateRate: row.syncRebate!,
      }));

      // 调用批量设置独立返点 API
      const response = await batchSetIndependentRebate({
        platform,
        talents,
        updatedBy: 'rebate_comparison_sync',
      });

      if (response.success) {
        message.success(`成功同步 ${response.data?.updated || selectedRows.length} 个达人的返点`);
        // 清除选择
        setSelectedRowKeys([]);
        setSelectedRows([]);
        setSyncModalOpen(false);
        // 重新对比
        handleCompare();
      } else {
        message.error(response.message || '同步失败');
      }
    } catch (err) {
      console.error('Sync failed:', err);
      message.error('同步失败');
    } finally {
      setSyncing(false);
    }
  }, [selectedRows, platform, handleCompare]);

  // 是否有数据可展示
  const hasVersions = versions.length > 0;
  const hasComparisons = comparisons.length > 0;

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-content">返点对比看板</h1>
          <p className="mt-2 text-sm text-content-secondary">
            对比公司返点库与 AgentWorks 达人返点，支持批量同步
          </p>
        </div>

        {/* 操作栏 */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-surface rounded-xl border border-stroke shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            {/* 导入按钮 */}
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => setImportModalOpen(true)}
            >
              导入新版本
            </Button>

            {/* 版本选择器 */}
            <VersionSelector
              versions={versions}
              selectedId={selectedVersionId}
              loading={loading}
              onChange={selectVersion}
            />

            {/* 平台选择 */}
            <Select
              value={platform}
              onChange={setPlatform}
              loading={configLoading}
              style={{ width: 120 }}
              options={configs.map(c => ({
                value: c.platform,
                label: c.name,
              }))}
            />

            {/* 对比按钮 */}
            <Button
              icon={<ReloadOutlined spin={comparing} />}
              onClick={handleCompare}
              disabled={!selectedVersionId || comparing}
            >
              执行对比
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {/* 批量同步按钮 */}
            {hasComparisons && (
              <Button
                type="primary"
                icon={<SyncOutlined />}
                onClick={() => setSyncModalOpen(true)}
                disabled={selectedRowKeys.length === 0}
              >
                批量同步 {selectedRowKeys.length > 0 ? `(${selectedRowKeys.length})` : ''}
              </Button>
            )}

            {/* 版本管理 */}
            <Button
              icon={<SettingOutlined />}
              onClick={() => setVersionManagerOpen(true)}
            >
              管理版本
            </Button>
          </div>
        </div>

        {/* 主内容区 */}
        {loading || comparing ? (
          <div className="flex items-center justify-center py-24 bg-surface rounded-xl border border-stroke shadow-sm">
            <Spin size="large">
              <div className="pt-8 text-content-muted">
                {comparing ? '正在对比...' : '加载中...'}
              </div>
            </Spin>
          </div>
        ) : !hasVersions ? (
          <div className="bg-surface rounded-xl border border-stroke p-12 shadow-sm">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span className="text-content-muted text-sm">
                  暂无版本，请先导入公司返点 Excel 文件
                </span>
              }
            >
              <Button
                type="primary"
                icon={<UploadOutlined />}
                onClick={() => setImportModalOpen(true)}
              >
                导入新版本
              </Button>
            </Empty>
          </div>
        ) : !hasComparisons ? (
          <div className="bg-surface rounded-xl border border-stroke p-12 shadow-sm">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span className="text-content-muted text-sm">
                  请选择版本并点击"执行对比"查看结果
                </span>
              }
            >
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={handleCompare}
                disabled={!selectedVersionId}
              >
                执行对比
              </Button>
            </Empty>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 统计概览 */}
            <SummaryStats summary={summary} loading={comparing} />

            {/* 对比表格 */}
            <div className="bg-surface rounded-xl border border-stroke p-4 shadow-sm">
              <ComparisonTable
                comparisons={comparisons}
                loading={comparing}
                selectedRowKeys={selectedRowKeys}
                onSelectionChange={handleSelectionChange}
              />
            </div>
          </div>
        )}

        {/* 导入弹窗 */}
        <ImportExcelModal
          open={importModalOpen}
          importing={importing}
          onImport={handleImport}
          onCancel={() => setImportModalOpen(false)}
        />

        {/* 版本管理弹窗 */}
        <VersionManagerModal
          open={versionManagerOpen}
          versions={versions}
          loading={loading}
          onSetDefault={setDefaultVersion}
          onDelete={deleteVersion}
          onClose={() => setVersionManagerOpen(false)}
        />

        {/* 同步确认弹窗 */}
        <SyncConfirmModal
          open={syncModalOpen}
          items={selectedRows}
          syncing={syncing}
          onConfirm={handleSyncConfirm}
          onCancel={() => setSyncModalOpen(false)}
        />
      </div>
    </PageTransition>
  );
}
