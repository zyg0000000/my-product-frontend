/**
 * 批量编辑通用 Hook
 * 支持本地修改 + 批量保存，减少API调用次数
 *
 * @example
 * const { localData, hasChanges, updateItem, saveChanges, cancelChanges } = useBatchEdit({
 *   initialData: dimensions,
 *   onSave: async (updatedData) => { await saveToDB(updatedData); }
 * });
 */

import { useState, useEffect } from 'react';

interface UseBatchEditOptions<T> {
  initialData: T[];
  onSave?: (updatedData: T[]) => Promise<void>;
  compareKey?: keyof T; // 用于比较的唯一键，默认用索引
}

export function useBatchEdit<T>({
  initialData,
  onSave,
}: UseBatchEditOptions<T>) {
  const [localData, setLocalData] = useState<T[]>(initialData);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // 同步外部数据变化
  useEffect(() => {
    setLocalData(initialData);
    setHasChanges(false);
  }, [initialData]);

  // 更新单个项
  const updateItem = (index: number, updatedItem: T) => {
    const newData = [...localData];
    newData[index] = updatedItem;
    setLocalData(newData);
    setHasChanges(true);
  };

  // 批量更新（通过predicate）
  const updateItems = (
    predicate: (item: T, index: number) => boolean,
    update: (item: T) => T
  ) => {
    const newData = localData.map((item, index) =>
      predicate(item, index) ? update(item) : item
    );
    setLocalData(newData);
    setHasChanges(true);
  };

  // 保存更改
  const saveChanges = async () => {
    if (!hasChanges || !onSave) return;

    try {
      setSaving(true);
      await onSave(localData);
      setHasChanges(false);
    } finally {
      setSaving(false);
    }
  };

  // 取消更改
  const cancelChanges = () => {
    setLocalData(initialData);
    setHasChanges(false);
  };

  return {
    localData,
    hasChanges,
    saving,
    updateItem,
    updateItems,
    saveChanges,
    cancelChanges,
    setLocalData,
  };
}
