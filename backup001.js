/**
 * @file local-agent.js
 * @version 2.2 - Final Unabridged Version
 * @description 本地自动化代理主程序。
 * - [v2.2] 提供无缺省的完整代码。
 * - [v2.1] 统一了数据字段为 `xingtuId`。
 * - [v2.0] 实现了“启动时手动登录”的核心逻辑。
 */
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const { executeActions: executeWorkflow, handleLogin } = require('./puppeteer-executor');

// --- 配置 ---
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || 'kol_data';
const POLLING_INTERVAL = parseInt(process.env.POLLING_INTERVAL_MS, 10) || 5000;
const AGENT_ID = `agent-${uuidv4()}`;
const WATCH_MODE = process.argv.includes('--watch');

// --- 数据库客户端 ---
const client = new MongoClient(MONGO_URI);
let db;

/**
 * 暂停程序并等待用户按 Enter 键继续
 * @returns {Promise<void>}
 */
function askForContinue() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise(resolve => {
        console.log(`\n[AGENT] 登录成功并跳转到星图首页后，请回到本终端，按 Enter 键开始执行任务...`);
        rl.question('', () => {
            console.log('[AGENT] 已确认，开始轮询任务...');
            rl.close();
            resolve();
        });
    });
}


/**
 * 主处理函数
 */
async function processNextTask() {
    let task = null;
    try {
        const tasksCollection = db.collection('automation-tasks');
        const workflowsCollection = db.collection('automation-workflows');

        task = await tasksCollection.findOneAndUpdate(
            { status: 'pending' },
            { $set: { status: 'processing', agentId: AGENT_ID, processingAt: new Date() } },
            { sort: { createdAt: 1 }, returnDocument: 'after' }
        );

        if (!task) {
            if(WATCH_MODE) {
                const timestamp = new Date().toISOString();
                process.stdout.write(`[${timestamp}] 未发现待处理任务...\r`);
            }
            return false;
        }

        console.log(`\n[AGENT] 成功锁定任务: ${task._id}, 开始处理...`);

        let workflowId;
        if (ObjectId.isValid(task.workflowId)) {
            workflowId = new ObjectId(task.workflowId);
        } else {
            workflowId = new ObjectId(task.workflowId); 
        }
        
        const workflow = await workflowsCollection.findOne({ _id: workflowId });

        if (!workflow) {
            throw new Error(`数据库中无法找到 ID 为 ${task.workflowId} 的工作流。`);
        }
        if (!Array.isArray(workflow.steps)) {
            throw new Error(`工作流 '${workflow.name}' (ID: ${task.workflowId}) 的 'steps' 字段不是一个有效的数组，无法执行。`);
        }
        
        const executionResult = await executeWorkflow(workflow.steps, task.xingtuId);

        await tasksCollection.updateOne(
            { _id: new ObjectId(task._id) },
            { $set: executionResult }
        );

        console.log(`[AGENT] 任务 ${task._id} 处理完成，最终状态为 '${executionResult.status}'。`);
        
        return true;

    } catch (error) {
        console.error(`[AGENT] 处理任务时发生严重错误: ${error.message}`);
        if (task && task._id) {
            console.log(`[AGENT] 正在将任务 ${task._id} 的状态更新为 'failed'`);
            const tasksCollection = db.collection('automation-tasks');
            await tasksCollection.updateOne(
                { _id: new ObjectId(task._id) },
                {
                    $set: {
                        status: 'failed',
                        updatedAt: new Date(),
                        errorMessage: error.stack,
                    }
                }
            );
        }
        return false;
    }
}

/**
 * 主循环函数
 */
async function mainLoop() {
    await processNextTask();
    setTimeout(mainLoop, POLLING_INTERVAL);
}

/**
 * 程序入口
 */
async function start() {
    console.log(`[AGENT] 启动本地自动化代理... ID: ${AGENT_ID}`);
    console.log(`[AGENT] 运行模式: ${WATCH_MODE ? '常驻监听' : '按需执行'}`);
    try {
        await client.connect();
        db = client.db(DB_NAME);
        console.log('[DB] 成功连接到 MongoDB。');

        console.log('\n--- 登录流程 ---');
        await handleLogin();
        await askForContinue();
        
        console.log('\n--- 任务处理流程 ---');
        mainLoop();

    } catch (err) {
        console.error('[DB] 无法连接到 MongoDB，请检查 .env 文件中的 MONGO_URI 配置。', err);
        process.exit(1);
    }
}

start();