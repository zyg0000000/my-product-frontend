/**
 * 价格单位转换工具
 *
 * 统一管理价格在"分"和"元"之间的转换
 * 避免单位转换错误（已在 v2.5.0 修复过一次类似 Bug）
 *
 * 数据库存储：分（cents）
 * 用户输入/显示：元（yuan）
 */

const CENTS_PER_YUAN = 100;

export const PriceConverter = {
  /**
   * 分 → 元（用于显示）
   * @param cents 价格（分）
   * @returns 价格（元）
   */
  toYuan(cents: number): number {
    if (cents === null || cents === undefined || isNaN(cents)) {
      return 0;
    }
    return cents / CENTS_PER_YUAN;
  },

  /**
   * 元 → 分（用于存储）
   * @param yuan 价格（元），可以是数字或字符串
   * @returns 价格（分），四舍五入到整数
   */
  toCents(yuan: number | string): number {
    if (yuan === null || yuan === undefined || yuan === '') {
      return 0;
    }
    const yuanNum = typeof yuan === 'string' ? parseFloat(yuan) : yuan;
    if (isNaN(yuanNum)) {
      return 0;
    }
    return Math.round(yuanNum * CENTS_PER_YUAN);
  },

  /**
   * 格式化显示价格
   * @param cents 价格（分）
   * @param options 格式化选项
   * @returns 格式化后的字符串
   */
  format(
    cents: number,
    options?: {
      showUnit?: boolean; // 是否显示单位"元"
      useWan?: boolean; // 是否使用"万"作为单位（>=10000 时）
      decimals?: number; // 小数位数（默认 0）
    }
  ): string {
    const yuan = this.toYuan(cents);
    const { showUnit = false, useWan = true, decimals = 0 } = options || {};

    let formatted: string;

    // 大于等于 1 万时，使用"万"作为单位
    if (useWan && yuan >= 10000) {
      const wanValue = yuan / 10000;
      formatted = wanValue.toFixed(decimals === 0 ? 1 : decimals) + '万';
    } else {
      formatted = yuan.toLocaleString('zh-CN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }

    return showUnit && !formatted.includes('万') ? `${formatted}元` : formatted;
  },

  /**
   * 解析用户输入
   * 支持：
   * - "5000" → 5000 元
   * - "1.5万" → 15000 元
   * - "10000" → 10000 元
   *
   * @param input 用户输入的价格字符串
   * @returns 价格（分）
   */
  parse(input: string): number {
    if (!input || input.trim() === '') {
      return 0;
    }

    const trimmed = input.trim();

    // 匹配数字和可选的"万"字
    const match = trimmed.match(/^([\d.]+)(万)?$/);
    if (!match) {
      return 0;
    }

    const num = parseFloat(match[1]);
    if (isNaN(num)) {
      return 0;
    }

    const multiplier = match[2] === '万' ? 10000 : 1;
    const yuanValue = num * multiplier;

    return this.toCents(yuanValue);
  },

  /**
   * 验证价格是否有效
   * @param cents 价格（分）
   * @returns 是否有效
   */
  isValid(cents: number): boolean {
    return cents !== null && cents !== undefined && !isNaN(cents) && cents >= 0;
  },

  /**
   * 获取价格显示值（如果无效则返回默认值）
   * @param cents 价格（分）
   * @param defaultValue 默认显示值
   * @returns 显示字符串
   */
  getDisplayValue(cents: number, defaultValue: string = 'N/A'): string {
    if (!this.isValid(cents) || cents === 0) {
      return defaultValue;
    }
    return this.format(cents, { useWan: true });
  },
};

/**
 * React Hook: 价格输入框辅助
 * 用于表单输入时的实时转换
 */
export function usePriceInput(initialCents?: number) {
  const [yuanValue, setYuanValue] = React.useState<string>(
    initialCents ? PriceConverter.toYuan(initialCents).toString() : ''
  );

  const getCents = (): number => {
    return PriceConverter.toCents(yuanValue);
  };

  const setFromCents = (cents: number) => {
    setYuanValue(PriceConverter.toYuan(cents).toString());
  };

  return {
    yuanValue,
    setYuanValue,
    getCents,
    setFromCents,
  };
}

// TypeScript 支持
import React from 'react';
