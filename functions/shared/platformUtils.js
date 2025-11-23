/**
 * 平台配置工具方法（云函数共享模块）
 *
 * @version 1.0.0
 * @description 为所有云函数提供平台配置读取和缓存功能
 *
 * --- 更新日志 ---
 * [v1.0.0] 2025-11-23
 * - 初始版本
 * - 提供 getPlatformConfigs 方法
 * - 提供 getPlatformList 方法
 * - 实现5分钟缓存机制
 */

// 缓存平台配置（避免每次都查数据库）
let platformConfigCache = null;
let cacheTime = null;
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

/**
 * 获取所有平台配置
 *
 * @param {Object} db - MongoDB 数据库实例
 * @param {boolean} forceRefresh - 是否强制刷新缓存
 * @returns {Promise<Array>} 平台配置列表
 */
async function getPlatformConfigs(db, forceRefresh = false) {
  // 检查缓存
  if (!forceRefresh && platformConfigCache && Date.now() - cacheTime < CACHE_TTL) {
    console.log('[INFO] 使用缓存的平台配置');
    return platformConfigCache;
  }

  // 从数据库加载
  console.log('[INFO] 从数据库加载平台配置');
  const configs = await db.collection('system_config')
    .find({ configType: 'platform', enabled: true })
    .sort({ order: 1 })
    .toArray();

  platformConfigCache = configs;
  cacheTime = Date.now();

  console.log(`[SUCCESS] 加载了 ${configs.length} 个平台配置`);

  return configs;
}

/**
 * 获取平台列表（仅返回 platform key 数组）
 *
 * @param {Object} db - MongoDB 数据库实例
 * @returns {Promise<string[]>} 平台 key 数组
 */
async function getPlatformList(db) {
  const configs = await getPlatformConfigs(db);
  return configs.map(c => c.platform);
}

/**
 * 获取平台名称映射
 *
 * @param {Object} db - MongoDB 数据库实例
 * @returns {Promise<Object>} 平台名称映射对象
 */
async function getPlatformNames(db) {
  const configs = await getPlatformConfigs(db);
  return configs.reduce((acc, c) => {
    acc[c.platform] = c.name;
    return acc;
  }, {});
}

/**
 * 清除缓存（用于配置更新后）
 */
function clearCache() {
  platformConfigCache = null;
  cacheTime = null;
  console.log('[INFO] 平台配置缓存已清除');
}

module.exports = {
  getPlatformConfigs,
  getPlatformList,
  getPlatformNames,
  clearCache
};
