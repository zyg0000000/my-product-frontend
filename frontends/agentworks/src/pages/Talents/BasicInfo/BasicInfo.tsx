/**
 * 达人基础信息页
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTalents } from '../../../api/talent';
import type { Talent, Platform } from '../../../types/talent';
import { PLATFORM_NAMES, PLATFORM_PRICE_TYPES } from '../../../types/talent';
import {
  formatPrice,
  formatRebate,
  formatFansCount,
  getLatestPricesMap,
  getLatestRebate,
} from '../../../utils/formatters';

export function BasicInfo() {
  const navigate = useNavigate();
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('douyin');
  const [talents, setTalents] = useState<Talent[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载达人列表
  useEffect(() => {
    loadTalents();
  }, [selectedPlatform]);

  const loadTalents = async () => {
    try {
      setLoading(true);
      const response = await getTalents({ platform: selectedPlatform });
      console.log('📊 API Response:', response); // 调试日志
      if (response.success && response.data) {
        // 确保 data 总是数组
        const talentsData = Array.isArray(response.data)
          ? response.data
          : [response.data];
        console.log('✅ Talents Data:', talentsData); // 调试日志
        setTalents(talentsData);
      } else {
        console.warn('⚠️ No data in response:', response); // 调试日志
        setTalents([]);
      }
    } catch (error) {
      console.error('❌ 加载达人列表失败:', error);
      setTalents([]);
    } finally {
      setLoading(false);
    }
  };

  // 平台Tab配置
  const platforms: Platform[] = [
    'douyin',
    'xiaohongshu',
    'bilibili',
    'kuaishou',
  ];

  // 获取当前平台的价格类型配置
  const priceTypes = PLATFORM_PRICE_TYPES[selectedPlatform];

  // 获取平台达人的外链（星图、蒲公英等）
  const getPlatformLink = (talent: Talent): string | null => {
    if (talent.platform === 'douyin') {
      // 抖音：使用星图ID或platformAccountId
      const xingtuId = talent.platformSpecific?.xingtuId || talent.platformAccountId;
      return `https://www.xingtu.cn/ad/creator/author-homepage/douyin-video/${xingtuId}`;
    }
    // 其他平台后续添加
    return null;
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">基础信息</h1>
          <p className="mt-1 text-sm text-gray-500">
            管理多平台达人信息、价格和返点
          </p>
        </div>
        <button
          onClick={() => navigate('/talents/create')}
          className="btn btn-primary"
        >
          + 新增达人
        </button>
      </div>

      {/* 平台Tab切换 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {platforms.map(platform => (
            <button
              key={platform}
              onClick={() => setSelectedPlatform(platform)}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                selectedPlatform === platform
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {PLATFORM_NAMES[platform]}
            </button>
          ))}
        </nav>
      </div>

      {/* 达人列表 */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-12 text-center text-gray-500">加载中...</div>
        ) : talents.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            暂无{PLATFORM_NAMES[selectedPlatform]}平台的达人数据
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    达人名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    粉丝数
                  </th>
                  {priceTypes.map(priceType => (
                    <th
                      key={priceType.key}
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      {priceType.label}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    返点
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {talents.map(talent => {
                  const latestPrices = getLatestPricesMap(talent.prices);
                  const latestRebate = getLatestRebate(talent.rebates);
                  const platformLink = getPlatformLink(talent);

                  return (
                    <tr
                      key={`${talent.oneId}-${talent.platform}`}
                      className="hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center">
                          {talent.avatar && (
                            <img
                              src={talent.avatar}
                              alt={talent.name}
                              className="h-10 w-10 rounded-full"
                            />
                          )}
                          <div className={talent.avatar ? 'ml-4' : ''}>
                            {platformLink ? (
                              <a
                                href={platformLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-primary-600 hover:text-primary-900 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {talent.name}
                              </a>
                            ) : (
                              <div className="font-medium text-gray-900">
                                {talent.name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {talent.fansCount
                          ? formatFansCount(talent.fansCount)
                          : '-'}
                      </td>
                      {priceTypes.map(priceType => (
                        <td
                          key={priceType.key}
                          className="whitespace-nowrap px-6 py-4 text-sm text-gray-900"
                        >
                          {latestPrices[priceType.key]
                            ? formatPrice(latestPrices[priceType.key]!)
                            : '-'}
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {latestRebate ? formatRebate(latestRebate) : '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            talent.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : talent.status === 'inactive'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {talent.status === 'active'
                            ? '活跃'
                            : talent.status === 'inactive'
                              ? '暂停'
                              : '归档'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium space-x-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: 打开价格管理弹窗
                            console.log('管理价格:', talent.oneId);
                          }}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          价格
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: 打开返点管理弹窗
                            console.log('管理返点:', talent.oneId);
                          }}
                          className="text-green-600 hover:text-green-900"
                        >
                          返点
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/talents/${talent.oneId}/${talent.platform}/edit`);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          编辑
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: 打开删除确认弹窗
                            console.log('删除达人:', talent.oneId);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          删除
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: 打开合作历史弹窗
                            console.log('查看历史:', talent.oneId);
                          }}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          历史
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
