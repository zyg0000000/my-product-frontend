/**
 * 工作流编辑器
 *
 * @version 2.0.0
 * @description 双栏布局工作流编辑器，支持从动作库拖拽添加步骤，画布内拖拽排序
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Form,
  Input,
  Select,
  Button,
  Switch,
  Spin,
  Empty,
  App,
  InputNumber,
  Tooltip,
  Collapse,
} from 'antd';
import { ProCard } from '@ant-design/pro-components';
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  ArrowLeftOutlined,
  HolderOutlined,
  CopyOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import {
  BoltIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  CursorArrowRaysIcon,
  CameraIcon,
  ClockIcon,
  ArrowsPointingOutIcon,
  CodeBracketIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PageTransition } from '../../../components/PageTransition';
import { useWorkflows } from '../../../hooks/useWorkflows';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';
import { automationApi } from '../../../api/automation';
import {
  type Workflow,
  type WorkflowStep,
  type WorkflowActionType,
  type CreateWorkflowRequest,
  type UpdateWorkflowRequest,
  getInputConfigsByPlatform,
  WORKFLOW_INPUT_CONFIGS,
} from '../../../types/workflow';
import type { Platform } from '../../../types/talent';

const { TextArea } = Input;

/** 动作类型配置 */
const ACTION_TYPES: {
  value: WorkflowActionType;
  label: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}[] = [
  {
    value: 'Go to URL',
    label: '导航到URL',
    icon: <ArrowPathIcon className="w-4 h-4" />,
    description: '打开指定的网页地址',
    color: 'blue',
  },
  {
    value: 'waitForSelector',
    label: '等待元素',
    icon: <MagnifyingGlassIcon className="w-4 h-4" />,
    description: '等待页面上出现指定元素',
    color: 'purple',
  },
  {
    value: 'click',
    label: '点击元素',
    icon: <CursorArrowRaysIcon className="w-4 h-4" />,
    description: '点击页面上的指定元素',
    color: 'green',
  },
  {
    value: 'screenshot',
    label: '截图',
    icon: <CameraIcon className="w-4 h-4" />,
    description: '对当前页面或指定区域截图',
    color: 'orange',
  },
  {
    value: 'wait',
    label: '等待时间',
    icon: <ClockIcon className="w-4 h-4" />,
    description: '等待指定的毫秒数',
    color: 'gray',
  },
  {
    value: 'scrollPage',
    label: '滚动页面',
    icon: <ArrowsPointingOutIcon className="w-4 h-4" />,
    description: '滚动到页面指定位置',
    color: 'cyan',
  },
  {
    value: 'extractData',
    label: '提取数据',
    icon: <DocumentTextIcon className="w-4 h-4" />,
    description: '从页面提取指定数据',
    color: 'yellow',
  },
  {
    value: 'type',
    label: '输入文本',
    icon: <CodeBracketIcon className="w-4 h-4" />,
    description: '在输入框中输入文本',
    color: 'pink',
  },
  {
    value: 'evaluate',
    label: '执行脚本',
    icon: <CodeBracketIcon className="w-4 h-4" />,
    description: '执行自定义 JavaScript 脚本',
    color: 'red',
  },
  {
    value: 'waitForNetworkIdle',
    label: '等待网络空闲',
    icon: <ArrowPathIcon className="w-4 h-4" />,
    description: '等待页面网络请求完成',
    color: 'teal',
  },
  {
    value: 'compositeExtract',
    label: '复合数据提取',
    icon: <DocumentTextIcon className="w-4 h-4" />,
    description: '从页面提取多组数据',
    color: 'indigo',
  },
  {
    value: 'select',
    label: '选择下拉项',
    icon: <CursorArrowRaysIcon className="w-4 h-4" />,
    description: '选择下拉菜单中的选项',
    color: 'lime',
  },
];

/** 动作库中的可拖拽动作项 */
function DraggableActionItem({ action }: { action: (typeof ACTION_TYPES)[0] }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library-${action.value}`,
    data: { type: 'library-action', actionType: action.value },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        flex items-center gap-3 p-3 rounded-lg border cursor-grab
        bg-surface hover:bg-surface-subtle
        border-stroke hover:border-primary-300
        transition-all duration-150
        ${isDragging ? 'opacity-50 ring-2 ring-primary-500' : ''}
      `}
    >
      <span className="text-primary-600">{action.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-content">{action.label}</div>
        <div className="text-xs text-content-muted truncate">
          {action.description}
        </div>
      </div>
    </div>
  );
}

/** 可排序的步骤卡片 */
function SortableStepCard({
  step,
  index,
  onChange,
  onDelete,
  onDuplicate,
}: {
  step: WorkflowStep;
  index: number;
  onChange: (step: WorkflowStep) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const actionConfig = ACTION_TYPES.find(a => a.value === step.action);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative rounded-lg border transition-all duration-200
        ${isDragging ? 'opacity-50 z-50 shadow-lg' : ''}
        ${
          step.enabled !== false
            ? 'border-stroke bg-surface hover:border-primary-300'
            : 'border-stroke/50 bg-surface-sunken/50 opacity-60'
        }
      `}
    >
      <div className="p-4">
        {/* 头部 */}
        <div className="flex items-center justify-between gap-2 mb-3">
          {/* 左侧：拖拽 + 序号 + 动作选择 */}
          <div className="flex items-center gap-2">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-surface-subtle text-content-muted flex items-center gap-1"
            >
              <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-xs font-bold flex items-center justify-center">
                {index + 1}
              </span>
              <HolderOutlined className="text-base" />
            </button>
            <Select
              value={step.action}
              onChange={action => onChange({ ...step, action })}
              style={{ width: 160 }}
              size="small"
              popupMatchSelectWidth={false}
              options={ACTION_TYPES.map(a => ({
                value: a.value,
                label: (
                  <div className="flex items-center gap-2">
                    <span className="text-primary-600 flex-shrink-0">
                      {a.icon}
                    </span>
                    <span>{a.label}</span>
                  </div>
                ),
              }))}
            />
            {actionConfig && (
              <span className="text-xs text-content-muted hidden sm:inline">
                {actionConfig.description}
              </span>
            )}
          </div>
          {/* 右侧：操作按钮 */}
          <div className="flex items-center gap-1">
            <Switch
              size="small"
              checked={step.enabled !== false}
              onChange={enabled => onChange({ ...step, enabled })}
            />
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={onDuplicate}
            />
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={onDelete}
            />
          </div>
        </div>

        {/* 参数区 - 使用折叠面板 */}
        <Collapse
          ghost
          size="small"
          defaultActiveKey={['params']}
          items={[
            {
              key: 'params',
              label: (
                <span className="text-xs text-content-muted">参数配置</span>
              ),
              children: (
                <div className="space-y-3">
                  {/* 描述 + 超时 - 同一行 */}
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-content-muted mb-1">
                        描述
                      </label>
                      <Input
                        size="small"
                        placeholder="步骤描述（可选）"
                        value={step.description || ''}
                        onChange={e =>
                          onChange({
                            ...step,
                            description: e.target.value || undefined,
                          })
                        }
                      />
                    </div>
                    <div style={{ width: 120 }}>
                      <label className="block text-xs text-content-muted mb-1">
                        超时 (ms)
                      </label>
                      <InputNumber
                        size="small"
                        min={0}
                        step={1000}
                        placeholder="30000"
                        value={step.timeout}
                        onChange={timeout =>
                          onChange({ ...step, timeout: timeout || undefined })
                        }
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* 动态参数字段 - 扁平结构，与数据库一致 */}
                  {step.action === 'Go to URL' && (
                    <div>
                      <label className="block text-xs text-content-muted mb-1">
                        URL <span className="text-red-500">*</span>
                      </label>
                      <Input
                        size="small"
                        placeholder="https://example.com/{{input}}"
                        value={step.url || ''}
                        onChange={e =>
                          onChange({ ...step, url: e.target.value })
                        }
                      />
                    </div>
                  )}

                  {step.action === 'waitForSelector' && (
                    <div>
                      <label className="block text-xs text-content-muted mb-1">
                        CSS 选择器 <span className="text-red-500">*</span>
                      </label>
                      <Input
                        size="small"
                        placeholder=".class-name 或 #element-id"
                        value={step.selector || ''}
                        onChange={e =>
                          onChange({ ...step, selector: e.target.value })
                        }
                      />
                    </div>
                  )}

                  {step.action === 'click' && (
                    <div>
                      <label className="block text-xs text-content-muted mb-1">
                        CSS 选择器 <span className="text-red-500">*</span>
                      </label>
                      <Input
                        size="small"
                        placeholder="要点击的元素选择器"
                        value={step.selector || ''}
                        onChange={e =>
                          onChange({ ...step, selector: e.target.value })
                        }
                      />
                    </div>
                  )}

                  {step.action === 'wait' && (
                    <div>
                      <label className="block text-xs text-content-muted mb-1">
                        等待时长 (毫秒) <span className="text-red-500">*</span>
                      </label>
                      <InputNumber
                        size="small"
                        min={0}
                        step={100}
                        placeholder="2000"
                        value={step.milliseconds}
                        onChange={milliseconds =>
                          onChange({
                            ...step,
                            milliseconds: milliseconds || undefined,
                          })
                        }
                        className="w-full"
                      />
                    </div>
                  )}

                  {step.action === 'screenshot' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-content-muted mb-1">
                          CSS 选择器 <span className="text-red-500">*</span>
                        </label>
                        <Input
                          size="small"
                          placeholder="要截取的元素选择器"
                          value={step.selector || ''}
                          onChange={e =>
                            onChange({ ...step, selector: e.target.value })
                          }
                        />
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="block text-xs text-content-muted mb-1">
                            保存为 <span className="text-red-500">*</span>
                          </label>
                          <Input
                            size="small"
                            placeholder="截图名称.png"
                            value={step.saveAs || ''}
                            onChange={e =>
                              onChange({ ...step, saveAs: e.target.value })
                            }
                          />
                        </div>
                        <div className="flex items-end pb-1">
                          <label className="flex items-center gap-2 text-xs text-content-muted cursor-pointer">
                            <Switch
                              size="small"
                              checked={step.stitched === true}
                              onChange={stitched =>
                                onChange({ ...step, stitched })
                              }
                            />
                            <span>长截图模式</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {step.action === 'type' && (
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-xs text-content-muted mb-1">
                          CSS 选择器 <span className="text-red-500">*</span>
                        </label>
                        <Input
                          size="small"
                          placeholder="输入框选择器"
                          value={step.selector || ''}
                          onChange={e =>
                            onChange({ ...step, selector: e.target.value })
                          }
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-content-muted mb-1">
                          输入文本 <span className="text-red-500">*</span>
                        </label>
                        <Input
                          size="small"
                          placeholder="要输入的文本或 {{input}}"
                          value={step.text || ''}
                          onChange={e =>
                            onChange({ ...step, text: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  )}

                  {step.action === 'evaluate' && (
                    <div>
                      <label className="block text-xs text-content-muted mb-1">
                        JavaScript 脚本 <span className="text-red-500">*</span>
                      </label>
                      <TextArea
                        rows={3}
                        placeholder="return document.title;"
                        value={step.script || ''}
                        onChange={e =>
                          onChange({ ...step, script: e.target.value })
                        }
                        className="font-mono text-xs"
                      />
                    </div>
                  )}

                  {step.action === 'scrollPage' && (
                    <div>
                      <label className="block text-xs text-content-muted mb-1">
                        滚动区域（可选）
                      </label>
                      <Input
                        size="small"
                        placeholder="默认为整个页面，可指定如 .scroll-div"
                        value={step.selector || ''}
                        onChange={e =>
                          onChange({ ...step, selector: e.target.value })
                        }
                      />
                    </div>
                  )}

                  {step.action === 'extractData' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-content-muted mb-1">
                          数据名称 <span className="text-red-500">*</span>
                        </label>
                        <Input
                          size="small"
                          placeholder="例如：预期CPM"
                          value={step.dataName || ''}
                          onChange={e =>
                            onChange({ ...step, dataName: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-content-muted mb-1">
                          CSS 选择器 <span className="text-red-500">*</span>
                        </label>
                        <Input
                          size="small"
                          placeholder="text=预期CPM >> span.value"
                          value={step.selector || ''}
                          onChange={e =>
                            onChange({ ...step, selector: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  )}

                  {step.action === 'compositeExtract' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-content-muted mb-1">
                          数据名称 <span className="text-red-500">*</span>
                        </label>
                        <Input
                          size="small"
                          placeholder="例如：用户画像总结"
                          value={step.dataName || ''}
                          onChange={e =>
                            onChange({ ...step, dataName: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-content-muted mb-1">
                          组合模板 <span className="text-red-500">*</span>
                        </label>
                        <TextArea
                          rows={2}
                          placeholder={
                            '触达用户 ${age_gender}\n集中 ${city_tier}'
                          }
                          value={step.template || ''}
                          onChange={e =>
                            onChange({ ...step, template: e.target.value })
                          }
                          className="font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-content-muted mb-1">
                          数据源
                        </label>
                        <div className="space-y-2">
                          {(step.sources || [{ name: '', selector: '' }]).map(
                            (source, idx) => (
                              <div
                                key={idx}
                                className="flex gap-2 items-center p-2 rounded bg-surface-subtle"
                              >
                                <Input
                                  size="small"
                                  placeholder="名称 (如 age_gender)"
                                  value={source.name}
                                  onChange={e => {
                                    const sources = [...(step.sources || [])];
                                    sources[idx] = {
                                      ...sources[idx],
                                      name: e.target.value,
                                    };
                                    onChange({ ...step, sources });
                                  }}
                                  className="flex-1"
                                />
                                <Input
                                  size="small"
                                  placeholder="选择器"
                                  value={source.selector}
                                  onChange={e => {
                                    const sources = [...(step.sources || [])];
                                    sources[idx] = {
                                      ...sources[idx],
                                      selector: e.target.value,
                                    };
                                    onChange({ ...step, sources });
                                  }}
                                  className="flex-1"
                                />
                                <Button
                                  type="text"
                                  size="small"
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={() => {
                                    const sources = (step.sources || []).filter(
                                      (_, i) => i !== idx
                                    );
                                    onChange({
                                      ...step,
                                      sources:
                                        sources.length > 0
                                          ? sources
                                          : [{ name: '', selector: '' }],
                                    });
                                  }}
                                />
                              </div>
                            )
                          )}
                          <Button
                            type="dashed"
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => {
                              const sources = [
                                ...(step.sources || []),
                                { name: '', selector: '' },
                              ];
                              onChange({ ...step, sources });
                            }}
                            className="w-full"
                          >
                            添加数据源
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {step.action === 'select' && (
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-xs text-content-muted mb-1">
                          CSS 选择器 <span className="text-red-500">*</span>
                        </label>
                        <Input
                          size="small"
                          placeholder="下拉菜单选择器"
                          value={step.selector || ''}
                          onChange={e =>
                            onChange({ ...step, selector: e.target.value })
                          }
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-content-muted mb-1">
                          选项值 <span className="text-red-500">*</span>
                        </label>
                        <Input
                          size="small"
                          placeholder="要选择的选项值"
                          value={step.value || ''}
                          onChange={e =>
                            onChange({ ...step, value: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* 错误处理 */}
                  <div className="pt-2 border-t border-stroke/50">
                    <label className="flex items-center gap-2 text-xs text-content-muted cursor-pointer">
                      <Switch
                        size="small"
                        checked={step.continueOnError === true}
                        onChange={continueOnError =>
                          onChange({ ...step, continueOnError })
                        }
                      />
                      <span>失败时继续执行后续步骤</span>
                    </label>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

/** 画布放置区域 */
function CanvasDropZone({
  children,
  isEmpty,
}: {
  children: React.ReactNode;
  isEmpty: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas',
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        rounded-lg border-2 border-dashed transition-all p-4
        ${isOver ? 'border-primary-500 bg-primary-50/50' : 'border-stroke'}
        ${isEmpty ? 'h-[65vh] flex items-center justify-center' : 'h-[65vh] overflow-y-auto'}
      `}
    >
      {children}
    </div>
  );
}

/** 拖拽预览层 */
function DragOverlayContent({
  actionType,
}: {
  actionType: WorkflowActionType;
}) {
  const actionConfig = ACTION_TYPES.find(a => a.value === actionType);
  if (!actionConfig) return null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-surface shadow-lg border-primary-500">
      <span className="text-primary-600">{actionConfig.icon}</span>
      <div className="text-sm font-medium text-content">
        {actionConfig.label}
      </div>
    </div>
  );
}

/** 生成唯一 ID */
function generateId(): string {
  return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function WorkflowEditor() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  // 平台配置
  const { configs: platformConfigs, loading: loadingPlatforms } =
    usePlatformConfig();

  // 工作流数据
  const { createWorkflow, updateWorkflow } = useWorkflows({ autoLoad: false });

  // 状态
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [_workflow, setWorkflow] = useState<Workflow | null>(null);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('douyin');
  const [_activeId, setActiveId] = useState<string | null>(null);
  const [activeDragType, setActiveDragType] = useState<
    'library' | 'canvas' | null
  >(null);
  const [activeDragAction, setActiveDragAction] =
    useState<WorkflowActionType | null>(null);

  const isEditMode = !!id;

  // DnD 传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 步骤 ID 列表（用于 SortableContext）
  const stepIds = useMemo(() => steps.map(s => s.id), [steps]);

  // 加载工作流数据（编辑模式）
  useEffect(() => {
    if (!id) return;

    const loadWorkflow = async () => {
      try {
        setLoading(true);
        const response = await automationApi.getWorkflowById(id);
        if (response.success && response.data) {
          const wf = response.data;
          setWorkflow(wf);
          // 确保每个步骤都有 id
          const stepsWithIds = (wf.steps || []).map(s => ({
            ...s,
            id: s.id || generateId(),
          }));
          setSteps(stepsWithIds);
          setSelectedPlatform(wf.platform);

          form.setFieldsValue({
            name: wf.name,
            description: wf.description,
            platform: wf.platform,
            inputKey: wf.inputConfig?.key || wf.requiredInput,
            isActive: wf.isActive,
            enableVNC: wf.enableVNC,
          });
        } else {
          message.error('工作流不存在');
          navigate('/automation/workflows');
        }
      } catch (error) {
        console.error('Failed to load workflow:', error);
        message.error('加载工作流失败');
      } finally {
        setLoading(false);
      }
    };

    loadWorkflow();
  }, [id, form, message, navigate]);

  // 获取当前平台可用的输入类型
  const availableInputConfigs = getInputConfigsByPlatform(selectedPlatform);

  // 处理平台变更
  const handlePlatformChange = (platform: Platform) => {
    setSelectedPlatform(platform);
    const configs = getInputConfigsByPlatform(platform);
    if (configs.length > 0) {
      form.setFieldValue('inputKey', configs[0].key);
    }
  };

  // 添加步骤
  const addStep = (actionType: WorkflowActionType = 'Go to URL') => {
    const newStep: WorkflowStep = {
      id: generateId(),
      action: actionType,
      enabled: true,
    };
    setSteps([...steps, newStep]);
  };

  // 更新步骤
  const updateStep = (index: number, step: WorkflowStep) => {
    const newSteps = [...steps];
    newSteps[index] = step;
    setSteps(newSteps);
  };

  // 删除步骤
  const deleteStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  // 复制步骤
  const duplicateStep = (index: number) => {
    const step = steps[index];
    const newStep: WorkflowStep = {
      ...step,
      id: generateId(),
      description: step.description ? `${step.description} (副本)` : '副本',
    };
    const newSteps = [...steps];
    newSteps.splice(index + 1, 0, newStep);
    setSteps(newSteps);
  };

  // 拖拽开始
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);

    if (String(active.id).startsWith('library-')) {
      setActiveDragType('library');
      setActiveDragAction(active.data.current?.actionType);
    } else {
      setActiveDragType('canvas');
    }
  };

  // 拖拽结束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // 从库拖到画布
    if (activeDragType === 'library' && over?.id === 'canvas') {
      const actionType = active.data.current?.actionType as WorkflowActionType;
      if (actionType) {
        addStep(actionType);
      }
    }

    // 画布内排序
    if (activeDragType === 'canvas' && over && active.id !== over.id) {
      setSteps(items => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }

    setActiveId(null);
    setActiveDragType(null);
    setActiveDragAction(null);
  };

  // 保存工作流
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      console.log('[WorkflowEditor] 表单值:', values);
      console.log('[WorkflowEditor] enableVNC:', values.enableVNC);
      setSaving(true);

      const inputConfig = WORKFLOW_INPUT_CONFIGS[values.inputKey] ||
        availableInputConfigs.find(c => c.key === values.inputKey) || {
          key: values.inputKey,
          label: values.inputKey,
          idSource: 'custom' as const,
        };

      if (isEditMode && id) {
        const updateData: UpdateWorkflowRequest = {
          _id: id,
          name: values.name,
          description: values.description,
          platform: values.platform,
          inputConfig,
          steps,
          isActive: values.isActive,
          enableVNC: values.enableVNC,
        };
        const success = await updateWorkflow(updateData);
        if (success) {
          message.success('工作流已更新');
          navigate('/automation/workflows');
        }
      } else {
        const createData: CreateWorkflowRequest = {
          name: values.name,
          description: values.description,
          platform: values.platform,
          inputConfig,
          steps,
          isActive: values.isActive ?? true,
          enableVNC: values.enableVNC,
        };
        const success = await createWorkflow(createData);
        if (success) {
          message.success('工作流已创建');
          navigate('/automation/workflows');
        }
      }
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingPlatforms) {
    return (
      <PageTransition>
        <div className="min-h-[400px] flex items-center justify-center">
          <Spin size="large" />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-6">
          {/* 页面标题 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/automation/workflows')}
              >
                返回
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-content">
                  {isEditMode ? '编辑工作流' : '创建工作流'}
                </h1>
                <p className="mt-1 text-sm text-content-secondary">
                  {isEditMode
                    ? '修改工作流配置和步骤'
                    : '从左侧拖拽动作到画布构建工作流'}
                </p>
              </div>
            </div>
            <Button
              type="primary"
              size="large"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
            >
              {isEditMode ? '保存' : '创建'}
            </Button>
          </div>

          {/* 基本信息 - 紧凑表单 */}
          <ProCard
            size="small"
            title={
              <div className="flex items-center gap-2">
                <Cog6ToothIcon className="w-4 h-4 text-primary-600" />
                <span className="text-sm">基本信息</span>
              </div>
            }
          >
            <Form
              form={form}
              layout="inline"
              initialValues={{
                platform: 'douyin',
                isActive: true,
                enableVNC: false,
              }}
              className="flex flex-wrap gap-4"
            >
              <Form.Item
                name="name"
                rules={[{ required: true, message: '请输入名称' }]}
                className="!mb-0 flex-1 min-w-[200px]"
              >
                <Input placeholder="工作流名称" />
              </Form.Item>

              <Form.Item
                name="platform"
                rules={[{ required: true }]}
                className="!mb-0 w-32"
              >
                <Select
                  placeholder="平台"
                  onChange={handlePlatformChange}
                  options={platformConfigs.map(c => ({
                    value: c.platform,
                    label: c.name,
                  }))}
                />
              </Form.Item>

              <Form.Item
                name="inputKey"
                rules={[{ required: true }]}
                className="!mb-0 w-40"
              >
                <Select
                  placeholder="输入参数"
                  options={availableInputConfigs.map(c => ({
                    value: c.key,
                    label: c.label,
                  }))}
                />
              </Form.Item>

              <Form.Item
                name="isActive"
                valuePropName="checked"
                className="!mb-0"
              >
                <Switch checkedChildren="启用" unCheckedChildren="停用" />
              </Form.Item>

              <Tooltip title="启用后任务将在可视化浏览器中执行，便于处理验证码">
                <Form.Item
                  name="enableVNC"
                  valuePropName="checked"
                  className="!mb-0"
                >
                  <Switch checkedChildren="VNC" unCheckedChildren="VNC" />
                </Form.Item>
              </Tooltip>

              <Form.Item
                name="description"
                className="!mb-0 flex-1 min-w-[200px]"
              >
                <Input placeholder="描述（可选）" />
              </Form.Item>
            </Form>
          </ProCard>

          {/* 双栏布局：动作库 + 画布 */}
          <div className="grid grid-cols-12 gap-6">
            {/* 左侧：动作库 */}
            <div className="col-span-3">
              <ProCard
                title={
                  <div className="flex items-center gap-2">
                    <BoltIcon className="w-4 h-4 text-primary-600" />
                    <span className="text-sm">动作库</span>
                  </div>
                }
                extra={
                  <Tooltip title="将动作拖拽到右侧画布">
                    <QuestionCircleOutlined className="text-content-muted" />
                  </Tooltip>
                }
                className="sticky top-4"
                bodyStyle={{ padding: '16px' }}
              >
                <div className="space-y-2 h-[calc(65vh+63px)] overflow-y-auto">
                  {ACTION_TYPES.map(action => (
                    <DraggableActionItem key={action.value} action={action} />
                  ))}
                </div>
              </ProCard>
            </div>

            {/* 右侧：画布 */}
            <div className="col-span-9">
              <ProCard
                title={
                  <div className="flex items-center gap-2">
                    <BoltIcon className="w-4 h-4 text-primary-600" />
                    <span className="text-sm">工作流步骤</span>
                    <span className="text-xs font-normal text-content-muted">
                      ({steps.length} 个)
                    </span>
                  </div>
                }
                extra={
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => addStep()}
                  >
                    添加步骤
                  </Button>
                }
                bodyStyle={{ padding: '16px' }}
              >
                <CanvasDropZone isEmpty={steps.length === 0}>
                  {steps.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        <span className="text-content-muted">
                          拖拽左侧动作到此处，或点击上方按钮添加
                        </span>
                      }
                    />
                  ) : (
                    <SortableContext
                      items={stepIds}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-4">
                        {steps.map((step, index) => (
                          <SortableStepCard
                            key={step.id}
                            step={step}
                            index={index}
                            onChange={s => updateStep(index, s)}
                            onDelete={() => deleteStep(index)}
                            onDuplicate={() => duplicateStep(index)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  )}
                </CanvasDropZone>

                {/* 变量说明 */}
                <div className="mt-4 p-3 rounded-lg bg-surface-subtle border border-stroke">
                  <div className="flex items-start gap-2 text-xs text-content-muted">
                    <BoltIcon className="w-4 h-4 text-primary-600 mt-0.5" />
                    <div>
                      <span className="font-medium">变量说明：</span>
                      使用{' '}
                      <code className="px-1 py-0.5 rounded bg-surface text-primary-600">
                        {'{{input}}'}
                      </code>{' '}
                      引用用户输入的参数值
                    </div>
                  </div>
                </div>
              </ProCard>
            </div>
          </div>
        </div>

        {/* 拖拽预览层 */}
        <DragOverlay>
          {activeDragType === 'library' && activeDragAction && (
            <DragOverlayContent actionType={activeDragAction} />
          )}
        </DragOverlay>
      </DndContext>
    </PageTransition>
  );
}

export default WorkflowEditor;
