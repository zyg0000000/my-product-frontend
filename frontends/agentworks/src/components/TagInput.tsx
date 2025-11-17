/**
 * 标签输入组件
 * 支持从已有标签选择和手动输入新标签
 */

import { useState, type KeyboardEvent } from 'react';

interface TagInputProps {
  selectedTags: string[];
  availableTags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  onError?: (message: string) => void; // 添加错误回调
}

export function TagInput({
  selectedTags,
  availableTags,
  onChange,
  placeholder = '输入标签后按回车',
  maxTags,
  onError,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  // 处理键盘事件
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      const newTag = inputValue.trim();

      // 检查是否已存在
      if (!selectedTags.includes(newTag)) {
        // 检查最大数量限制
        if (maxTags && selectedTags.length >= maxTags) {
          onError?.(`最多只能添加 ${maxTags} 个标签`);
          return;
        }
        onChange([...selectedTags, newTag]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      // 删除最后一个标签
      onChange(selectedTags.slice(0, -1));
    }
  };

  // 切换标签选择状态
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter(t => t !== tag));
    } else {
      // 检查最大数量限制
      if (maxTags && selectedTags.length >= maxTags) {
        onError?.(`最多只能添加 ${maxTags} 个标签`);
        return;
      }
      onChange([...selectedTags, tag]);
    }
  };

  // 移除标签
  const removeTag = (tag: string) => {
    onChange(selectedTags.filter(t => t !== tag));
  };

  // 未选中的可用标签
  const unselectedAvailableTags = availableTags.filter(
    tag => !selectedTags.includes(tag)
  );

  return (
    <div className="space-y-3">
      {/* 已选标签显示和输入框 */}
      <div className="flex flex-wrap gap-2 p-3 border-2 border-gray-300 rounded-lg focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 bg-white min-h-[44px]">
        {selectedTags.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selectedTags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] outline-none text-sm"
        />
      </div>

      {/* 可用标签建议（从数据库中获取） */}
      {unselectedAvailableTags.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-2">
            常用标签（点击添加）:
          </div>
          <div className="flex flex-wrap gap-2">
            {unselectedAvailableTags.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 提示文本 */}
      <div className="text-xs text-gray-500">
        💡 提示：输入自定义标签后按 <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded">Enter</kbd> 添加，或点击上方常用标签快速添加
      </div>
    </div>
  );
}
