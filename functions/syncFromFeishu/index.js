/**
 * @file syncFromFeishu.js
 * @version 12.2.0
 * @date 2025-11-24
 * @changelog
 * - v12.2.0 (2025-11-24): 修复 DATA_SCHEMAS 中 screenshots 索引错误
 *   - 修正 utils.js 中 DATA_SCHEMAS 的 screenshots 定义
 *   - 添加缺失的 screenshots[3] (年龄分布)
 *   - 修正 [4][5][6] 的显示名称
 *   - 移除不存在的 [7]
 *   - 仅影响前端下拉框显示，不影响功能逻辑
 * - v12.1 (2025-11-20): Price Import Support
 *   - 支持价格数据导入
 * - v12.0 (2025-11-18): 模块化重构
 *   - 支持 v2 数据库，100% 向后兼容
 *
 * @description [重大升级] 支持 AgentWorks v2.0 达人表现数据导入 + 价格导入
 */
const { handleFeishuRequest } = require('./utils.js');

exports.handler = async (event, context) => {
    // 为CORS和JSON响应设置标准头
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', // 允许 GET 请求
        'Content-Type': 'application/json'
    };

    // 处理CORS预检请求
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    try {
        // 根据请求方法确定如何解析 body
        let body;
        if (event.httpMethod === 'POST') {
            body = JSON.parse(event.body || '{}');
        } else if (event.httpMethod === 'GET') {
            // 对于GET请求，我们将查询参数作为 payload
            body = {
                dataType: event.queryStringParameters.dataType,
                payload: event.queryStringParameters
            };
        } else {
            throw new AppError(`Unsupported HTTP method: ${event.httpMethod}`, 405);
        }
        
        // 将请求体直接传递给总调度函数处理
        const result = await handleFeishuRequest(body);

        // 返回一个成功的HTTP响应
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: result 
            }),
        };

    } catch (error) {
        console.error('An error occurred in the syncFromFeishu handler:', error);

        const statusCode = error.statusCode || 500;
        return {
            statusCode: statusCode,
            headers,
            body: JSON.stringify({
                success: false,
                message: `An error occurred: ${error.message}`
            }),
        };
    }
};

