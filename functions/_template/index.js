/**
 * 云函数模板
 * @description 这是一个云函数模板，用于创建新的云函数时参考
 * @version 1.0.0
 */

exports.handler = async (event) => {
    try {
        // 1. 解析请求参数
        const body = event.body ? JSON.parse(event.body) : {};
        const { param1, param2 } = body;

        console.log('收到请求:', { param1, param2 });

        // 2. 参数验证
        if (!param1) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: '缺少必需参数: param1'
                })
            };
        }

        // 3. 业务逻辑处理
        // TODO: 在这里实现具体的业务逻辑
        const result = {
            message: '处理成功',
            data: {
                param1,
                param2,
                timestamp: new Date().toISOString()
            }
        };

        // 4. 返回成功结果
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({
                success: true,
                data: result
            })
        };

    } catch (error) {
        // 5. 错误处理
        console.error('云函数执行出错:', error);

        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: error.message || '服务器内部错误'
            })
        };
    }
};
