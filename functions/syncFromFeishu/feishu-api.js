/**
 * feishu-api.js - 飞书 API 封装层
 * @version 1.0
 *
 * --- v1.0 更新日志 (2025-11-18) ---
 * - [初始版本] 从 utils.js 中提取飞书API相关函数
 * - [独立模块] 完全独立，可剥离为独立服务或npm包
 * - [功能完整] 支持读取表格、写入图片、权限管理等
 *
 * 说明: 独立的飞书API调用模块，可剥离为独立服务或npm包
 * 依赖: axios
 * 可剥离性: ⭐⭐⭐⭐⭐ 完全独立，可直接复用
 */

const axios = require('axios');

// 环境变量
const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const FEISHU_OWNER_ID = process.env.FEISHU_OWNER_ID;
const FEISHU_SHARE_USER_IDS = process.env.FEISHU_SHARE_USER_IDS;

// Token缓存
let tenantAccessToken = null;
let tokenExpiresAt = 0;

/**
 * 获取飞书租户访问令牌（带缓存）
 */
async function getTenantAccessToken() {
  // 检查缓存
  if (Date.now() < tokenExpiresAt && tenantAccessToken) {
    return tenantAccessToken;
  }

  if (!APP_ID || !APP_SECRET) {
    throw new Error('FEISHU_APP_ID/APP_SECRET environment variables are not set.');
  }

  const response = await axios.post(
    'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
    { app_id: APP_ID, app_secret: APP_SECRET }
  );

  if (response.data.code !== 0) {
    throw new Error(`Failed to get tenant access token: ${response.data.msg}`);
  }

  tenantAccessToken = response.data.tenant_access_token;
  tokenExpiresAt = Date.now() + (response.data.expire - 300) * 1000;

  return tenantAccessToken;
}

/**
 * 从 URL 提取飞书表格 Token
 */
function getSpreadsheetTokenFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  if (!url.includes('/')) return url;

  try {
    const pathParts = new URL(url).pathname.split('/');
    const driveTypeIndex = pathParts.findIndex(part =>
      ['sheets', 'folder', 'spreadsheet'].includes(part)
    );

    if (driveTypeIndex > -1 && pathParts.length > driveTypeIndex + 1) {
      return pathParts[driveTypeIndex + 1];
    }
  } catch (error) {
    console.warn(`Could not parse URL: ${url}`, error);
  }

  console.warn(`Could not extract token from URL: ${url}. Returning the input string.`);
  return url;
}

/**
 * 读取飞书表格数据
 * @param {string} spreadsheetToken - 表格Token或URL
 * @param {string} range - 读取范围（可选，默认读取全部）
 * @returns {Array} 二维数组，第一行为表头
 */
async function readFeishuSheet(spreadsheetToken, range = null) {
  const token = await getTenantAccessToken();
  const actualToken = getSpreadsheetTokenFromUrl(spreadsheetToken);

  // 获取第一个Sheet的ID
  const sheetsResponse = await axios.get(
    `https://open.feishu.cn/open-apis/sheets/v3/spreadsheets/${actualToken}/sheets/query`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );

  if (sheetsResponse.data.code !== 0) {
    throw new Error(`Failed to get sheets info: ${sheetsResponse.data.msg}`);
  }

  const firstSheetId = sheetsResponse.data.data.sheets[0].sheet_id;

  // 读取数据
  const finalRange = range || `${firstSheetId}!A1:ZZ2000`;
  const urlEncodedRange = encodeURIComponent(
    finalRange.startsWith(firstSheetId) ? finalRange : `${firstSheetId}!${finalRange}`
  );

  console.log(`[飞书读取] 表格: ${actualToken}, 范围: ${decodeURIComponent(urlEncodedRange)}`);

  const valuesResponse = await axios.get(
    `https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/${actualToken}/values/${urlEncodedRange}?valueRenderOption=ToString`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );

  if (valuesResponse.data.code !== 0) {
    throw new Error(`Failed to read sheet values: ${valuesResponse.data.msg}`);
  }

  const rows = valuesResponse.data.data.valueRange.values || [];
  console.log(`[飞书读取] 成功读取 ${rows.length} 行数据`);

  return rows;
}

/**
 * 写入图片到飞书单元格
 * @param {string} spreadsheetToken - 表格Token
 * @param {string} range - 单元格范围（如 'A1:A1'）
 * @param {string} imageUrl - 图片URL
 * @param {string} imageName - 图片名称
 */
async function writeImageToCell(spreadsheetToken, range, imageUrl, imageName = 'image.png') {
  if (!imageUrl || !imageUrl.startsWith('http')) {
    console.log(`[图片] 无效的图片链接，跳过: ${imageUrl}`);
    return;
  }

  const token = await getTenantAccessToken();

  try {
    console.log(`[图片] 下载: ${imageUrl}`);
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(imageResponse.data, 'binary');
    const imageBase64 = imageBuffer.toString('base64');

    const payload = { range, image: imageBase64, name: imageName };

    console.log(`[图片] 写入到 ${range}`);
    const writeResponse = await axios.post(
      `https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/${spreadsheetToken}/values_image`,
      payload,
      { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    if (writeResponse.data.code !== 0) {
      console.error(`[图片] 写入失败: ${writeResponse.data.msg}`);
    } else {
      console.log(`[图片] 写入成功`);
    }
  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`[图片] 处理失败: ${errorMessage}`);
  }
}

/**
 * 转移飞书文件所有权
 */
async function transferOwner(fileToken) {
  if (!FEISHU_OWNER_ID) {
    console.log('[权限] 未配置 FEISHU_OWNER_ID, 跳过所有权转移');
    return false;
  }

  const token = await getTenantAccessToken();

  try {
    console.log(`[权限] 转移所有权给: ${FEISHU_OWNER_ID}`);
    await axios.post(
      `https://open.feishu.cn/open-apis/drive/v1/permissions/${fileToken}/members/transfer_owner`,
      { member_type: 'userid', member_id: FEISHU_OWNER_ID },
      {
        headers: { 'Authorization': `Bearer ${token}` },
        params: {
          type: 'sheet',
          need_notification: true,
          remove_old_owner: false,
          stay_put: false,
          old_owner_perm: 'full_access'
        }
      }
    );
    console.log('[权限] 所有权转移成功');
    return true;
  } catch (error) {
    console.error('[权限] 转移失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 授予编辑权限
 */
async function grantEditPermissions(fileToken) {
  if (!FEISHU_SHARE_USER_IDS) {
    console.log('[权限] 未配置 FEISHU_SHARE_USER_IDS, 跳过权限授予');
    return;
  }

  const userIds = FEISHU_SHARE_USER_IDS.split(',').map(id => id.trim()).filter(Boolean);
  if (userIds.length === 0) return;

  const token = await getTenantAccessToken();

  console.log(`[权限] 授予编辑权限给 ${userIds.length} 位用户`);

  for (const userId of userIds) {
    try {
      await axios.post(
        `https://open.feishu.cn/open-apis/drive/v1/permissions/${fileToken}/members`,
        { member_type: 'user', member_id: userId, perm: 'edit' },
        { headers: { 'Authorization': `Bearer ${token}` }, params: { type: 'sheet' } }
      );
      console.log(`[权限] 授予成功: ${userId}`);
    } catch (error) {
      console.error(`[权限] 授予失败: ${userId}`, error.response?.data || error.message);
    }
  }
}

module.exports = {
  getTenantAccessToken,
  getSpreadsheetTokenFromUrl,
  readFeishuSheet,
  writeImageToCell,
  transferOwner,
  grantEditPermissions
};
