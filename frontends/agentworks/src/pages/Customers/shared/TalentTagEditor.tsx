/**
 * 达人标签编辑组件 (v2.1)
 *
 * 功能：
 * - 选择重要程度等级（单选，点击标签切换）
 * - 选择业务标签（多选，点击标签切换）
 * - 支持表单集成和独立使用
 * - 配置从 useTagConfigs Hook 动态加载
 *
 * v2.1 更新：
 * - 改为直接展示标签点击选择，去掉下拉框
 */

import { useMemo } from 'react';
import { Tag, Space, Spin, Typography } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { useTagConfigs } from '../../../hooks/useTagConfigs';
import type {
  ImportanceLevel,
  CustomerTalentTags,
} from '../../../types/customerTalent';

const { Text } = Typography;

interface TalentTagEditorProps {
  /** 当前标签值 */
  value?: CustomerTalentTags;
  /** 值变化回调 */
  onChange?: (value: CustomerTalentTags) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 布局方向 */
  layout?: 'horizontal' | 'vertical';
  /** 是否紧凑模式（隐藏标签） */
  compact?: boolean;
}

/**
 * 达人标签编辑器
 */
export function TalentTagEditor({
  value,
  onChange,
  disabled = false,
  layout = 'horizontal',
}: TalentTagEditorProps) {
  const { loading, getImportanceLevels, getBusinessTags } = useTagConfigs();

  // 获取配置数据
  const importanceLevels = useMemo(
    () => getImportanceLevels(),
    [getImportanceLevels]
  );
  const businessTags = useMemo(() => getBusinessTags(), [getBusinessTags]);

  // 当前值（带默认值）
  const currentValue: CustomerTalentTags = useMemo(
    () => ({
      importance: value?.importance || null,
      businessTags: value?.businessTags || [],
    }),
    [value]
  );

  // 处理重要程度变化（点击切换）
  const handleImportanceClick = (key: ImportanceLevel) => {
    if (disabled) return;
    onChange?.({
      ...currentValue,
      importance: currentValue.importance === key ? null : key,
    });
  };

  // 处理业务标签变化（点击切换）
  const handleBusinessTagClick = (key: string) => {
    if (disabled) return;
    const newTags = currentValue.businessTags.includes(key)
      ? currentValue.businessTags.filter(t => t !== key)
      : [...currentValue.businessTags, key];
    onChange?.({
      ...currentValue,
      businessTags: newTags,
    });
  };

  if (loading) {
    return <Spin size="small" />;
  }

  const isVertical = layout === 'vertical';

  return (
    <div className={isVertical ? 'space-y-4' : 'space-y-3'}>
      {/* 重要程度选择 */}
      <div>
        <Text type="secondary" className="text-sm block mb-2">
          重要程度
        </Text>
        <Space size={8} wrap>
          {importanceLevels.map(level => {
            const isSelected = currentValue.importance === level.key;
            return (
              <Tag
                key={level.key}
                onClick={() =>
                  handleImportanceClick(level.key as ImportanceLevel)
                }
                style={{
                  backgroundColor: isSelected ? level.bgColor : '#f5f5f5',
                  color: isSelected ? level.textColor : '#999',
                  borderColor: isSelected ? level.textColor : '#d9d9d9',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}
              >
                {isSelected && (
                  <CheckOutlined style={{ marginRight: 4, fontSize: 10 }} />
                )}
                {level.name}
              </Tag>
            );
          })}
        </Space>
      </div>

      {/* 业务标签选择 */}
      <div>
        <Text type="secondary" className="text-sm block mb-2">
          业务标签
        </Text>
        <Space size={8} wrap>
          {businessTags.map(tag => {
            const isSelected = currentValue.businessTags.includes(tag.key);
            return (
              <Tag
                key={tag.key}
                onClick={() => handleBusinessTagClick(tag.key)}
                style={{
                  backgroundColor: isSelected ? tag.bgColor : '#f5f5f5',
                  color: isSelected ? tag.textColor : '#999',
                  borderColor: isSelected ? tag.textColor : '#d9d9d9',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}
              >
                {isSelected && (
                  <CheckOutlined style={{ marginRight: 4, fontSize: 10 }} />
                )}
                {tag.name}
              </Tag>
            );
          })}
        </Space>
      </div>
    </div>
  );
}

/**
 * 标签展示组件（只读）
 */
interface TalentTagDisplayProps {
  /** 标签值 */
  value?: CustomerTalentTags;
  /** 是否紧凑模式 */
  compact?: boolean;
  /** 空值显示文本 */
  emptyText?: string;
}

export function TalentTagDisplay({
  value,
  compact = false,
  emptyText = '-',
}: TalentTagDisplayProps) {
  const { loading, getImportanceLevelByKey, getBusinessTagByKey } =
    useTagConfigs();

  if (loading) {
    return <Spin size="small" />;
  }

  const hasImportance = value?.importance;
  const hasBusinessTags = value?.businessTags && value.businessTags.length > 0;

  if (!hasImportance && !hasBusinessTags) {
    return <Text type="secondary">{emptyText}</Text>;
  }

  const importanceLevel = hasImportance
    ? getImportanceLevelByKey(value.importance)
    : null;

  return (
    <Space size={4} wrap={!compact}>
      {importanceLevel && (
        <Tag
          style={{
            backgroundColor: importanceLevel.bgColor,
            color: importanceLevel.textColor,
            borderColor: importanceLevel.textColor,
          }}
        >
          {importanceLevel.name}
        </Tag>
      )}
      {hasBusinessTags &&
        value.businessTags.map(tagKey => {
          const tag = getBusinessTagByKey(tagKey);
          return tag ? (
            <Tag
              key={tagKey}
              style={{
                backgroundColor: tag.bgColor,
                color: tag.textColor,
                borderColor: tag.textColor,
              }}
            >
              {tag.name}
            </Tag>
          ) : null;
        })}
    </Space>
  );
}

export default TalentTagEditor;
