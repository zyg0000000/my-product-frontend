/**
 * getPerformanceHistory - 获取达人历史表现数据
 * @version 1.1
 *
 * 功能：查询 talent_performance 集合的历史快照数据，用于趋势分析
 *
 * 请求参数（GET query string）：
 * - platform: 平台（必填）
 * - oneIds: 达人 oneId 列表，逗号分隔（必填，最多5个）
 * - metrics: 指标列表，逗号分隔（必填）
 * - startDate: 开始日期 YYYY-MM-DD（必填）
 * - endDate: 结束日期 YYYY-MM-DD（必填）
 *
 * 响应格式：
 * {
 *   success: true,
 *   data: {
 *     talents: [{ oneId, name }],
 *     series: [{ date, talent_001: { metric1: value }, ... }]
 *   }
 * }
 */

const { MongoClient } = require('mongodb');

// MongoDB 连接配置
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://...';
const DB_NAME = 'agentworks_db';

let cachedClient = null;

async function getMongoClient() {
  if (cachedClient) {
    return cachedClient;
  }
  cachedClient = new MongoClient(MONGO_URI);
  await cachedClient.connect();
  return cachedClient;
}

// HTTP 响应头
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event, context) => {
  // 处理 CORS 预检请求
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  console.log('[getPerformanceHistory] 开始处理请求');

  try {
    // 1. 解析参数（从 query string）
    const params = event.queryStringParameters || {};
    const { platform, oneIds, metrics, startDate, endDate } = params;

    // 参数验证
    if (!platform) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: '缺少必填参数: platform' }) };
    }
    if (!oneIds) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: '缺少必填参数: oneIds' }) };
    }
    if (!metrics) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: '缺少必填参数: metrics' }) };
    }
    if (!startDate || !endDate) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: '缺少必填参数: startDate 或 endDate' }) };
    }

    // 解析列表参数
    const oneIdList = oneIds.split(',').map(id => id.trim()).filter(Boolean);
    const metricList = metrics.split(',').map(m => m.trim()).filter(Boolean);

    if (oneIdList.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'oneIds 不能为空' }) };
    }
    if (oneIdList.length > 5) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: '最多支持5个达人对比' }) };
    }
    if (metricList.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'metrics 不能为空' }) };
    }

    console.log('[getPerformanceHistory] 参数: platform=' + platform + ', oneIds=' + oneIdList.length + '个, metrics=' + metricList.length + '个');
    console.log('[getPerformanceHistory] 时间范围: ' + startDate + ' ~ ' + endDate);

    // 2. 连接数据库
    const client = await getMongoClient();
    const db = client.db(DB_NAME);

    // 3. 查询达人基础信息
    const talentsCollection = db.collection('talents');
    const talentDocs = await talentsCollection
      .find(
        { oneId: { $in: oneIdList }, platform },
        { projection: { oneId: 1, name: 1, nickname: 1 } }
      )
      .toArray();

    const talentMap = new Map();
    talentDocs.forEach(t => {
      talentMap.set(t.oneId, {
        oneId: t.oneId,
        name: t.name || t.nickname || t.oneId,
      });
    });

    // 补充未找到的达人
    oneIdList.forEach(oneId => {
      if (!talentMap.has(oneId)) {
        talentMap.set(oneId, { oneId, name: oneId });
      }
    });

    const talents = oneIdList.map(id => talentMap.get(id));

    // 4. 查询历史表现数据
    const performanceCollection = db.collection('talent_performance');

    // 构建投影：只返回需要的指标字段
    const projection = {
      oneId: 1,
      snapshotDate: 1,
    };
    metricList.forEach(metric => {
      projection['metrics.' + metric] = 1;
    });

    const performanceDocs = await performanceCollection
      .find(
        {
          oneId: { $in: oneIdList },
          platform,
          snapshotDate: {
            $gte: startDate,
            $lte: endDate,
          },
        },
        { projection }
      )
      .sort({ snapshotDate: 1 })
      .toArray();

    console.log('[getPerformanceHistory] 查询到 ' + performanceDocs.length + ' 条历史记录');

    // 5. 转换为时间序列格式
    const dateMap = new Map(); // date -> { talent_001: { metric: value }, ... }

    performanceDocs.forEach(doc => {
      const date = doc.snapshotDate;
      if (!dateMap.has(date)) {
        dateMap.set(date, { date });
      }

      const entry = dateMap.get(date);
      const talentData = {};

      metricList.forEach(metric => {
        const value = doc.metrics && doc.metrics[metric];
        if (value !== undefined && value !== null) {
          talentData[metric] = value;
        }
      });

      if (Object.keys(talentData).length > 0) {
        entry[doc.oneId] = talentData;
      }
    });

    // 按日期排序
    const series = Array.from(dateMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    console.log('[getPerformanceHistory] 返回 ' + series.length + ' 个时间点数据');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          talents,
          series,
          meta: {
            platform,
            metrics: metricList,
            dateRange: { start: startDate, end: endDate },
            totalRecords: performanceDocs.length,
          },
        },
      }),
    };
  } catch (error) {
    console.error('[getPerformanceHistory] 错误:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || '查询历史数据失败',
      }),
    };
  }
};
