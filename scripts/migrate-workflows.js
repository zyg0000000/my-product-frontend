/**
 * 工作流数据迁移脚本
 * 从 kol_data (v1) 迁移到 agentworks_db (v2)
 *
 * 使用方法：node scripts/migrate-workflows.js
 */

const API_BASE_URL =
  'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';

async function fetchWorkflowsFromV1() {
  console.log('📖 从 kol_data (v1) 读取工作流...');

  const response = await fetch(
    `${API_BASE_URL}/automation-workflows?dbVersion=v1`
  );
  const result = await response.json();

  if (!result.success) {
    throw new Error(`读取 v1 工作流失败: ${result.message}`);
  }

  console.log(`   找到 ${result.data.length} 个工作流`);
  return result.data;
}

async function createWorkflowInV2(workflow) {
  // 移除 _id，让 MongoDB 生成新的
  const { _id, createdAt, updatedAt, ...workflowData } = workflow;

  // 添加 v2 必需的字段
  const v2Workflow = {
    ...workflowData,
    platform: workflow.platform || 'douyin',
    isActive: workflow.isActive !== undefined ? workflow.isActive : true,
    // 转换 requiredInput 到 inputConfig（如果需要）
    inputConfig: workflow.inputConfig || convertRequiredInputToConfig(workflow),
  };

  const response = await fetch(
    `${API_BASE_URL}/automation-workflows?dbVersion=v2`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(v2Workflow),
    }
  );

  const result = await response.json();

  if (!result.success) {
    throw new Error(`创建工作流失败: ${result.message}`);
  }

  return result.data.insertedId;
}

function convertRequiredInputToConfig(workflow) {
  const inputKey =
    typeof workflow.requiredInput === 'object'
      ? workflow.requiredInput.key
      : workflow.requiredInput;

  if (!inputKey) return null;

  const inputConfigMap = {
    xingtuId: {
      key: 'xingtuId',
      label: '星图ID',
      placeholder: '请输入星图达人ID',
      platform: 'douyin',
      idSource: 'talent',
      idField: 'platformSpecific.xingtuId',
      required: true,
    },
    taskId: {
      key: 'taskId',
      label: '星图任务ID',
      placeholder: '请输入星图任务ID',
      platform: 'douyin',
      idSource: 'collaboration',
      idField: 'taskId',
      required: true,
    },
    videoId: {
      key: 'videoId',
      label: '视频ID',
      placeholder: '请输入视频ID',
      platform: 'douyin',
      idSource: 'collaboration',
      idField: 'videoId',
      required: true,
    },
    url: {
      key: 'url',
      label: 'URL',
      placeholder: '请输入完整URL地址',
      idSource: 'custom',
      required: true,
    },
  };

  return (
    inputConfigMap[inputKey] || {
      key: inputKey,
      label: workflow.inputLabel || inputKey,
      idSource: 'custom',
      required: true,
    }
  );
}

async function migrate() {
  console.log('🚀 开始迁移工作流数据...\n');
  console.log('   源数据库: kol_data (dbVersion=v1)');
  console.log('   目标数据库: agentworks_db (dbVersion=v2)\n');

  try {
    // 1. 读取 v1 数据
    const workflows = await fetchWorkflowsFromV1();

    if (workflows.length === 0) {
      console.log('⚠️  v1 数据库中没有工作流，无需迁移');
      return;
    }

    // 2. 逐个创建到 v2
    console.log('\n📝 开始写入 agentworks_db (v2)...\n');

    let successCount = 0;
    let failCount = 0;

    for (const workflow of workflows) {
      try {
        const newId = await createWorkflowInV2(workflow);
        console.log(`   ✅ ${workflow.name} -> ${newId}`);
        successCount++;
      } catch (error) {
        console.log(`   ❌ ${workflow.name}: ${error.message}`);
        failCount++;
      }
    }

    // 3. 输出结果
    console.log('\n========================================');
    console.log('📊 迁移完成！');
    console.log(`   成功: ${successCount}`);
    console.log(`   失败: ${failCount}`);
    console.log('========================================\n');
  } catch (error) {
    console.error('\n❌ 迁移失败:', error.message);
    process.exit(1);
  }
}

migrate();
