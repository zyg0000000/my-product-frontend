/**
 * @file dataMigration/index.js
 * @version 1.1 - 数据迁移云函数
 * @description ByteProject (kol_data) → AgentWorks (agentworks_db) 数据迁移云函数
 *
 * 支持的操作:
 * - listSourceProjects: 获取源项目列表（kol_data）
 * - validateTalents: 校验项目涉及的达人是否已在 agentworks 中存在
 * - migrateProject: 迁移项目基础信息
 * - migrateCollaborations: 迁移合作记录
 * - migrateEffects: 迁移效果数据（T7/T21/T30）
 * - migrateDailyStats: 迁移日报数据（dailyStats）
 * - validateMigration: 验证迁移结果（含日报数据对比）
 * - rollbackMigration: 回滚迁移
 */
const { MongoClient } = require('mongodb');

// --- 环境变量与数据库连接 ---
const MONGO_URI = process.env.MONGO_URI;
const DB_SOURCE = 'kol_data'; // 源数据库
const DB_TARGET = 'agentworks_db'; // 目标数据库

let client;
async function connectToDatabase() {
  if (client && client.topology && client.topology.isConnected()) {
    return client;
  }
  client = new MongoClient(MONGO_URI);
  await client.connect();
  return client;
}

// --- 状态映射表 ---
const PROJECT_STATUS_MAP = {
  '执行中': 'executing',
  '已完成': 'settled',
  '已暂停': 'pending_settlement',
  '已归档': 'closed',
};

// 合作状态已确认完全一致，无需映射

// --- ID 生成 ---
function generateId(prefix) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

// --- 预算字符串解析 ---
function parseBudget(budgetStr) {
  if (!budgetStr) return 0;
  if (typeof budgetStr === 'number') return Math.round(budgetStr * 100); // 已经是数字，转分
  const str = String(budgetStr).trim();
  const match = str.match(/^(\d+(?:\.\d+)?)(万)?$/);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = match[2];
  // 万 = 10000，转为分需要 * 100
  return unit === '万' ? Math.round(value * 10000 * 100) : Math.round(value * 100);
}

// --- 折扣时间段匹配 ---
// 根据项目财务月份找到对应时间段的配置
function findMatchingDiscountConfig(configs, financialYear, financialMonth) {
  if (!configs || configs.length === 0) return null;

  // 将财务月转为日期（月初）
  const monthNum = parseInt(financialMonth.replace('M', ''), 10);
  const projectDateStr = `${financialYear}-${String(monthNum).padStart(2, '0')}-01`;

  // 1. 优先查找日期范围匹配的配置
  for (const config of configs) {
    if (config.validFrom && config.validTo) {
      // 直接比较日期字符串（YYYY-MM-DD 格式可直接比较）
      if (projectDateStr >= config.validFrom && projectDateStr <= config.validTo) {
        return config;
      }
    }
  }

  // 2. 兜底：查找长期有效的配置
  const permanent = configs.find(c => c.isPermanent);
  if (permanent) return permanent;

  // 3. 都没有匹配，返回第一个配置作为默认
  return configs[0] || null;
}

// --- 根据配置计算报价系数 ---
// 与前端 calculateCoefficientFromConfig 保持一致
function calculateCoefficientFromConfig(config) {
  if (!config) return null;

  const baseAmount = 1000;
  const platformFeeAmount = baseAmount * (config.platformFeeRate || 0);
  const discountRate = config.discountRate || 1.0;

  let discountedAmount;
  if (config.includesPlatformFee) {
    discountedAmount = (baseAmount + platformFeeAmount) * discountRate;
  } else {
    discountedAmount = baseAmount * discountRate + platformFeeAmount;
  }

  let serviceFeeAmount = 0;
  if (config.serviceFeeBase === 'beforeDiscount') {
    serviceFeeAmount = (baseAmount + platformFeeAmount) * (config.serviceFeeRate || 0);
  } else {
    serviceFeeAmount = discountedAmount * (config.serviceFeeRate || 0);
  }

  let taxAmount = 0;
  if (config.includesTax && config.taxRate) {
    const taxRate = config.taxRate;
    if (config.taxCalculationBase === 'excludeServiceFee') {
      taxAmount = discountedAmount * taxRate;
    } else {
      taxAmount = (discountedAmount + serviceFeeAmount) * taxRate;
    }
  }

  const finalAmount = discountedAmount + serviceFeeAmount + taxAmount;
  const coefficient = finalAmount / baseAmount;

  // 保留 5 位小数以确保精度（与原系统一致）
  return Number(coefficient.toFixed(5));
}

// --- 操作处理器 ---
const operations = {
  /**
   * 获取源项目列表
   */
  listSourceProjects: async (dbClient, params) => {
    const sourceDb = dbClient.db(DB_SOURCE);
    const targetDb = dbClient.db(DB_TARGET);

    const projects = await sourceDb.collection('projects').find({}).toArray();

    // 获取每个项目的合作数和效果数
    const result = await Promise.all(
      projects.map(async (project) => {
        const collabCount = await sourceDb
          .collection('collaborations')
          .countDocuments({ projectId: project.id });

        const worksCount = await sourceDb
          .collection('works')
          .countDocuments({ projectId: project.id });

        // 检查是否已迁移到目标库（通过名称匹配）
        const existingProject = await targetDb
          .collection('projects')
          .findOne({ name: project.name });

        // 判断迁移状态
        let migrationStatus = 'pending';
        let hasCollaborations = false;
        let hasEffects = false;

        if (existingProject) {
          // 检查合作记录是否已迁移
          const targetCollabCount = await targetDb
            .collection('collaborations')
            .countDocuments({ projectId: existingProject.id });

          hasCollaborations = targetCollabCount > 0;

          // 检查效果数据是否已迁移（有 effectData 的合作记录数）
          const targetWithEffects = await targetDb
            .collection('collaborations')
            .countDocuments({
              projectId: existingProject.id,
              effectData: { $exists: true, $ne: null }
            });

          hasEffects = targetWithEffects > 0;

          // 判断迁移状态
          if (hasCollaborations && (hasEffects || worksCount === 0)) {
            migrationStatus = 'completed';
          } else {
            migrationStatus = 'partial'; // 部分迁移
          }
        }

        return {
          id: project.id,
          name: project.name,
          status: project.status,
          financialYear: project.financialYear,
          financialMonth: project.financialMonth,
          discount: project.discount,
          budget: project.budget,
          collaborationCount: collabCount,
          worksCount: worksCount,
          migrationStatus,
          migratedProjectId: existingProject?.id || null,
          targetProjectId: existingProject?.id || null,
          hasCollaborations,
          hasEffects,
        };
      })
    );

    return {
      success: true,
      count: result.length,
      data: result,
    };
  },

  /**
   * 校验达人
   */
  validateTalents: async (dbClient, params) => {
    const { projectId } = params;
    if (!projectId) {
      return { success: false, message: '缺少 projectId 参数' };
    }

    const sourceDb = dbClient.db(DB_SOURCE);
    const targetDb = dbClient.db(DB_TARGET);

    // 获取项目相关的所有合作记录
    const collaborations = await sourceDb
      .collection('collaborations')
      .find({ projectId })
      .toArray();

    const talentIds = [...new Set(collaborations.map((c) => c.talentId))];

    // 获取源库达人信息（主要是 xingtuId）
    const sourceTalents = await sourceDb
      .collection('talents')
      .find({ id: { $in: talentIds } })
      .toArray();

    const sourceTalentMap = new Map(sourceTalents.map((t) => [t.id, t]));

    // 提取所有 xingtuId
    const xingtuIds = sourceTalents
      .map((t) => t.xingtuId)
      .filter((id) => id);

    // 在目标库中查找匹配的达人
    const targetTalents = await targetDb
      .collection('talents')
      .find({
        platform: 'douyin',
        platformAccountId: { $in: xingtuIds },
      })
      .toArray();

    const targetTalentMap = new Map(
      targetTalents.map((t) => [t.platformAccountId, t])
    );

    // 构建匹配结果
    const matched = [];
    const unmatched = [];

    for (const talentId of talentIds) {
      const sourceTalent = sourceTalentMap.get(talentId);
      if (!sourceTalent) {
        unmatched.push({
          talentId,
          nickname: '未知',
          xingtuId: null,
          reason: '源库中未找到达人信息',
        });
        continue;
      }

      const targetTalent = targetTalentMap.get(sourceTalent.xingtuId);
      if (targetTalent) {
        matched.push({
          sourceTalentId: talentId,
          targetOneId: targetTalent.oneId,
          nickname: sourceTalent.nickname || targetTalent.name,
          xingtuId: sourceTalent.xingtuId,
        });
      } else {
        unmatched.push({
          talentId,
          nickname: sourceTalent.nickname,
          xingtuId: sourceTalent.xingtuId,
          reason: 'AgentWorks 中未找到匹配的达人',
        });
      }
    }

    return {
      success: true,
      projectId,
      totalTalents: talentIds.length,
      matched,
      unmatched,
      canProceed: unmatched.length === 0,
    };
  },

  /**
   * 迁移项目基础信息
   */
  migrateProject: async (dbClient, params) => {
    const { sourceProjectId, customerId = 'CUS20250001' } = params;
    if (!sourceProjectId) {
      return { success: false, message: '缺少 sourceProjectId 参数' };
    }

    const sourceDb = dbClient.db(DB_SOURCE);
    const targetDb = dbClient.db(DB_TARGET);

    // 获取源项目
    const sourceProject = await sourceDb
      .collection('projects')
      .findOne({ id: sourceProjectId });

    if (!sourceProject) {
      return { success: false, message: `未找到源项目: ${sourceProjectId}` };
    }

    // 检查是否已迁移
    const existingProject = await targetDb
      .collection('projects')
      .findOne({ name: sourceProject.name });

    if (existingProject) {
      return {
        success: false,
        message: `项目 "${sourceProject.name}" 已存在于目标库中`,
        existingProjectId: existingProject.id,
      };
    }

    // 获取客户信息和折扣配置
    const customer = await targetDb
      .collection('customers')
      .findOne({ code: customerId });

    let discountConfig = null;
    let customerDiscount = null;
    let customerPricingModel = 'framework'; // 默认框架模式
    let customerQuotationCoefficient = null;

    const talentProcurement = customer?.businessStrategies?.talentProcurement;
    if (talentProcurement?.platformPricingConfigs?.douyin) {
      const douyinConfig = talentProcurement.platformPricingConfigs.douyin;
      // 获取定价模式
      customerPricingModel = douyinConfig.pricingModel || 'framework';

      if (douyinConfig.configs) {
        // 根据项目财务月份找到对应的配置
        discountConfig = findMatchingDiscountConfig(
          douyinConfig.configs,
          sourceProject.financialYear,
          sourceProject.financialMonth
        );
        customerDiscount = discountConfig?.discountRate;
        // 根据该时间段配置计算报价系数（而不是直接用客户当前系数）
        customerQuotationCoefficient = calculateCoefficientFromConfig(discountConfig);
      }
    }

    // 解析源折扣
    const sourceDiscount = parseFloat(sourceProject.discount) || null;

    // 生成新项目 ID
    const newProjectId = generateId('proj');

    // 构建目标项目数据
    const targetProject = {
      id: newProjectId,
      name: sourceProject.name,
      status: PROJECT_STATUS_MAP[sourceProject.status] || 'executing',
      businessType: ['talentProcurement'], // 数组格式，与新系统一致
      businessTag: null, // 新系统字段，迁移时为空
      type: null, // 新系统字段，迁移时为空
      dbVersion: 'v2', // 标记为 v2 版本数据

      // 时间（确保为数字类型）
      financialYear: typeof sourceProject.financialYear === 'string'
        ? parseInt(sourceProject.financialYear, 10)
        : sourceProject.financialYear,
      financialMonth: typeof sourceProject.financialMonth === 'string' && sourceProject.financialMonth.startsWith('M')
        ? parseInt(sourceProject.financialMonth.replace('M', ''), 10)
        : (typeof sourceProject.financialMonth === 'string' ? parseInt(sourceProject.financialMonth, 10) : sourceProject.financialMonth),
      year: typeof sourceProject.financialYear === 'string'
        ? parseInt(sourceProject.financialYear, 10)
        : sourceProject.financialYear,
      month: typeof sourceProject.financialMonth === 'string' && sourceProject.financialMonth.startsWith('M')
        ? parseInt(sourceProject.financialMonth.replace('M', ''), 10)
        : (typeof sourceProject.financialMonth === 'string' ? parseInt(sourceProject.financialMonth, 10) : sourceProject.financialMonth),

      // 预算
      budget: parseBudget(sourceProject.budget),

      // 平台配置
      platforms: ['douyin'],
      platformDiscounts: {
        douyin: customerDiscount || sourceDiscount || 0.8,
      },
      // 定价模式快照（用于财务计算）
      platformPricingModes: {
        douyin: customerPricingModel,
      },
      // 报价系数快照（只有 framework/hybrid 模式才有）
      ...(customerQuotationCoefficient && {
        platformQuotationCoefficients: {
          douyin: customerQuotationCoefficient,
        },
      }),
      platformKPIConfigs: {
        douyin: {
          enabled: true,
          enabledKPIs: ['cpm'], // 启用的 KPI 指标
          targets: {
            cpm: sourceProject.benchmarkCPM || 15, // 默认 CPM 目标值为 15
          },
          actuals: {}, // 新系统字段
        },
      },

      // 新系统预留字段
      platformPricingSnapshots: null,
      kpiConfig: null,
      benchmarkCPM: null,
      trackingStatus: null,

      // 客户
      customerId: customerId,

      // 调整项和审计日志
      adjustments: sourceProject.adjustments || [],
      auditLog: [
        ...(sourceProject.auditLog || []),
        {
          timestamp: new Date().toISOString(),
          user: 'system',
          action: `从 ByteProject 迁移，源项目ID: ${sourceProjectId}`,
        },
      ],

      // 元数据
      createdAt: sourceProject.createdAt || new Date(),
      updatedAt: new Date(),
      migratedFrom: {
        sourceProjectId,
        sourceDatabase: DB_SOURCE,
        migratedAt: new Date().toISOString(),
      },
    };

    // 写入目标库
    await targetDb.collection('projects').insertOne(targetProject);

    return {
      success: true,
      newProjectId,
      sourceProjectId,
      projectName: sourceProject.name,
      discountComparison: {
        sourceDiscount,
        customerDiscount,
        usedDiscount: targetProject.platformDiscounts.douyin,
        hasDiscrepancy: sourceDiscount && customerDiscount && Math.abs(sourceDiscount - customerDiscount) > 0.001,
      },
    };
  },

  /**
   * 迁移合作记录
   */
  migrateCollaborations: async (dbClient, params) => {
    const { sourceProjectId, newProjectId, talentMappings } = params;
    if (!sourceProjectId || !newProjectId) {
      return { success: false, message: '缺少必要参数' };
    }

    const sourceDb = dbClient.db(DB_SOURCE);
    const targetDb = dbClient.db(DB_TARGET);

    // 获取源合作记录
    const sourceCollabs = await sourceDb
      .collection('collaborations')
      .find({ projectId: sourceProjectId })
      .toArray();

    if (sourceCollabs.length === 0) {
      return {
        success: true,
        message: '没有合作记录需要迁移',
        count: 0,
        mappings: {},
      };
    }

    // 如果没有传入映射，重新构建
    let mappings = talentMappings || {};
    if (Object.keys(mappings).length === 0) {
      const validateResult = await operations.validateTalents(dbClient, { projectId: sourceProjectId });
      if (!validateResult.canProceed) {
        return { success: false, message: '有未匹配的达人，无法继续', unmatched: validateResult.unmatched };
      }
      validateResult.matched.forEach((m) => {
        mappings[m.sourceTalentId] = m.targetOneId;
      });
    }

    // 获取目标达人信息（用于填充 talentName）
    const targetOneIds = Object.values(mappings);
    const targetTalents = await targetDb
      .collection('talents')
      .find({ oneId: { $in: targetOneIds } })
      .toArray();
    const talentNameMap = new Map(targetTalents.map((t) => [t.oneId, t.name]));

    // 构建目标合作记录
    const collaborationMappings = {};
    const targetCollabs = sourceCollabs.map((collab) => {
      const newCollabId = generateId('collab');
      collaborationMappings[collab.id] = newCollabId;  // 统一使用 id 字段（与 work.collaborationId 一致）

      const targetOneId = mappings[collab.talentId];

      // 映射下单方式：kol_data.orderType → agentworks.orderMode
      // original → original (原价下单)
      // modified → adjusted (改价下单)
      const orderModeMap = {
        'original': 'original',
        'modified': 'adjusted',
      };
      const orderMode = orderModeMap[collab.orderType] || 'adjusted';

      return {
        id: newCollabId,
        projectId: newProjectId,
        talentOneId: targetOneId,
        talentPlatform: 'douyin',
        talentName: talentNameMap.get(targetOneId) || '',

        // 达人来源（机构达人/野生达人）
        talentSource: collab.talentSource || null,

        // 下单方式和报价系数
        orderMode: orderMode,
        // 定价模式（迁移项目都是框架模式）
        pricingMode: 'framework',

        // 金额（kol_data 存元，agentworks_db 存分，需要 × 100）
        amount: (collab.amount || 0) * 100,
        rebateRate: collab.rebate || 0,
        actualRebate: collab.actualRebate ? collab.actualRebate * 100 : null,

        // 新系统定价字段（迁移项目为框架模式，无需这些字段）
        quotationPrice: null,
        orderPrice: null,

        // 状态（已确认完全一致）
        status: collab.status || '待提报工作台',

        // 视频信息
        videoId: collab.videoId || null,
        videoUrl: collab.videoUrl || null,
        taskId: collab.taskId || null,

        // 日期（kol_data 字段名：plannedReleaseDate, publishDate）
        plannedReleaseDate: collab.plannedReleaseDate || null,
        actualReleaseDate: collab.publishDate || null,

        // 财务管理
        orderDate: null,
        recoveryDate: null,

        // 差异处理
        discrepancyReason: null,
        rebateScreenshots: collab.rebateScreenshots || [],

        // 效果数据（单独迁移）
        effectData: null,

        // 调整项
        adjustments: [],

        // 元数据
        createdAt: collab.createdAt || new Date(),
        updatedAt: new Date(),
        migratedFrom: {
          sourceCollabId: collab.id,  // 统一使用 id 字段（与 work.collaborationId 一致）
          sourceCollabObjectId: collab._id?.toString() || null,  // 备用 _id
          sourceTalentId: collab.talentId,
          migratedAt: new Date().toISOString(),
        },
      };
    });

    // 批量写入
    if (targetCollabs.length > 0) {
      await targetDb.collection('collaborations').insertMany(targetCollabs);
    }

    return {
      success: true,
      count: targetCollabs.length,
      mappings: collaborationMappings,
    };
  },

  /**
   * 迁移效果数据
   */
  migrateEffects: async (dbClient, params) => {
    const { sourceProjectId, collaborationMappings } = params;
    if (!sourceProjectId) {
      return { success: false, message: '缺少 sourceProjectId 参数' };
    }

    const sourceDb = dbClient.db(DB_SOURCE);
    const targetDb = dbClient.db(DB_TARGET);

    // 获取源效果数据
    const works = await sourceDb
      .collection('works')
      .find({ projectId: sourceProjectId })
      .toArray();

    if (works.length === 0) {
      return {
        success: true,
        message: '没有效果数据需要迁移',
        count: 0,
      };
    }

    // 按 videoId 或 collaborationId 关联到合作记录
    let updatedCount = 0;
    for (const work of works) {
      // 构建 effectData
      const effectData = {
        t7: work.t7 || null,
        t21: work.t21 || null,
        t30: work.t30 || null,
      };

      // 通过 videoId 找到对应的合作记录并更新
      if (work.videoId) {
        const result = await targetDb.collection('collaborations').updateOne(
          { videoId: work.videoId },
          {
            $set: {
              effectData,
              'migratedFrom.effectMigratedAt': new Date().toISOString(),
            },
          }
        );
        if (result.modifiedCount > 0) {
          updatedCount++;
        }
      }
    }

    return {
      success: true,
      totalWorks: works.length,
      updatedCount,
    };
  },

  /**
   * 迁移日报数据 (dailyStats)
   */
  migrateDailyStats: async (dbClient, params) => {
    const { sourceProjectId, collaborationMappings, trackingStatus = 'archived' } = params;
    if (!sourceProjectId) {
      return { success: false, message: '缺少 sourceProjectId 参数' };
    }

    const sourceDb = dbClient.db(DB_SOURCE);
    const targetDb = dbClient.db(DB_TARGET);

    // 调试：先检查源项目是否存在
    const sourceProject = await sourceDb.collection('projects').findOne({ id: sourceProjectId });
    console.log('[migrateDailyStats] sourceProjectId:', sourceProjectId);
    console.log('[migrateDailyStats] sourceProject found:', !!sourceProject);

    // 1. 获取源项目的所有 works（有 dailyStats 的）
    const works = await sourceDb
      .collection('works')
      .find({
        projectId: sourceProjectId,
        dailyStats: { $exists: true, $ne: [] }
      })
      .toArray();

    console.log('[migrateDailyStats] works with dailyStats found:', works.length);

    if (works.length === 0) {
      // 调试：检查是否有任何 works（不管有没有 dailyStats）
      const allWorks = await sourceDb.collection('works').find({ projectId: sourceProjectId }).toArray();
      console.log('[migrateDailyStats] total works for this project:', allWorks.length);
      if (allWorks.length > 0) {
        console.log('[migrateDailyStats] sample work:', JSON.stringify(allWorks[0], null, 2));
      }

      return {
        success: true,
        message: `源项目无日报数据，跳过迁移 (sourceProjectId: ${sourceProjectId}, 项目存在: ${!!sourceProject}, 总works数: ${allWorks.length})`,
        migratedCount: 0,
        totalWorks: 0,
        trackingStatus,
        debug: {
          sourceProjectId,
          sourceProjectExists: !!sourceProject,
          totalWorksCount: allWorks.length,
          sampleWorkId: allWorks[0]?.id || null
        }
      };
    }

    // 2. 查找目标项目（用于方式3）
    const targetProject = await targetDb.collection('projects').findOne({
      'migratedFrom.sourceProjectId': sourceProjectId,
    });
    const targetProjectId = targetProject?.id;
    console.log('[migrateDailyStats] targetProject found:', !!targetProject, 'id:', targetProjectId);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const work of works) {
      // 尝试多种方式找到目标合作记录
      let targetCollab = null;

      // 方式1：通过 collaborationMappings（如果有传入且非空）
      if (collaborationMappings && Object.keys(collaborationMappings).length > 0 && work.collaborationId) {
        const targetCollabId = collaborationMappings[work.collaborationId];
        if (targetCollabId) {
          targetCollab = await targetDb.collection('collaborations').findOne({ id: targetCollabId });
        }
      }

      // 方式2：通过 migratedFrom.sourceCollabId 匹配（继续迁移场景）
      if (!targetCollab && work.collaborationId && targetProjectId) {
        targetCollab = await targetDb.collection('collaborations').findOne({
          projectId: targetProjectId,
          'migratedFrom.sourceCollabId': work.collaborationId,
        });
      }

      // 方式3：通过 videoId 匹配
      if (!targetCollab && work.videoId) {
        targetCollab = await targetDb.collection('collaborations').findOne({ videoId: work.videoId });
      }

      if (!targetCollab) {
        console.log('[migrateDailyStats] skipped work:', work.collaborationId, 'videoId:', work.videoId);
        skippedCount++;
        continue;
      }

      // 3. 迁移 dailyStats：只迁移播放量，不迁移 cpm（由前端计算）
      const migratedStats = (work.dailyStats || []).map(stat => ({
        date: stat.date,
        totalViews: stat.totalViews || 0,
        // 不迁移 cpm 和 cpmChange，由前端用 financeCalculator.ts 计算
        solution: stat.solution || '',
        source: 'migrated',
        migratedAt: new Date().toISOString(),
        createdAt: stat.createdAt || new Date(),
        updatedAt: new Date(),
      }));

      // 4. 更新目标合作记录
      await targetDb.collection('collaborations').updateOne(
        { id: targetCollab.id },
        {
          $set: {
            dailyStats: migratedStats,
            lastReportDate: migratedStats.length > 0
              ? migratedStats[migratedStats.length - 1].date
              : null,
            'migratedFrom.dailyStatsMigratedAt': new Date().toISOString(),
          },
        }
      );
      migratedCount++;
    }

    // 5. 更新目标项目的追踪配置（复用前面已查询的 targetProject）
    if (targetProject) {
      // 计算日期范围
      let firstReportDate = null;
      let lastReportDate = null;
      for (const work of works) {
        for (const stat of (work.dailyStats || [])) {
          if (!firstReportDate || stat.date < firstReportDate) firstReportDate = stat.date;
          if (!lastReportDate || stat.date > lastReportDate) lastReportDate = stat.date;
        }
      }

      await targetDb.collection('projects').updateOne(
        { id: targetProject.id },
        {
          $set: {
            trackingConfig: {
              status: trackingStatus,
              version: 'standard',
              enableAutoFetch: false,
              benchmarkCPM: 30,
              migratedAt: new Date().toISOString(),
              firstReportDate,
              lastReportDate,
            },
          },
        }
      );
    }

    return {
      success: true,
      migratedCount,
      skippedCount,
      totalWorks: works.length,
      trackingStatus,
      targetProjectId: targetProject?.id || null,
    };
  },

  /**
   * 验证迁移结果
   */
  validateMigration: async (dbClient, params) => {
    const { sourceProjectId, newProjectId } = params;
    if (!sourceProjectId || !newProjectId) {
      return { success: false, message: '缺少必要参数' };
    }

    const sourceDb = dbClient.db(DB_SOURCE);
    const targetDb = dbClient.db(DB_TARGET);

    // 源数据统计
    const sourceCollabCount = await sourceDb
      .collection('collaborations')
      .countDocuments({ projectId: sourceProjectId });

    const sourceCollabs = await sourceDb
      .collection('collaborations')
      .find({ projectId: sourceProjectId })
      .toArray();

    const sourceTotalAmount = sourceCollabs.reduce((sum, c) => sum + (c.amount || 0), 0);

    const sourceWorksCount = await sourceDb
      .collection('works')
      .countDocuments({ projectId: sourceProjectId });

    // 目标数据统计
    const targetCollabCount = await targetDb
      .collection('collaborations')
      .countDocuments({ projectId: newProjectId });

    const targetCollabs = await targetDb
      .collection('collaborations')
      .find({ projectId: newProjectId })
      .toArray();

    const targetTotalAmount = targetCollabs.reduce((sum, c) => sum + (c.amount || 0), 0);

    const targetEffectCount = targetCollabs.filter((c) => c.effectData).length;

    // 日报数据对比
    const sourceDailyStatsCount = await sourceDb
      .collection('works')
      .countDocuments({
        projectId: sourceProjectId,
        dailyStats: { $exists: true, $ne: [] },
      });

    const targetDailyStatsCount = targetCollabs.filter(
      (c) => c.dailyStats && c.dailyStats.length > 0
    ).length;

    // 统计源日报条目总数
    const sourceStatsAggregate = await sourceDb
      .collection('works')
      .aggregate([
        { $match: { projectId: sourceProjectId, dailyStats: { $exists: true, $ne: [] } } },
        { $unwind: '$dailyStats' },
        { $count: 'total' },
      ])
      .toArray();
    const sourceStatsTotal = sourceStatsAggregate[0]?.total || 0;

    // 统计目标日报条目总数
    const targetStatsTotal = targetCollabs.reduce(
      (sum, c) => sum + (c.dailyStats?.length || 0),
      0
    );

    return {
      success: true,
      sourceProjectId,
      newProjectId,
      comparison: {
        collaborations: {
          source: sourceCollabCount,
          target: targetCollabCount,
          match: sourceCollabCount === targetCollabCount,
        },
        totalAmount: {
          source: sourceTotalAmount,
          target: targetTotalAmount,
          match: sourceTotalAmount === targetTotalAmount,
        },
        effects: {
          sourceWorks: sourceWorksCount,
          targetWithEffects: targetEffectCount,
        },
        dailyStats: {
          sourceWorksWithStats: sourceDailyStatsCount,
          targetWithStats: targetDailyStatsCount,
          sourceStatsEntries: sourceStatsTotal,
          targetStatsEntries: targetStatsTotal,
          match: sourceStatsTotal === targetStatsTotal,
        },
      },
      allMatch:
        sourceCollabCount === targetCollabCount &&
        sourceTotalAmount === targetTotalAmount,
    };
  },

  /**
   * 回滚迁移
   */
  rollbackMigration: async (dbClient, params) => {
    const { newProjectId } = params;
    if (!newProjectId) {
      return { success: false, message: '缺少 newProjectId 参数' };
    }

    const targetDb = dbClient.db(DB_TARGET);

    // 删除合作记录
    const collabResult = await targetDb
      .collection('collaborations')
      .deleteMany({ projectId: newProjectId });

    // 删除项目
    const projectResult = await targetDb
      .collection('projects')
      .deleteOne({ id: newProjectId });

    return {
      success: true,
      deletedProject: projectResult.deletedCount,
      deletedCollaborations: collabResult.deletedCount,
    };
  },
};

// --- 主处理函数 ---
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    let params = {};
    if (event.body) {
      try {
        params = JSON.parse(event.body);
      } catch (e) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, message: '无效的 JSON 请求体' }),
        };
      }
    }
    if (event.queryStringParameters) {
      Object.assign(params, event.queryStringParameters);
    }

    const { operation } = params;
    if (!operation || !operations[operation]) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: `无效的操作: ${operation}`,
          availableOperations: Object.keys(operations),
        }),
      };
    }

    console.log(`[dataMigration] 执行操作: ${operation}`);
    const dbClient = await connectToDatabase();
    const result = await operations[operation](dbClient, params);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('[dataMigration] 错误:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: '服务器内部错误',
        error: error.message,
      }),
    };
  }
};
