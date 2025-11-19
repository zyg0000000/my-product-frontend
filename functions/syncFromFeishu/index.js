/**
 * @file syncFromFeishu.js
 * @version 12.0 - Performance Import Upgrade
 * @description [重大升级] 支持 AgentWorks v2.0 达人表现数据导入
 *
 * --- v12.0 更新日志 (2025-11-18) ---
 * - [模块化重构] 拆分为独立模块（feishu-api, mapping-engine, talent-performance-processor）
 * - [配置驱动] 从数据库读取映射配置（field_mappings 集合）
 * - [多平台支持] 支持 platform 参数
 * - [v2数据库] 支持 agentworks_db
 * - [向后兼容] 100% 兼容 v1 调用（ByteProject）
 * - [可剥离性] 模块化设计，详细剥离文档，剥离成本 < 2天
 *
 * --- v4.0 更新日志 ---
 * - [升级] 适配新的 handleFeishuRequest 调度器，支持获取 schemas 等新操作。
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

