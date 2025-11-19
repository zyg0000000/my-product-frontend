/**
 * 批量编辑工具栏组件
 * 显示"未保存提示"和"保存/取消"按钮
 * 可复用于任何批量编辑场景
 */

interface BatchEditToolbarProps {
  hasChanges: boolean;
  saving?: boolean;
  onSave: () => void | Promise<void>;
  onCancel: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  changeMessage?: string;
}

export function BatchEditToolbar({
  hasChanges,
  saving = false,
  onSave,
  onCancel,
  saveLabel = '保存更改',
  cancelLabel = '取消',
  changeMessage = '有未保存的更改'
}: BatchEditToolbarProps) {
  if (!hasChanges) return null;

  return (
    <div className="flex items-center gap-3">
      {/* 未保存提示 */}
      <span className="text-sm text-orange-600 font-medium">
        • {changeMessage}
      </span>

      {/* 取消按钮 */}
      <button
        onClick={onCancel}
        disabled={saving}
        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {cancelLabel}
      </button>

      {/* 保存按钮 */}
      <button
        onClick={onSave}
        disabled={saving}
        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {saving ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            保存中...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {saveLabel}
          </>
        )}
      </button>
    </div>
  );
}
