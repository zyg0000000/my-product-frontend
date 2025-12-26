/**
 * 报告模板数据 Hook
 *
 * @description
 * - 模板列表加载和状态管理
 * - 模板 CRUD 操作封装
 * - 缓存和刷新机制
 */

import { useState, useEffect, useCallback } from 'react';
import { App } from 'antd';
import { templatesApi } from '../api/templates';
import type {
  ReportTemplate,
  ReportTemplateListItem,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  MappingSchemas,
} from '../types/template';

interface UseTemplatesOptions {
  /** 模板类型筛选 */
  type?: 'registration' | 'general';
  /** 是否自动加载 */
  autoLoad?: boolean;
}

interface UseTemplatesReturn {
  /** 模板列表 */
  templates: ReportTemplateListItem[];
  /** 加载中状态 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 刷新列表 */
  refresh: () => Promise<void>;
  /** 创建模板 */
  create: (data: CreateTemplateRequest) => Promise<ReportTemplate | null>;
  /** 更新模板 */
  update: (data: UpdateTemplateRequest) => Promise<ReportTemplate | null>;
  /** 删除模板 */
  remove: (id: string) => Promise<boolean>;
  /** 获取单个模板详情 */
  getById: (id: string) => Promise<ReportTemplate | null>;
}

/**
 * 模板列表 Hook
 */
export function useTemplates(
  options: UseTemplatesOptions = {}
): UseTemplatesReturn {
  const { type, autoLoad = true } = options;
  const { message } = App.useApp();

  const [templates, setTemplates] = useState<ReportTemplateListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载模板列表
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await templatesApi.getTemplates(type);
      if (result.success && result.data) {
        setTemplates(result.data);
      } else {
        throw new Error(result.message || '加载模板列表失败');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '加载模板列表失败';
      setError(errorMessage);
      console.error('Load templates error:', err);
    } finally {
      setLoading(false);
    }
  }, [type]);

  // 自动加载
  useEffect(() => {
    if (autoLoad) {
      refresh();
    }
  }, [autoLoad, refresh]);

  // 创建模板
  const create = useCallback(
    async (data: CreateTemplateRequest): Promise<ReportTemplate | null> => {
      try {
        const result = await templatesApi.createTemplate(data);
        if (result.success && result.data) {
          message.success('模板创建成功');
          await refresh();
          return result.data;
        } else {
          throw new Error(result.message || '创建模板失败');
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '创建模板失败';
        message.error(errorMessage);
        return null;
      }
    },
    [message, refresh]
  );

  // 更新模板
  const update = useCallback(
    async (data: UpdateTemplateRequest): Promise<ReportTemplate | null> => {
      try {
        const result = await templatesApi.updateTemplate(data);
        if (result.success && result.data) {
          message.success('模板更新成功');
          await refresh();
          return result.data;
        } else {
          throw new Error(result.message || '更新模板失败');
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '更新模板失败';
        message.error(errorMessage);
        return null;
      }
    },
    [message, refresh]
  );

  // 删除模板
  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const result = await templatesApi.deleteTemplate(id);
        if (result.success) {
          message.success('模板删除成功');
          await refresh();
          return true;
        } else {
          throw new Error(result.message || '删除模板失败');
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '删除模板失败';
        message.error(errorMessage);
        return false;
      }
    },
    [message, refresh]
  );

  // 获取单个模板
  const getById = useCallback(
    async (id: string): Promise<ReportTemplate | null> => {
      try {
        const result = await templatesApi.getTemplateById(id);
        if (result.success && result.data) {
          return result.data;
        } else {
          throw new Error(result.message || '获取模板详情失败');
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '获取模板详情失败';
        message.error(errorMessage);
        return null;
      }
    },
    [message]
  );

  return {
    templates,
    loading,
    error,
    refresh,
    create,
    update,
    remove,
    getById,
  };
}

/**
 * 数据源映射配置 Hook
 */
export function useMappingSchemas(
  source: 'registration' | 'automation' = 'registration'
) {
  const [schemas, setSchemas] = useState<MappingSchemas | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await templatesApi.getMappingSchemas(source);
      if (result.success && result.data) {
        setSchemas(result.data);
      } else {
        throw new Error(result.message || '加载数据源配置失败');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '加载数据源配置失败';
      setError(errorMessage);
      console.error('Load mapping schemas error:', err);
    } finally {
      setLoading(false);
    }
  }, [source]);

  useEffect(() => {
    load();
  }, [load]);

  return { schemas, loading, error, reload: load };
}

/**
 * 飞书表头加载 Hook
 */
export function useSheetHeaders() {
  const { message } = App.useApp();
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (spreadsheetToken: string): Promise<string[]> => {
      if (!spreadsheetToken.trim()) {
        message.warning('请输入飞书表格链接或 Token');
        return [];
      }

      setLoading(true);

      try {
        const result = await templatesApi.loadSheetHeaders(spreadsheetToken);
        if (result.success && result.data) {
          setHeaders(result.data);
          message.success(`成功加载 ${result.data.length} 个表头`);
          return result.data;
        } else {
          throw new Error(result.message || '加载表头失败');
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '加载表头失败';
        message.error(errorMessage);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [message]
  );

  const clear = useCallback(() => {
    setHeaders([]);
  }, []);

  return { headers, loading, load, clear };
}
