/**
 * 业务标签编辑器组件 (v4.4)
 * 用于按平台管理二级业务标签（客户自定义）
 */

import { useState, useRef, useEffect } from 'react';
import { Tag, Input, Tooltip, Tabs, Empty, Space, App } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { InputRef } from 'antd';

// 业务标签按平台存储
export interface PlatformBusinessTags {
  [key: string]: string[] | undefined;
  douyin?: string[];
  xiaohongshu?: string[];
  kuaishou?: string[];
  bilibili?: string[];
}

interface BusinessTagsEditorProps {
  /** 启用的平台列表 */
  enabledPlatforms: Array<{ platform: string; name?: string }>;
  /** 当前标签配置 */
  value?: PlatformBusinessTags;
  /** 标签变化回调 */
  onChange?: (tags: PlatformBusinessTags) => void;
  /** 获取平台名称的函数 */
  getPlatformName?: (key: string) => string;
  /** 是否只读 */
  readOnly?: boolean;
}

export function BusinessTagsEditor({
  enabledPlatforms,
  value = {},
  onChange,
  getPlatformName,
  readOnly = false,
}: BusinessTagsEditorProps) {
  const { message } = App.useApp();
  const [inputVisible, setInputVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [activePlatform, setActivePlatform] = useState<string>(
    enabledPlatforms[0]?.platform || ''
  );
  const inputRef = useRef<InputRef>(null);

  // 当平台列表变化时，确保 activePlatform 有效
  useEffect(() => {
    if (enabledPlatforms.length > 0 && !enabledPlatforms.find(p => p.platform === activePlatform)) {
      setActivePlatform(enabledPlatforms[0].platform);
    }
  }, [enabledPlatforms, activePlatform]);

  // 输入框显示时自动聚焦
  useEffect(() => {
    if (inputVisible) {
      inputRef.current?.focus();
    }
  }, [inputVisible]);

  const getPlatformDisplayName = (key: string): string => {
    if (getPlatformName) {
      return getPlatformName(key);
    }
    const platform = enabledPlatforms.find(p => p.platform === key);
    return platform?.name || key;
  };

  // 获取当前平台的标签列表
  const currentTags = value[activePlatform] || [];

  // 删除标签
  const handleClose = (removedTag: string) => {
    if (readOnly) return;
    const newTags = currentTags.filter(tag => tag !== removedTag);
    onChange?.({
      ...value,
      [activePlatform]: newTags,
    });
  };

  // 显示输入框
  const showInput = () => {
    if (readOnly) return;
    setInputVisible(true);
  };

  // 确认添加标签
  const handleInputConfirm = () => {
    const trimmedValue = inputValue.trim();

    if (trimmedValue) {
      // 检查是否重复
      if (currentTags.includes(trimmedValue)) {
        message.warning('该标签已存在');
      } else if (trimmedValue.length > 20) {
        message.warning('标签长度不能超过20个字符');
      } else {
        onChange?.({
          ...value,
          [activePlatform]: [...currentTags, trimmedValue],
        });
      }
    }

    setInputVisible(false);
    setInputValue('');
  };

  // 渲染标签列表
  const renderTags = () => {
    if (currentTags.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={readOnly ? '暂无业务标签' : '暂无业务标签，点击添加'}
          style={{ margin: '12px 0' }}
        />
      );
    }

    return (
      <Space size={[8, 8]} wrap className="py-2">
        {currentTags.map((tag) => {
          const isLongTag = tag.length > 10;
          const tagElem = (
            <Tag
              key={tag}
              closable={!readOnly}
              onClose={e => {
                e.preventDefault();
                handleClose(tag);
              }}
              style={{ marginRight: 0 }}
            >
              {isLongTag ? `${tag.slice(0, 10)}...` : tag}
            </Tag>
          );
          return isLongTag ? (
            <Tooltip title={tag} key={tag}>
              {tagElem}
            </Tooltip>
          ) : (
            tagElem
          );
        })}
      </Space>
    );
  };

  // 平台 Tab 配置
  const platformTabs = enabledPlatforms.map(p => ({
    key: p.platform,
    label: (
      <span>
        {getPlatformDisplayName(p.platform)}
        {(value[p.platform]?.length || 0) > 0 && (
          <Tag color="blue" className="ml-1" style={{ marginRight: 0 }}>
            {value[p.platform]?.length}
          </Tag>
        )}
      </span>
    ),
  }));

  if (enabledPlatforms.length === 0) {
    return (
      <Empty
        description="暂无启用的平台"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <div className="business-tags-editor">
      {/* 平台切换 */}
      <Tabs
        activeKey={activePlatform}
        onChange={setActivePlatform}
        items={platformTabs}
        size="small"
        className="mb-2"
      />

      {/* 标签列表 */}
      <div className="min-h-[60px] border border-gray-200 rounded-md p-3 bg-gray-50">
        {renderTags()}

        {/* 添加标签输入框 */}
        {!readOnly && (
          <div className="mt-2">
            {inputVisible ? (
              <Input
                ref={inputRef}
                type="text"
                size="small"
                style={{ width: 150 }}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onBlur={handleInputConfirm}
                onPressEnter={handleInputConfirm}
                placeholder="输入标签名称"
                maxLength={20}
              />
            ) : (
              <Tag
                onClick={showInput}
                style={{ borderStyle: 'dashed', cursor: 'pointer' }}
              >
                <PlusOutlined /> 添加标签
              </Tag>
            )}
          </div>
        )}
      </div>

      {/* 提示说明 */}
      {!readOnly && (
        <div className="text-xs text-gray-400 mt-2">
          提示：标签将用于项目创建时选择，可跨平台复用相同标签名称
        </div>
      )}
    </div>
  );
}

export default BusinessTagsEditor;
