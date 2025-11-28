/**
 * 批量新增达人组件类型定义
 */

import type { Platform } from '../../types/talent';

/**
 * 解析后的达人数据行
 */
export interface ParsedTalentRow {
  key: string; // 唯一标识（用于表格）
  name: string; // 达人昵称
  platformAccountId: string; // 平台账号ID（如星图ID）
  uid?: string; // 平台UID（可选）
  isValid: boolean; // 是否有效
  errors: string[]; // 错误信息列表
}

/**
 * 平台字段配置
 */
export interface PlatformFieldConfig {
  platform: Platform;
  accountIdLabel: string; // 账号ID字段标签（如"星图ID"）
  accountIdPlaceholder: string; // 账号ID占位符
  uidLabel?: string; // UID字段标签（可选）
  requiredFields: string[]; // 必填字段列表
}

/**
 * 表头映射配置（不区分大小写匹配）
 */
export const HEADER_MAPPINGS: Record<string, string> = {
  // 达人昵称
  达人昵称: 'name',
  昵称: 'name',
  名称: 'name',
  达人名称: 'name',
  达人: 'name',
  nickname: 'name',
  name: 'name',
  账号名称: 'name',
  账号昵称: 'name',

  // 星图ID（抖音）
  星图ID: 'platformAccountId',
  星图id: 'platformAccountId',
  星图: 'platformAccountId',
  xingtuId: 'platformAccountId',
  xingtuid: 'platformAccountId',
  星图达人ID: 'platformAccountId',
  达人星图ID: 'platformAccountId',
  达人星图id: 'platformAccountId',

  // 通用平台ID
  平台ID: 'platformAccountId',
  平台账号ID: 'platformAccountId',
  platformAccountId: 'platformAccountId',
  ID: 'platformAccountId',
  id: 'platformAccountId',
  账号ID: 'platformAccountId',

  // 小红书
  蒲公英ID: 'platformAccountId',
  小红书ID: 'platformAccountId',
  蒲公英: 'platformAccountId',
  红书ID: 'platformAccountId',

  // B站
  B站UID: 'platformAccountId',
  b站uid: 'platformAccountId',
  biliUid: 'platformAccountId',
  B站ID: 'platformAccountId',

  // 快手
  快手ID: 'platformAccountId',
  kuaishouId: 'platformAccountId',
  磁力聚星ID: 'platformAccountId',

  // UID（抖音特有的第三列）
  UID: 'uid',
  uid: 'uid',
  抖音UID: 'uid',
  用户UID: 'uid',
  达人UID: 'uid',
  达人uid: 'uid',
};

/**
 * 智能匹配表头名称（支持模糊匹配）
 */
export function matchHeader(header: string): string | null {
  const trimmed = header.trim();

  // 1. 精确匹配
  if (HEADER_MAPPINGS[trimmed]) {
    return HEADER_MAPPINGS[trimmed];
  }

  // 2. 不区分大小写匹配
  const lowerHeader = trimmed.toLowerCase();
  for (const [key, value] of Object.entries(HEADER_MAPPINGS)) {
    if (key.toLowerCase() === lowerHeader) {
      return value;
    }
  }

  // 3. 包含关键词匹配（注意顺序：先匹配更具体的，再匹配通用的）

  // 先检查是否包含平台ID相关关键词
  if (
    lowerHeader.includes('星图') ||
    lowerHeader.includes('蒲公英') ||
    lowerHeader.includes('磁力')
  ) {
    return 'platformAccountId';
  }

  // 检查 UID（区分 B站UID 和抖音UID）
  if (lowerHeader.includes('uid')) {
    // B站UID 是 platformAccountId
    if (lowerHeader.includes('b站') || lowerHeader.includes('bili')) {
      return 'platformAccountId';
    }
    // 其他 UID（如抖音UID、达人UID）是额外字段
    return 'uid';
  }

  // 最后检查昵称（避免"达人星图ID"被误识别为昵称）
  if (lowerHeader.includes('昵称') || lowerHeader.includes('名称')) {
    return 'name';
  }
  // "达人"单独出现时才认为是昵称（如"达人"列）
  if (lowerHeader === '达人') {
    return 'name';
  }

  return null;
}

/**
 * 检测是否为表头行
 * 表头行特征：
 * 1. 包含可识别的表头名称
 * 2. 或者：第一行全是非数字文本（可能是未知表头）
 * 3. 排除：第一行包含长数字（很可能是数据行）
 */
export function isHeaderRow(values: string[]): boolean {
  // 1. 先检查是否有可识别的表头
  let matchCount = 0;
  for (const value of values) {
    if (matchHeader(value)) {
      matchCount++;
    }
  }
  if (matchCount >= 1) {
    return true;
  }

  // 2. 检查是否像数据行（包含长数字）
  let hasLongNumber = false;
  let allNonNumeric = true;

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;

    // 检查是否为长数字（6位以上，很可能是ID数据）
    if (/^\d{6,}$/.test(trimmed)) {
      hasLongNumber = true;
      allNonNumeric = false;
    }
    // 检查是否为任何数字
    if (/^\d+$/.test(trimmed)) {
      allNonNumeric = false;
    }
  }

  // 如果包含长数字，很可能是数据行而不是表头
  if (hasLongNumber) {
    return false;
  }

  // 如果全是非数字文本，可能是未识别的表头
  if (allNonNumeric && values.some(v => v.trim())) {
    return true;
  }

  return false;
}

/**
 * 分析列的数据特征
 */
function analyzeColumnType(values: string[]): 'id' | 'name' | 'unknown' {
  if (values.length === 0) return 'unknown';

  let numericCount = 0;
  let chineseCount = 0;
  let longNumberCount = 0;

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;

    // 检查是否为纯数字
    if (/^\d+$/.test(trimmed)) {
      numericCount++;
      // 长数字（6位以上）更可能是ID
      if (trimmed.length >= 6) {
        longNumberCount++;
      }
    }

    // 检查是否包含中文
    if (/[\u4e00-\u9fa5]/.test(trimmed)) {
      chineseCount++;
    }
  }

  const total = values.filter(v => v.trim()).length;
  if (total === 0) return 'unknown';

  // 如果大部分是长数字，很可能是ID
  if (longNumberCount / total >= 0.7) {
    return 'id';
  }

  // 如果大部分包含中文，很可能是昵称
  if (chineseCount / total >= 0.5) {
    return 'name';
  }

  // 如果全是数字但不够长，可能是ID也可能是其他
  if (numericCount / total >= 0.9) {
    return 'id';
  }

  return 'unknown';
}

/**
 * 智能推断列映射（无表头时使用）
 * 通过分析数据特征来判断每列的含义
 *
 * 重要：只有明确识别到的列才会被映射，不会强行猜测
 */
export function inferColumnMapping(
  columnCount: number,
  platform: Platform,
  sampleRows?: string[][]
): Record<string, number> {
  const mapping: Record<string, number> = {};

  // 如果没有样本数据，不做任何推断（让调用方处理错误）
  if (!sampleRows || sampleRows.length === 0) {
    return mapping;
  }

  // 分析每列的数据特征
  const columnTypes: ('id' | 'name' | 'unknown')[] = [];

  for (let col = 0; col < columnCount; col++) {
    const columnValues = sampleRows.map(row => row[col] || '');
    columnTypes[col] = analyzeColumnType(columnValues);
  }

  // 统计各类型的列数
  const nameColumns: number[] = [];
  const idColumns: number[] = [];

  for (let col = 0; col < columnCount; col++) {
    if (columnTypes[col] === 'name') {
      nameColumns.push(col);
    } else if (columnTypes[col] === 'id') {
      idColumns.push(col);
    }
  }

  // 分配昵称列：必须是明确识别为 'name' 类型的列
  if (nameColumns.length > 0) {
    mapping['name'] = nameColumns[0];
  }
  // 注意：如果没有识别到昵称列，不要强行分配！

  // 分配平台ID列：取第一个 ID 类型的列
  if (idColumns.length > 0) {
    // 如果昵称已经占用了某列，跳过它
    const availableIdCols = idColumns.filter(col => mapping['name'] !== col);
    if (availableIdCols.length > 0) {
      mapping['platformAccountId'] = availableIdCols[0];
    }
  }

  // 抖音平台：分配 UID 列（第二个 ID 类型的列）
  if (platform === 'douyin' && idColumns.length >= 2) {
    const usedCols = new Set([mapping['name'], mapping['platformAccountId']]);
    const availableIdCols = idColumns.filter(col => !usedCols.has(col));
    if (availableIdCols.length > 0) {
      mapping['uid'] = availableIdCols[0];
    }
  }

  return mapping;
}

/**
 * 获取平台对应的字段配置
 */
export function getPlatformFieldConfig(
  platform: Platform
): PlatformFieldConfig {
  switch (platform) {
    case 'douyin':
      return {
        platform: 'douyin',
        accountIdLabel: '星图ID',
        accountIdPlaceholder: '请输入星图ID',
        uidLabel: 'UID',
        requiredFields: ['name', 'platformAccountId'],
      };
    case 'xiaohongshu':
      return {
        platform: 'xiaohongshu',
        accountIdLabel: '蒲公英ID/小红书ID',
        accountIdPlaceholder: '请输入蒲公英ID或小红书ID',
        requiredFields: ['name', 'platformAccountId'],
      };
    case 'bilibili':
      return {
        platform: 'bilibili',
        accountIdLabel: 'B站UID',
        accountIdPlaceholder: '请输入B站UID',
        requiredFields: ['name', 'platformAccountId'],
      };
    case 'kuaishou':
      return {
        platform: 'kuaishou',
        accountIdLabel: '快手ID',
        accountIdPlaceholder: '请输入快手ID',
        requiredFields: ['name', 'platformAccountId'],
      };
    default:
      return {
        platform: platform,
        accountIdLabel: '平台ID',
        accountIdPlaceholder: '请输入平台ID',
        requiredFields: ['name', 'platformAccountId'],
      };
  }
}
