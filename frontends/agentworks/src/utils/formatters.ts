/**
 * 格式化工具函数
 */

import type { PriceRecord, RebateRecord, PriceType } from '../types/talent';

/**
 * 将分转换为万元
 * @param cents 价格（单位：分）
 * @returns 格式化后的字符串，如 "5.00万"
 */
export function formatPrice(cents: number): string {
  const yuan = cents / 100;
  const wan = yuan / 10000;
  return `${wan.toFixed(2)}万`;
}

/**
 * 将分转换为元
 * @param cents 价格（单位：分）
 * @returns 格式化后的字符串，如 "50,000"
 */
export function formatPriceInYuan(cents: number): string {
  const yuan = cents / 100;
  return yuan.toLocaleString('zh-CN');
}

/**
 * 格式化返点率
 * @param rate 返点率（如 15.5）
 * @returns 格式化后的字符串，如 "15.5%"
 */
export function formatRebate(rate: number): string {
  return `${rate.toFixed(1)}%`;
}

/**
 * 格式化粉丝数
 * @param count 粉丝数
 * @returns 格式化后的字符串，如 "100.5万"
 */
export function formatFansCount(count: number): string {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万`;
  }
  return count.toLocaleString('zh-CN');
}

/**
 * 格式化日期（年月）
 * @param year 年份
 * @param month 月份
 * @returns 格式化后的字符串，如 "2025年1月"
 */
export function formatYearMonth(year: number, month: number): string {
  return `${year}年${month}月`;
}

/**
 * 获取某个月份的所有价格
 * @param prices 价格数组
 * @param year 年份
 * @param month 月份
 * @returns 该月份的价格记录数组
 */
export function getPricesByMonth(
  prices: PriceRecord[],
  year: number,
  month: number
): PriceRecord[] {
  return prices.filter(p => p.year === year && p.month === month);
}

/**
 * 获取最新月份的所有价格
 * @param prices 价格数组
 * @returns 最新月份的价格记录数组
 */
export function getLatestPrices(prices: PriceRecord[]): PriceRecord[] {
  if (prices.length === 0) return [];

  // 按 year 和 month 降序排序
  const sorted = [...prices].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  const latest = sorted[0];
  return prices.filter(p => p.year === latest.year && p.month === latest.month);
}

/**
 * 获取最新月份的价格对象（按类型索引）
 * @param prices 价格数组
 * @returns { video_60plus: 5000000, video_20to60: 3000000, ... }
 */
export function getLatestPricesMap(
  prices: PriceRecord[]
): Partial<Record<PriceType, number>> {
  const latestPrices = getLatestPrices(prices);
  return latestPrices.reduce(
    (acc, price) => {
      acc[price.type] = price.price;
      return acc;
    },
    {} as Partial<Record<PriceType, number>>
  );
}

/**
 * 获取最新返点率
 * @param rebates 返点数组
 * @returns 最新返点率，如果没有则返回 undefined
 */
export function getLatestRebate(rebates: RebateRecord[]): number | undefined {
  if (rebates.length === 0) return undefined;

  const sorted = [...rebates].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  return sorted[0]?.rate;
}

/**
 * 获取价格历史（按月份分组）
 * @param prices 价格数组
 * @returns 按月份分组的价格历史
 */
export interface PriceHistory {
  year: number;
  month: number;
  prices: Partial<Record<PriceType, number>>;
  isLatest?: boolean;
}

export function getPriceHistory(prices: PriceRecord[]): PriceHistory[] {
  if (prices.length === 0) return [];

  // 获取所有唯一的年月组合
  const yearMonths = Array.from(
    new Set(prices.map(p => `${p.year}-${p.month}`))
  ).map(ym => {
    const [year, month] = ym.split('-').map(Number);
    return { year, month };
  });

  // 按年月降序排序
  yearMonths.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  // 构建历史记录
  return yearMonths.map((ym, index) => {
    const monthPrices = getPricesByMonth(prices, ym.year, ym.month);
    const pricesMap = monthPrices.reduce(
      (acc, price) => {
        acc[price.type] = price.price;
        return acc;
      },
      {} as Partial<Record<PriceType, number>>
    );

    return {
      year: ym.year,
      month: ym.month,
      prices: pricesMap,
      isLatest: index === 0,
    };
  });
}

/**
 * 获取返点历史
 * @param rebates 返点数组
 * @returns 按月份排序的返点历史（最新在前）
 */
export function getRebateHistory(rebates: RebateRecord[]): RebateRecord[] {
  return [...rebates].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
}
