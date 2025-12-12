/**
 * 可配置项列表组件
 *
 * 版本: v1.0.0
 *
 * 通用组件，用于配置带颜色的标签/等级/类型等列表
 * 特性：
 * - 支持背景色和文字颜色配置
 * - 支持排序
 * - 支持描述字段（可选）
 * - 支持默认项选择（可选）
 *
 * 复用场景：
 * - 平台配置的达人等级配置
 * - 平台配置的价格类型配置
 * - 标签管理的重要程度等级配置
 * - 标签管理的业务标签配置
 */

import {
  Input,
  Button,
  Tag,
  Popconfirm,
  ColorPicker,
  Radio,
  InputNumber,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  HolderOutlined,
} from '@ant-design/icons';

export interface ConfigurableItem {
  key: string;
  name: string;
  bgColor: string;
  textColor: string;
  sortOrder: number;
  description?: string;
  isDefault?: boolean;
}

interface ConfigurableItemListProps {
  /** 标题 */
  title: string;
  /** 描述说明 */
  description?: string;
  /** 数据列表 */
  items: ConfigurableItem[];
  /** 数据变化回调 */
  onChange: (items: ConfigurableItem[]) => void;
  /** 新增按钮文案 */
  addButtonText?: string;
  /** 是否显示描述字段 */
  showDescription?: boolean;
  /** 是否显示默认选择（Radio） */
  showDefault?: boolean;
  /** Key 是否可编辑（已存在的项） */
  keyEditable?: boolean;
  /** 帮助提示 */
  helpTip?: string;
}

export function ConfigurableItemList({
  title,
  description,
  items,
  onChange,
  addButtonText = '新增',
  showDescription = false,
  showDefault = false,
  keyEditable = true,
  helpTip,
}: ConfigurableItemListProps) {
  // 新增项
  const handleAdd = () => {
    const newItem: ConfigurableItem = {
      key: `item_${Date.now()}`,
      name: '',
      bgColor: '#dbeafe',
      textColor: '#1e40af',
      sortOrder: items.length + 1,
      description: '',
      isDefault: items.length === 0,
    };
    onChange([...items, newItem]);
  };

  // 更新项
  const handleUpdate = (
    index: number,
    field: keyof ConfigurableItem,
    value: any
  ) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  // 删除项
  const handleDelete = (index: number) => {
    const deleted = items[index];
    const updated = items
      .filter((_, i) => i !== index)
      .map((item, i) => ({ ...item, sortOrder: i + 1 }));

    // 如果删除的是默认项，将第一项设为默认
    if (showDefault && deleted.isDefault && updated.length > 0) {
      updated[0].isDefault = true;
    }

    onChange(updated);
  };

  // 设置默认项
  const handleSetDefault = (index: number) => {
    const updated = items.map((item, i) => ({
      ...item,
      isDefault: i === index,
    }));
    onChange(updated);
  };

  // 按 sortOrder 排序的数据
  const sortedItems = [...items]
    .map((item, originalIndex) => ({ ...item, _index: originalIndex }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div>
      {/* 标题和新增按钮 */}
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h4 className="text-sm font-medium text-content">{title}</h4>
          {description && (
            <p className="text-xs text-content-muted mt-1">{description}</p>
          )}
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="small"
          onClick={handleAdd}
        >
          {addButtonText}
        </Button>
      </div>

      {/* 空状态 */}
      {items.length === 0 ? (
        <div className="text-center py-8 text-content-muted bg-surface-base rounded-lg">
          暂无配置，点击上方按钮添加
        </div>
      ) : (
        <div className="space-y-3">
          {sortedItems.map(item => (
            <div
              key={item._index}
              className="flex items-center gap-3 p-3 bg-surface-base rounded-lg"
            >
              <HolderOutlined className="text-content-muted cursor-move" />

              {/* Key 输入 */}
              <Input
                placeholder="标识(英文)"
                value={item.key}
                onChange={e => handleUpdate(item._index, 'key', e.target.value)}
                disabled={!keyEditable && !item.key.startsWith('item_')}
                style={{ width: 120 }}
                size="small"
              />

              {/* 名称输入 */}
              <Input
                placeholder="显示名称"
                value={item.name}
                onChange={e =>
                  handleUpdate(item._index, 'name', e.target.value)
                }
                style={{ width: 100 }}
                size="small"
              />

              {/* 描述输入（可选） */}
              {showDescription && (
                <Input
                  placeholder="描述"
                  value={item.description}
                  onChange={e =>
                    handleUpdate(item._index, 'description', e.target.value)
                  }
                  style={{ width: 140 }}
                  size="small"
                />
              )}

              {/* 排序 */}
              <InputNumber
                placeholder="排序"
                value={item.sortOrder}
                onChange={val =>
                  handleUpdate(item._index, 'sortOrder', val || 1)
                }
                min={1}
                style={{ width: 60 }}
                size="small"
              />

              {/* 背景色 */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-content-muted">背景:</span>
                <ColorPicker
                  value={item.bgColor}
                  size="small"
                  onChange={color =>
                    handleUpdate(item._index, 'bgColor', color.toHexString())
                  }
                />
              </div>

              {/* 文字色 */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-content-muted">文字:</span>
                <ColorPicker
                  value={item.textColor}
                  size="small"
                  onChange={color =>
                    handleUpdate(item._index, 'textColor', color.toHexString())
                  }
                />
              </div>

              {/* 预览标签 */}
              <Tag
                style={{
                  backgroundColor: item.bgColor,
                  color: item.textColor,
                  border: 'none',
                }}
              >
                {item.name || '预览'}
              </Tag>

              {/* 默认选择（可选） */}
              {showDefault && (
                <Radio
                  checked={item.isDefault}
                  onChange={() => handleSetDefault(item._index)}
                >
                  <span className="text-xs">默认</span>
                </Radio>
              )}

              <div className="flex-1" />

              {/* 删除按钮 */}
              <Popconfirm
                title="确定删除该项？"
                onConfirm={() => handleDelete(item._index)}
              >
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                />
              </Popconfirm>
            </div>
          ))}
        </div>
      )}

      {/* 帮助提示 */}
      {helpTip && (
        <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
          <p className="text-xs text-primary-700 dark:text-primary-300">💡 {helpTip}</p>
        </div>
      )}
    </div>
  );
}

export default ConfigurableItemList;
