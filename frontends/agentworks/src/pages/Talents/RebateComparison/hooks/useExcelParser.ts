/**
 * Excel 解析 Hook
 * 用于解析公司返点库 Excel 文件
 * 支持从系统配置动态加载列映射和解析规则
 */

import { useState, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { get } from '../../../../api/client';
import type { ParsedExcelRecord } from '../types';

// ==================== 配置类型 ====================

/** 返点解析规则 */
interface RebateParserConfig {
  type: 'direct' | 'regex' | 'percent';
  pattern?: string;
  multiplier: number;
  groupIndex?: number;
}

/** 列映射配置 */
interface ColumnMappingConfig {
  xingtuId: string;
  nickname: string;
  mcn: string;
  rebate: string;
}

/** 公司返点导入配置 */
interface CompanyRebateImportConfig {
  configType: 'company_rebate_import';
  columnMapping: ColumnMappingConfig;
  rebateParser: RebateParserConfig;
}

/** 默认配置 */
const DEFAULT_CONFIG: CompanyRebateImportConfig = {
  configType: 'company_rebate_import',
  columnMapping: {
    xingtuId: '星图ID',
    nickname: '昵称',
    mcn: 'MCN',
    rebate: '备注',
  },
  rebateParser: {
    type: 'regex',
    // 综合匹配多种返点格式：
    // 1. 返点XX% 或 返点:XX% - 最明确的格式
    // 2. XX% - 百分比格式（30%、25%返点...）
    // 3. 0.XX - 小数格式（0.26 表示 26%）
    // 4. 返点XX - 返点+整数（返点20、返点35）
    // 5. 纯整数（1-2位数，如 30、25）
    pattern: '返点[：:]?(\\d+)%|(\\d+)%|(\\d+\\.\\d+)|返点(\\d+)|^(\\d{1,2})$',
    multiplier: 100,
    groupIndex: 1,
  },
};

// ==================== Hook 结果接口 ====================

interface UseExcelParserResult {
  /** 解析后的记录 */
  records: ParsedExcelRecord[];
  /** 文件名 */
  fileName: string | null;
  /** 解析中状态 */
  parsing: boolean;
  /** 配置加载中 */
  configLoading: boolean;
  /** 配置 */
  config: CompanyRebateImportConfig | null;
  /** 错误信息 */
  error: string | null;
  /** 解析文件 */
  parseFile: (file: File) => Promise<void>;
  /** 清除结果 */
  clear: () => void;
  /** 刷新配置 */
  refreshConfig: () => Promise<void>;
}

// ==================== 解析函数 ====================

/**
 * 根据配置解析返点值
 *
 * @param raw - 原始值
 * @param parserConfig - 解析规则配置
 * @returns 返点百分比（整数），或 null
 */
function parseRebateValue(
  raw: string | null | undefined,
  parserConfig: RebateParserConfig
): number | null {
  if (!raw || typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    switch (parserConfig.type) {
      case 'direct': {
        // 直接数值
        const value = parseFloat(trimmed);
        if (isNaN(value)) return null;
        return value <= 1
          ? Math.round(value * parserConfig.multiplier)
          : Math.round(value);
      }

      case 'regex': {
        // 正则匹配
        if (!parserConfig.pattern) return null;
        const regex = new RegExp(parserConfig.pattern);
        const match = trimmed.match(regex);
        if (!match) return null;
        // 支持多个捕获组，找第一个非空的匹配
        let value: number | null = null;
        for (let i = 1; i < match.length; i++) {
          if (match[i]) {
            value = parseFloat(match[i]);
            break;
          }
        }
        if (value === null || isNaN(value)) {
          value = parseFloat(match[0]);
        }
        if (isNaN(value)) return null;
        return value <= 1
          ? Math.round(value * parserConfig.multiplier)
          : Math.round(value);
      }

      case 'percent': {
        // 百分比格式 (如 "26%" -> 26)
        const percentMatch = trimmed.match(/(\d+\.?\d*)%?/);
        if (!percentMatch) return null;
        const value = parseFloat(percentMatch[1]);
        if (isNaN(value)) return null;
        return Math.round(value);
      }

      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * 从 Excel 行中获取列值
 * 支持按配置的列名和常见别名获取
 */
function getColumnValue(
  row: Record<string, unknown>,
  configColumnName: string,
  fallbackNames: string[]
): string {
  // 先尝试配置的列名
  if (row[configColumnName] !== undefined && row[configColumnName] !== null) {
    return String(row[configColumnName]).trim();
  }

  // 尝试备选列名
  for (const name of fallbackNames) {
    if (row[name] !== undefined && row[name] !== null) {
      return String(row[name]).trim();
    }
  }

  return '';
}

// ==================== Hook 实现 ====================

/**
 * Excel 解析 Hook
 */
export function useExcelParser(): UseExcelParserResult {
  const [records, setRecords] = useState<ParsedExcelRecord[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [config, setConfig] = useState<CompanyRebateImportConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 加载配置
  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const response = await get<{
        success: boolean;
        data: CompanyRebateImportConfig | null;
      }>('/platformConfigManager', { configType: 'company_rebate_import' });

      if (response.success && response.data) {
        setConfig(response.data);
      } else {
        // 使用默认配置
        setConfig(DEFAULT_CONFIG);
      }
    } catch (err) {
      console.error('Failed to load company rebate import config:', err);
      // 使用默认配置
      setConfig(DEFAULT_CONFIG);
    } finally {
      setConfigLoading(false);
    }
  }, []);

  // 初始化加载配置
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // 解析文件
  const parseFile = useCallback(
    async (file: File) => {
      if (!config) {
        setError('配置未加载，请稍后重试');
        return;
      }

      setParsing(true);
      setError(null);
      setRecords([]);
      setFileName(file.name);

      try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });

        // 获取第一个工作表
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          throw new Error('Excel 文件为空');
        }

        const worksheet = workbook.Sheets[sheetName];
        const jsonData =
          XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

        if (jsonData.length === 0) {
          throw new Error('Excel 文件没有数据行');
        }

        const { columnMapping, rebateParser } = config;

        // 解析记录
        const parsed: ParsedExcelRecord[] = [];
        const skipped: number[] = [];

        jsonData.forEach((row, index) => {
          // 获取星图ID（使用配置的列名 + 备选列名）
          const xingtuId = getColumnValue(row, columnMapping.xingtuId, [
            '星图ID',
            '星图id',
            'xingtuId',
            'XingtuID',
          ]);

          // 获取昵称
          const nickname = getColumnValue(row, columnMapping.nickname, [
            '昵称',
            '达人昵称',
            'nickname',
          ]);

          // 获取MCN
          const mcn = getColumnValue(row, columnMapping.mcn, [
            'MCN',
            'mcn',
            '机构',
          ]);

          // 获取返点原始值
          const rawRemark = getColumnValue(row, columnMapping.rebate, [
            '备注',
            'remark',
            'Remark',
            '返点',
            '返点率',
          ]);

          // 解析返点
          const rebateRate = parseRebateValue(
            rawRemark || null,
            rebateParser
          );

          // 验证必要字段
          if (!xingtuId) {
            skipped.push(index + 2); // Excel 行号从1开始，加上标题行
            return;
          }

          if (rebateRate === null) {
            skipped.push(index + 2);
            return;
          }

          parsed.push({
            xingtuId,
            nickname,
            mcn,
            rebateRate,
            rawRemark: rawRemark || null,
          });
        });

        if (parsed.length === 0) {
          throw new Error('没有解析到有效记录，请检查文件格式或配置');
        }

        // 去重（同一星图ID + MCN + 返点）
        const uniqueMap = new Map<string, ParsedExcelRecord>();
        parsed.forEach(record => {
          const key = `${record.xingtuId}_${record.mcn}_${record.rebateRate}`;
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, record);
          }
        });

        const uniqueRecords = Array.from(uniqueMap.values());

        setRecords(uniqueRecords);

        // 如果有跳过的行，记录警告
        if (skipped.length > 0 && skipped.length <= 10) {
          console.warn(
            `跳过了 ${skipped.length} 行无效数据，行号: ${skipped.join(', ')}`
          );
        } else if (skipped.length > 10) {
          console.warn(`跳过了 ${skipped.length} 行无效数据`);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '解析文件时发生未知错误';
        setError(message);
        setRecords([]);
      } finally {
        setParsing(false);
      }
    },
    [config]
  );

  const clear = useCallback(() => {
    setRecords([]);
    setFileName(null);
    setError(null);
  }, []);

  const refreshConfig = useCallback(async () => {
    await loadConfig();
  }, [loadConfig]);

  return {
    records,
    fileName,
    parsing,
    configLoading,
    config,
    error,
    parseFile,
    clear,
    refreshConfig,
  };
}
