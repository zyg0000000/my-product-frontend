/**
 * @file utils.js
 * @description 飞书数据同步工具函数
 * @version 11.4.1
 * @changelog
 * - v11.0: 添加 manualDailyUpdate 支持
 * - v11.1: manualDailyUpdate 日志优化
 * - v11.2: Sheet Generation Fix - 移除错误的 $addFields
 * - v11.3: TalentImport Null Safety Fix + parseFlexibleNumber 函数
 * - v11.4: 添加数据库批量更新到 handleTalentImport
 * - v11.4.1: 使用点表示法更新 performanceData，添加 lastUpdated 字段
 */

const { MongoClient } = require('mongodb');
const axios = require('axios');

// MongoDB 连接配置
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'kol_data';

// 飞书 API 配置
const FEISHU_APP_ID = process.env.FEISHU_APP_ID;
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET;

let cachedDb = null;
let cachedClient = null;

/**
 * 获取 MongoDB 连接
 */
async function connectToDatabase() {
    if (cachedDb && cachedClient) {
        return { db: cachedDb, client: cachedClient };
    }

    const client = await MongoClient.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

    const db = client.db(DB_NAME);
    cachedDb = db;
    cachedClient = client;

    return { db, client };
}

/**
 * 获取飞书 access_token
 */
async function getFeishuAccessToken() {
    try {
        const response = await axios.post(
            'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
            {
                app_id: FEISHU_APP_ID,
                app_secret: FEISHU_APP_SECRET,
            }
        );

        if (response.data.code === 0) {
            return response.data.tenant_access_token;
        } else {
            throw new Error(`获取 access_token 失败: ${response.data.msg}`);
        }
    } catch (error) {
        console.error('获取飞书 access_token 错误:', error.message);
        throw error;
    }
}

/**
 * 从飞书表格读取数据
 */
async function readFeishuSheet(spreadsheetToken, sheetId, range) {
    try {
        const accessToken = await getFeishuAccessToken();

        const url = `https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/${spreadsheetToken}/values/${sheetId}!${range}`;

        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (response.data.code === 0) {
            return response.data.data.valueRange.values;
        } else {
            throw new Error(`读取飞书表格失败: ${response.data.msg}`);
        }
    } catch (error) {
        console.error('读取飞书表格错误:', error.message);
        throw error;
    }
}

/**
 * 解析灵活格式的数字
 * 支持：百分比、千分位分隔符、"万"单位
 */
function parseFlexibleNumber(value, isPercentage = false) {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return 0;

    // 移除千分位分隔符
    let numStr = value.replace(/,/g, '').trim();

    // 处理百分比
    if (isPercentage || numStr.endsWith('%')) {
        const num = parseFloat(numStr.replace('%', ''));
        return isNaN(num) ? 0 : num / 100;
    }

    // 处理"万"单位
    if (numStr.toLowerCase().endsWith('w') || numStr.includes('万')) {
        const num = parseFloat(numStr.replace(/w|万/gi, ''));
        return isNaN(num) ? 0 : num * 10000;
    }

    // 普通数字
    const num = parseFloat(numStr);
    return isNaN(num) ? 0 : num;
}

/**
 * 处理达人表现数据导入
 */
async function handleTalentImport(db, spreadsheetToken) {
    console.log('[导入] 开始从表格读取达人表现数据...');
    console.log('[导入] 表格Token:', spreadsheetToken);

    const talentsCollection = db.collection('talents');

    try {
        // 读取表格数据（假设数据在第一个sheet）
        const sheetData = await readFeishuSheet(spreadsheetToken, 'Sheet1', 'A1:ZZ2000');

        console.log(`[导入] 读取到 ${sheetData.length} 行数据`);

        if (sheetData.length === 0) {
            throw new Error('表格数据为空');
        }

        // 第一行是表头
        const header = sheetData[0];
        const dataRows = sheetData.slice(1);

        console.log(`[导入] 表头列数: ${header.length}`);

        // 创建表头映射（添加 null 检查）
        const headerMap = new Map(
            header
                .map((col, i) => {
                    const colName = (col && typeof col === 'string') ? col.trim() : '';
                    return [colName, i];
                })
                .filter(([colName]) => colName !== '')
        );

        console.log(`[导入] 有效表头数: ${headerMap.size}`);

        // 定义字段映射（飞书表格列名 -> 数据库字段名）
        const fieldMapping = {
            '达人id': 'xingtuId',

            // 核心绩效
            '60s+预期CPM': 'cpm60s',

            // 核心受众
            '男性观众比例': 'maleAudienceRatio',
            '女性观众比例': 'femaleAudienceRatio',
            '18-40岁观众占比': 'audience_18_40_ratio',
            '40岁以上观众占比': 'audience_40_plus_ratio',

            // 年龄段粉丝比例
            '18-23岁': 'ratio_18_23',
            '24-30岁': 'ratio_24_30',
            '31-40岁': 'ratio_31_40',
            '41-50岁': 'ratio_41_50',
            '50岁以上': 'ratio_50_plus',

            // 人群包粉丝比例
            '小镇中老年粉丝比例': 'ratio_town_middle_aged',
            '资深中产粉丝比例': 'ratio_senior_middle_class',
            'Z时代粉丝比例': 'ratio_z_era',
            '都市银发粉丝比例': 'ratio_urban_silver',
            '小镇青年粉丝比例': 'ratio_town_youth',
            '精致妈妈粉丝比例': 'ratio_exquisite_mom',
            '新锐白领粉丝比例': 'ratio_new_white_collar',
            '都市蓝领粉丝比例': 'ratio_urban_blue_collar',

            // 近期表现数据
            '近7日新增粉丝数': 'recentFollowerGrowth',
            '近7日视频平均播放量': 'recentAvgViews',
            '近7日视频平均点赞数': 'recentAvgLikes',
            '近7日视频平均评论数': 'recentAvgComments',
            '近7日视频平均分享数': 'recentAvgShares',
            '近7日互动率': 'recentEngagementRate',
            '近30日新增粉丝数': 'monthly30FollowerGrowth',
            '近30日视频平均播放量': 'monthly30AvgViews',
            '近30日视频平均点赞数': 'monthly30AvgLikes',
            '近30日视频平均评论数': 'monthly30AvgComments',
            '近30日视频平均分享数': 'monthly30AvgShares',
            '近30日互动率': 'monthly30EngagementRate',
        };

        // 百分比字段
        const percentageFields = new Set([
            // 核心受众百分比
            '男性观众比例',
            '女性观众比例',
            '18-40岁观众占比',
            '40岁以上观众占比',

            // 年龄段粉丝比例
            '18-23岁',
            '24-30岁',
            '31-40岁',
            '41-50岁',
            '50岁以上',

            // 人群包粉丝比例
            '小镇中老年粉丝比例',
            '资深中产粉丝比例',
            'Z时代粉丝比例',
            '都市银发粉丝比例',
            '小镇青年粉丝比例',
            '精致妈妈粉丝比例',
            '新锐白领粉丝比例',
            '都市蓝领粉丝比例',

            // 近期互动率
            '近7日互动率',
            '近30日互动率'
        ]);

        // 统计信息
        const stats = {
            total: dataRows.length,
            processed: 0,
            skipped: 0,
            skipReasons: {
                noId: 0
            },
            dbUpdated: 0,
            dbFailed: 0
        };

        const processedData = [];

        // 处理每一行数据
        for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
            const row = dataRows[rowIndex];

            // 获取达人ID
            const idIndex = headerMap.get('达人id');
            if (idIndex === undefined) {
                console.error('[导入] 表头中未找到"达人id"列');
                throw new Error('表头中未找到"达人id"列');
            }

            const xingtuId = row[idIndex];

            // 跳过没有ID的行
            if (!xingtuId || xingtuId.toString().trim() === '') {
                stats.skipped++;
                stats.skipReasons.noId++;
                continue;
            }

            // 构建 performanceData 对象
            const performanceData = {};

            for (const [headerName, fieldName] of Object.entries(fieldMapping)) {
                const colIndex = headerMap.get(headerName);
                if (colIndex !== undefined && row[colIndex] !== undefined) {
                    const rawValue = row[colIndex];
                    const isPercentage = percentageFields.has(headerName);
                    performanceData[fieldName] = parseFlexibleNumber(rawValue, isPercentage);
                }
            }

            processedData.push({
                xingtuId: xingtuId.toString().trim(),
                performanceData
            });

            stats.processed++;
        }

        console.log(`[导入] 数据解析完成: 成功 ${stats.processed} 条, 跳过 ${stats.skipped} 条`);

        // 批量更新数据库（v11.4.1 - 使用点表示法）
        const bulkOps = [];
        const currentTime = new Date();

        console.log('[导入] 准备批量更新数据库...');

        for (const talent of processedData) {
            const updateFields = {};

            // 使用点表示法更新 performanceData 的各个字段
            // 这样可以保留 performanceData 中其他未被更新的字段
            for (const [key, value] of Object.entries(talent.performanceData)) {
                updateFields[`performanceData.${key}`] = value;
            }

            // 添加 lastUpdated 时间戳到 performanceData
            updateFields['performanceData.lastUpdated'] = currentTime;

            // 更新文档的 updatedAt 时间戳
            updateFields['updatedAt'] = currentTime;

            bulkOps.push({
                updateOne: {
                    filter: { xingtuId: talent.xingtuId },
                    update: { $set: updateFields },
                    upsert: false
                }
            });
        }

        if (bulkOps.length > 0) {
            try {
                const bulkResult = await talentsCollection.bulkWrite(bulkOps, { ordered: false });

                stats.dbUpdated = bulkResult.matchedCount;
                stats.dbFailed = bulkOps.length - bulkResult.matchedCount;

                console.log(`[导入] 数据库更新完成: 匹配 ${bulkResult.matchedCount} 条, 修改 ${bulkResult.modifiedCount} 条`);
            } catch (bulkError) {
                console.error('[导入] 批量更新失败:', bulkError.message);
                stats.dbFailed = bulkOps.length;
            }
        }

        // 输出统计信息
        console.log('[导入] ========== 导入统计 ==========');
        console.log(`[导入] 总行数: ${stats.total}`);
        console.log(`[导入] 解析成功: ${stats.processed} 条`);
        console.log(`[导入] 数据库更新: ${stats.dbUpdated} 条`);
        console.log(`[导入] 更新失败: ${stats.dbFailed} 条`);
        console.log(`[导入] 跳过: ${stats.skipped} 条`);
        console.log(`[导入]   - 缺少达人id: ${stats.skipReasons.noId} 条`);
        console.log('[导入] ==================================');

        return {
            success: true,
            stats
        };

    } catch (error) {
        console.error('[导入] 处理失败:', error.message);
        throw error;
    }
}

/**
 * 处理项目日报数据同步
 */
async function handleProjectDailyUpdate(db, payload) {
    console.log('[日报] 开始同步项目日报数据...');

    const { spreadsheetToken, manualDailyUpdate } = payload;

    if (manualDailyUpdate) {
        console.log('[日报] 手动日报更新模式');
    }

    const projectsCollection = db.collection('projects');

    try {
        // 读取表格数据
        const sheetData = await readFeishuSheet(spreadsheetToken, 'Sheet1', 'A1:Z1000');

        console.log(`[日报] 读取到 ${sheetData.length} 行数据`);

        if (sheetData.length === 0) {
            throw new Error('表格数据为空');
        }

        const header = sheetData[0];
        const dataRows = sheetData.slice(1);

        // 创建表头映射
        const headerMap = new Map(
            header.map((col, i) => [(col && typeof col === 'string') ? col.trim() : '', i])
                .filter(([colName]) => colName !== '')
        );

        // 统计信息
        let processedCount = 0;
        let skippedCount = 0;

        for (const row of dataRows) {
            const projectIdIndex = headerMap.get('项目ID');
            if (projectIdIndex === undefined || !row[projectIdIndex]) {
                skippedCount++;
                continue;
            }

            const projectId = row[projectIdIndex].toString().trim();

            // 构建日报数据
            const dailyData = {};

            // 这里添加具体的日报字段映射逻辑
            // ...

            // 更新数据库
            await projectsCollection.updateOne(
                { projectId },
                {
                    $set: {
                        dailyReport: dailyData,
                        updatedAt: new Date()
                    }
                }
            );

            processedCount++;
        }

        if (manualDailyUpdate) {
            console.log(`[日报] 手动更新完成: 处理 ${processedCount} 条, 跳过 ${skippedCount} 条`);
        } else {
            console.log(`[日报] 同步完成: 处理 ${processedCount} 条, 跳过 ${skippedCount} 条`);
        }

        return {
            success: true,
            processed: processedCount,
            skipped: skippedCount
        };

    } catch (error) {
        console.error('[日报] 同步失败:', error.message);
        throw error;
    }
}

/**
 * 主处理函数
 */
async function syncFromFeishu(payload) {
    const { dataType } = payload;

    console.log(`[同步] 数据类型: ${dataType}`);

    const { db } = await connectToDatabase();

    try {
        switch (dataType) {
            case 'talentPerformance':
                return await handleTalentImport(db, payload.payload.spreadsheetToken);

            case 'projectDaily':
                return await handleProjectDailyUpdate(db, payload.payload);

            default:
                throw new Error(`不支持的数据类型: ${dataType}`);
        }
    } catch (error) {
        console.error('[同步] 错误:', error.message);
        throw error;
    }
}

module.exports = {
    syncFromFeishu,
    connectToDatabase,
    getFeishuAccessToken,
    readFeishuSheet,
    parseFlexibleNumber,
};
