/**
 * 模板数据迁移脚本
 *
 * 将 kol_data.mapping_templates 迁移到 agentworks_db.report_templates
 *
 * 使用方式:
 * MONGO_URI="mongodb+srv://..." node scripts/migrate-templates.js
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('错误: 请设置 MONGO_URI 环境变量');
  process.exit(1);
}

async function migrate() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('已连接到 MongoDB');

    // 源数据库和集合
    const sourceDb = client.db('kol_data');
    const sourceCollection = sourceDb.collection('mapping_templates');

    // 目标数据库和集合
    const targetDb = client.db('agentworks_db');
    const targetCollection = targetDb.collection('report_templates');

    // 获取源数据
    const templates = await sourceCollection.find({}).toArray();
    console.log(`找到 ${templates.length} 个模板待迁移`);

    if (templates.length === 0) {
      console.log('没有数据需要迁移');
      return;
    }

    // 转换并插入数据
    let migratedCount = 0;
    let skippedCount = 0;

    for (const template of templates) {
      // 检查目标集合是否已存在相同名称的模板
      const existing = await targetCollection.findOne({ name: template.name });
      if (existing) {
        console.log(`跳过已存在的模板: ${template.name}`);
        skippedCount++;
        continue;
      }

      // 转换数据结构
      const newTemplate = {
        name: template.name,
        description: template.description || '',
        spreadsheetToken: template.spreadsheetToken,
        feishuSheetHeaders: template.feishuSheetHeaders || [],
        mappingRules: template.mappingRules || {},
        allowedWorkflowIds: template.allowedWorkflowIds || [],
        type: 'registration', // 默认设为报名管理类型
        isActive: true,
        createdAt: template.createdAt || new Date(),
        updatedAt: template.updatedAt || new Date(),
      };

      await targetCollection.insertOne(newTemplate);
      console.log(`已迁移: ${template.name}`);
      migratedCount++;
    }

    console.log('\n========== 迁移完成 ==========');
    console.log(`总数: ${templates.length}`);
    console.log(`已迁移: ${migratedCount}`);
    console.log(`已跳过: ${skippedCount}`);

  } catch (error) {
    console.error('迁移错误:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('数据库连接已关闭');
  }
}

migrate();
