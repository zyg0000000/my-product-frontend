/**
 * 达人管理模块首页
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '../../utils/logger';
import {
  InformationCircleIcon,
  CalendarIcon,
  ChartBarIcon,
  PlusCircleIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';
import { getTalentStats } from '../../api/stats';
import { StatsGridSkeleton } from '../../components/Skeletons/CardSkeleton';
import { motion } from 'framer-motion';
import { PageTransition } from '../../components/PageTransition';

export function TalentsHome() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalTalents: 0,
    douyin: 0,
    xiaohongshu: 0,
    bilibili: 0,
    kuaishou: 0,
  });
  const [loading, setLoading] = useState(true);

  // 加载统计数据
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await getTalentStats();
      if (response.success) {
        setStats({
          totalTalents: response.data.uniqueTalents,
          douyin: response.data.platformStats.douyin,
          xiaohongshu: response.data.platformStats.xiaohongshu,
          bilibili: response.data.platformStats.bilibili,
          kuaishou: response.data.platformStats.kuaishou,
        });
      }
    } catch (error) {
      logger.error('加载统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const modules = [
    {
      name: '基础信息',
      description: '管理达人基础资料、价格和返点信息',
      icon: InformationCircleIcon,
      path: '/talents/basic',
      color: 'bg-blue-500',
      available: true,
    },
    {
      name: '机构管理',
      description: '管理MCN机构和野生达人归属',
      icon: BuildingOffice2Icon,
      path: '/talents/agencies',
      color: 'bg-orange-500',
      available: true,
    },
    {
      name: '近期表现',
      description: '查看达人数据和效果分析',
      icon: ChartBarIcon,
      path: '/performance',
      color: 'bg-purple-500',
      available: true,
    },
    {
      name: '档期管理',
      description: '达人档期安排和时间管理',
      icon: CalendarIcon,
      path: '/talents/schedule',
      color: 'bg-green-500',
      available: false,
    },
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">达人管理</h1>
          <p className="mt-2 text-lg text-gray-600">
            管理多平台达人信息，查看达人数据和表现
          </p>
        </div>

        {/* 快速统计 */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">快速统计</h2>
          {loading ? (
            <StatsGridSkeleton count={5} />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200"
              >
                <p className="text-3xl font-bold text-blue-900">{stats.totalTalents}</p>
                <p className="text-sm text-blue-700 mt-1 font-medium">总达人数</p>
                <p className="text-xs text-blue-600 mt-0.5">按 OneID 去重</p>
              </motion.div>
              {[
                { label: '抖音', value: stats.douyin, delay: 0.1 },
                { label: '小红书', value: stats.xiaohongshu, delay: 0.2 },
                { label: 'B站', value: stats.bilibili, delay: 0.3 },
                { label: '快手', value: stats.kuaishou, delay: 0.4 },
              ].map((item) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: item.delay, duration: 0.3 }}
                  whileHover={{ y: -4, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)" }}
                  className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200 transition-shadow"
                >
                  <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                  <p className="text-sm text-gray-600 mt-1">{item.label}</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* 功能模块 */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">功能模块</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((module, index) => (
              <motion.button
                key={module.path}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1, duration: 0.4 }}
                whileHover={module.available ? { scale: 1.02, y: -4 } : {}}
                whileTap={module.available ? { scale: 0.98 } : {}}
                onClick={() => module.available && navigate(module.path)}
                disabled={!module.available}
                className={`group relative flex flex-col items-start rounded-lg border-2 bg-white p-6 text-left transition-colors ${module.available
                  ? 'border-gray-200 hover:border-primary-500 hover:shadow-lg cursor-pointer'
                  : 'border-gray-200 opacity-60 cursor-not-allowed'
                  }`}
              >
                <div className={`rounded-lg ${module.color} p-3 shadow-sm`}>
                  <module.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {module.name}
                  {!module.available && (
                    <span className="ml-2 text-xs text-gray-400">(开发中)</span>
                  )}
                </h3>
                <p className="mt-2 text-sm text-gray-500">{module.description}</p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* 快速操作 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="card"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">快速操作</h2>
          <div className="flex flex-wrap gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/talents/create')}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
            >
              <PlusCircleIcon className="h-5 w-5" />
              新增达人
            </motion.button>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
