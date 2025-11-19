/**
 * 机构选择器组件
 * 支持搜索和选择机构
 */

import { useState, useEffect, useRef } from 'react';
import { logger } from '../utils/logger';
import { ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import type { Agency } from '../types/agency';
import { AGENCY_INDIVIDUAL_ID } from '../types/agency';
import { getAgencies } from '../api/agency';

interface AgencySelectorProps {
  value: string; // 机构ID
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function AgencySelector({
  value,
  onChange,
  disabled = false,
  placeholder = '选择机构',
  className = '',
}: AgencySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [filteredAgencies, setFilteredAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAgencyName, setSelectedAgencyName] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 加载机构列表
  useEffect(() => {
    loadAgencies();
  }, []);

  // 处理点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 根据value更新显示的机构名称
  useEffect(() => {
    if (value === AGENCY_INDIVIDUAL_ID) {
      setSelectedAgencyName('野生达人');
    } else if (value) {
      const agency = agencies.find(a => a.id === value);
      setSelectedAgencyName(agency?.name || value);
    } else {
      setSelectedAgencyName('');
    }
  }, [value, agencies]);

  // 过滤机构列表
  useEffect(() => {
    if (!searchQuery) {
      setFilteredAgencies(agencies);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = agencies.filter(agency =>
        agency.name.toLowerCase().includes(query) ||
        agency.id.toLowerCase().includes(query)
      );
      setFilteredAgencies(filtered);
    }
  }, [searchQuery, agencies]);

  const loadAgencies = async () => {
    try {
      setLoading(true);
      const response = await getAgencies({ status: 'active' });
      if (response.success && response.data) {
        setAgencies(response.data);
        setFilteredAgencies(response.data);
      }
    } catch (error) {
      logger.error('加载机构列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (agencyId: string) => {
    onChange(agencyId);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* 选择框 */}
      <div
        onClick={handleToggle}
        className={`
          block w-full rounded-md border shadow-sm
          px-3 py-2 pr-10 text-sm
          ${disabled
            ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
            : 'bg-white border-gray-300 cursor-pointer hover:border-gray-400'
          }
          ${isOpen ? 'border-primary-500 ring-1 ring-primary-500' : ''}
        `}
      >
        <div className="flex items-center justify-between">
          <span className={selectedAgencyName ? 'text-gray-900' : 'text-gray-400'}>
            {selectedAgencyName || placeholder}
          </span>
          <ChevronDownIcon
            className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* 下拉面板 */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md bg-white shadow-lg border border-gray-200">
          {/* 搜索框 */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索机构名称..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* 机构列表 */}
          <div className="max-h-60 overflow-auto py-1">
            {loading ? (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                加载中...
              </div>
            ) : (
              <>
                {/* 野生达人选项 */}
                <div
                  onClick={() => handleSelect(AGENCY_INDIVIDUAL_ID)}
                  className={`
                    px-3 py-2 text-sm cursor-pointer
                    ${value === AGENCY_INDIVIDUAL_ID
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  <div className="font-medium">野生达人</div>
                  <div className="text-xs text-gray-500">无机构归属的独立达人</div>
                </div>

                {/* 分割线 */}
                {filteredAgencies.length > 0 && (
                  <div className="border-t border-gray-100 my-1"></div>
                )}

                {/* 机构列表 */}
                {filteredAgencies.length > 0 ? (
                  filteredAgencies.map((agency) => (
                    <div
                      key={agency.id}
                      onClick={() => handleSelect(agency.id)}
                      className={`
                        px-3 py-2 text-sm cursor-pointer
                        ${value === agency.id
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-900 hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="font-medium">{agency.name}</div>
                      {agency.contactInfo?.contactPerson && (
                        <div className="text-xs text-gray-500">
                          联系人: {agency.contactInfo.contactPerson}
                        </div>
                      )}
                    </div>
                  ))
                ) : searchQuery ? (
                  <div className="px-3 py-2 text-sm text-gray-500 text-center">
                    未找到匹配的机构
                  </div>
                ) : null}
              </>
            )}
          </div>

          {/* 底部提示 */}
          {!loading && filteredAgencies.length > 5 && (
            <div className="border-t border-gray-200 px-3 py-2">
              <p className="text-xs text-gray-500">
                共 {filteredAgencies.length} 个机构，继续输入可精确搜索
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}