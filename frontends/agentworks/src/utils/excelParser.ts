/**
 * Excel 解析工具
 * 用于批量绑定达人时解析 Excel 文件
 */

import * as XLSX from 'xlsx';
import type { Platform } from '../types/talent';

/**
 * 解析后的达人数据
 */
export interface ParsedTalentRow {
  platform?: Platform;
  name?: string;
  platformAccountId?: string;
  agencyName?: string; // 机构名称（多机构绑定模式）
  rowIndex: number; // 原始行号（用于错误提示）
}

/**
 * 解析结果
 */
export interface ParseResult {
  success: boolean;
  data: ParsedTalentRow[];
  errors: string[];
  warnings: string[];
}

/**
 * 平台名称映射表
 * 支持多种中文/英文写法
 */
const PLATFORM_MAP: Record<string, Platform> = {
  // 抖音
  抖音: 'douyin',
  星图: 'douyin',
  douyin: 'douyin',
  dy: 'douyin',
  // 小红书
  小红书: 'xiaohongshu',
  蒲公英: 'xiaohongshu',
  xiaohongshu: 'xiaohongshu',
  xhs: 'xiaohongshu',
  redbook: 'xiaohongshu',
  // B站
  b站: 'bilibili',
  B站: 'bilibili',
  哔哩哔哩: 'bilibili',
  bilibili: 'bilibili',
  bili: 'bilibili',
  // 快手
  快手: 'kuaishou',
  kuaishou: 'kuaishou',
  ks: 'kuaishou',
};

/**
 * 智能列名识别配置
 */
const COLUMN_PATTERNS = {
  platform: ['平台', 'platform', '渠道', '来源'],
  name: [
    '达人昵称',
    '昵称',
    '名称',
    '达人名称',
    'name',
    '达人',
    '账号名称',
    '账号昵称',
  ],
  platformAccountId: [
    '星图ID',
    '星图id',
    'xingtuId',
    'xingtu_id',
    '蒲公英ID',
    '蒲公英id',
    'B站UID',
    'b站uid',
    'bilibili_uid',
    '平台ID',
    '平台id',
    'platformAccountId',
    'platform_account_id',
    '账号ID',
    '账号id',
    'uid',
    'UID',
    'ID',
    'id',
  ],
  agencyName: [
    '机构名称',
    '机构',
    '所属机构',
    '归属机构',
    'agency',
    'agencyName',
    'agency_name',
    'MCN',
    'mcn',
  ],
};

/**
 * 标准化平台名称
 */
export function normalizePlatform(value: string): Platform | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  return PLATFORM_MAP[normalized] || PLATFORM_MAP[value.trim()];
}

/**
 * 智能匹配列名
 */
function matchColumnName(header: string, patterns: string[]): boolean {
  const normalizedHeader = header.trim().toLowerCase();
  return patterns.some(pattern =>
    normalizedHeader.includes(pattern.toLowerCase())
  );
}

/**
 * 检测列映射
 */
function detectColumnMapping(headers: string[]): {
  platformCol: number;
  nameCol: number;
  platformAccountIdCol: number;
  agencyNameCol: number;
} {
  let platformCol = -1;
  let nameCol = -1;
  let platformAccountIdCol = -1;
  let agencyNameCol = -1;

  headers.forEach((header, index) => {
    if (
      platformCol === -1 &&
      matchColumnName(header, COLUMN_PATTERNS.platform)
    ) {
      platformCol = index;
    }
    if (nameCol === -1 && matchColumnName(header, COLUMN_PATTERNS.name)) {
      nameCol = index;
    }
    if (
      platformAccountIdCol === -1 &&
      matchColumnName(header, COLUMN_PATTERNS.platformAccountId)
    ) {
      platformAccountIdCol = index;
    }
    if (
      agencyNameCol === -1 &&
      matchColumnName(header, COLUMN_PATTERNS.agencyName)
    ) {
      agencyNameCol = index;
    }
  });

  return { platformCol, nameCol, platformAccountIdCol, agencyNameCol };
}

/**
 * 解析 Excel 文件
 *
 * @param file 文件对象
 * @param defaultPlatform 默认平台（当 Excel 中没有平台列或某行平台为空时使用）
 */
export async function parseExcelFile(
  file: File,
  defaultPlatform?: Platform
): Promise<ParseResult> {
  const warnings: string[] = [];
  const data: ParsedTalentRow[] = [];

  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // 读取第一个工作表
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return {
        success: false,
        data: [],
        errors: ['Excel 文件为空'],
        warnings: [],
      };
    }

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, {
      header: 1,
      defval: '',
    });

    if (jsonData.length < 2) {
      return {
        success: false,
        data: [],
        errors: ['Excel 文件至少需要包含表头和一行数据'],
        warnings: [],
      };
    }

    // 第一行作为表头
    const headers = jsonData[0].map(h => String(h || '').trim());
    const { platformCol, nameCol, platformAccountIdCol, agencyNameCol } =
      detectColumnMapping(headers);

    // 检查必要列
    if (nameCol === -1 && platformAccountIdCol === -1) {
      return {
        success: false,
        data: [],
        errors: [
          '无法识别必要的列。请确保 Excel 包含以下列之一：' +
            '\n- 达人昵称（或：昵称、名称、name）' +
            '\n- 平台ID（或：星图ID、蒲公英ID、B站UID、platformAccountId）',
        ],
        warnings: [],
      };
    }

    // 如果没有平台列但也没有默认平台，给出警告
    if (platformCol === -1 && !defaultPlatform) {
      warnings.push('未检测到平台列，将使用选择的目标平台作为所有达人的平台');
    }

    // 解析数据行
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowIndex = i + 1; // Excel 行号（从1开始，加上表头）

      // 跳过空行
      if (!row || row.every(cell => !cell || String(cell).trim() === '')) {
        continue;
      }

      const platformRaw =
        platformCol >= 0 ? String(row[platformCol] || '').trim() : '';
      const name = nameCol >= 0 ? String(row[nameCol] || '').trim() : '';
      const platformAccountId =
        platformAccountIdCol >= 0
          ? String(row[platformAccountIdCol] || '').trim()
          : '';
      const agencyName =
        agencyNameCol >= 0 ? String(row[agencyNameCol] || '').trim() : '';

      // 确定平台
      let platform: Platform | undefined;
      if (platformRaw) {
        platform = normalizePlatform(platformRaw);
        if (!platform) {
          warnings.push(
            `第 ${rowIndex} 行：无法识别的平台 "${platformRaw}"，将使用默认平台`
          );
          platform = defaultPlatform;
        }
      } else {
        platform = defaultPlatform;
      }

      // 至少需要 name 或 platformAccountId 之一
      if (!name && !platformAccountId) {
        warnings.push(`第 ${rowIndex} 行：缺少达人昵称和平台ID，已跳过`);
        continue;
      }

      data.push({
        platform,
        name: name || undefined,
        platformAccountId: platformAccountId || undefined,
        agencyName: agencyName || undefined,
        rowIndex,
      });
    }

    if (data.length === 0) {
      return {
        success: false,
        data: [],
        errors: ['解析完成，但没有有效的数据行'],
        warnings,
      };
    }

    return {
      success: true,
      data,
      errors: [],
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      errors: [`解析 Excel 文件失败：${(error as Error).message}`],
      warnings: [],
    };
  }
}

/**
 * 解析粘贴的文本数据
 * 支持制表符分隔（从 Excel 复制）或逗号分隔
 *
 * @param text 粘贴的文本
 * @param defaultPlatform 默认平台
 */
export function parseTextData(
  text: string,
  defaultPlatform?: Platform
): ParseResult {
  const warnings: string[] = [];
  const data: ParsedTalentRow[] = [];

  if (!text || !text.trim()) {
    return { success: false, data: [], errors: ['文本内容为空'], warnings: [] };
  }

  const lines = text.trim().split('\n');
  if (lines.length < 1) {
    return {
      success: false,
      data: [],
      errors: ['没有有效的数据行'],
      warnings: [],
    };
  }

  // 检测分隔符
  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t') ? '\t' : ',';

  // 尝试检测是否有表头
  const firstLineCells = firstLine.split(delimiter).map(s => s.trim());
  const hasHeader = firstLineCells.some(
    cell =>
      matchColumnName(cell, COLUMN_PATTERNS.name) ||
      matchColumnName(cell, COLUMN_PATTERNS.platformAccountId) ||
      matchColumnName(cell, COLUMN_PATTERNS.platform) ||
      matchColumnName(cell, COLUMN_PATTERNS.agencyName)
  );

  let startIndex = 0;
  let { platformCol, nameCol, platformAccountIdCol, agencyNameCol } = {
    platformCol: -1,
    nameCol: -1,
    platformAccountIdCol: -1,
    agencyNameCol: -1,
  };

  if (hasHeader) {
    const mapping = detectColumnMapping(firstLineCells);
    platformCol = mapping.platformCol;
    nameCol = mapping.nameCol;
    platformAccountIdCol = mapping.platformAccountIdCol;
    agencyNameCol = mapping.agencyNameCol;
    startIndex = 1;
  } else {
    // 没有表头时，根据列数猜测
    const colCount = firstLineCells.length;
    if (colCount >= 4) {
      // 假设格式：平台、昵称、平台ID、机构
      platformCol = 0;
      nameCol = 1;
      platformAccountIdCol = 2;
      agencyNameCol = 3;
    } else if (colCount >= 3) {
      // 假设格式：平台、昵称、平台ID
      platformCol = 0;
      nameCol = 1;
      platformAccountIdCol = 2;
    } else if (colCount === 2) {
      // 假设格式：昵称、平台ID
      nameCol = 0;
      platformAccountIdCol = 1;
    } else if (colCount === 1) {
      // 只有一列，假设是昵称
      nameCol = 0;
    }
  }

  // 解析数据
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cells = line.split(delimiter).map(s => s.trim());
    const rowIndex = i + 1;

    const platformRaw = platformCol >= 0 ? cells[platformCol] || '' : '';
    const name = nameCol >= 0 ? cells[nameCol] || '' : '';
    const platformAccountId =
      platformAccountIdCol >= 0 ? cells[platformAccountIdCol] || '' : '';
    const agencyName = agencyNameCol >= 0 ? cells[agencyNameCol] || '' : '';

    // 确定平台
    let platform: Platform | undefined;
    if (platformRaw) {
      platform = normalizePlatform(platformRaw);
      if (!platform) {
        warnings.push(
          `第 ${rowIndex} 行：无法识别的平台 "${platformRaw}"，将使用默认平台`
        );
        platform = defaultPlatform;
      }
    } else {
      platform = defaultPlatform;
    }

    // 至少需要 name 或 platformAccountId 之一
    if (!name && !platformAccountId) {
      warnings.push(`第 ${rowIndex} 行：缺少达人昵称和平台ID，已跳过`);
      continue;
    }

    data.push({
      platform,
      name: name || undefined,
      platformAccountId: platformAccountId || undefined,
      agencyName: agencyName || undefined,
      rowIndex,
    });
  }

  if (data.length === 0) {
    return {
      success: false,
      data: [],
      errors: ['解析完成，但没有有效的数据行'],
      warnings,
    };
  }

  return {
    success: true,
    data,
    errors: [],
    warnings,
  };
}
