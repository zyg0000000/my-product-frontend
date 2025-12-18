/**
 * AgentWorks - Ant Design 主题配置
 *
 * 架构设计：单一颜色来源 + CSS Variables 贯穿全局
 *
 * 核心理念：
 * - 所有颜色定义在 CSS Variables (colors.css)
 * - Ant Design 直接引用 CSS Variables
 * - 深色模式通过 CSS Variables 自动切换，无需两套主题
 *
 * 设计令牌来源：src/design-system/tokens/colors.css
 *
 * @see https://ant.design/docs/react/customize-theme-cn
 */

import type { ThemeConfig } from 'antd';

/**
 * 设计令牌常量
 * 与 CSS Variables 保持同步
 * 修改时请同时更新 src/design-system/tokens/colors.css
 */
export const designTokens = {
  // 主色调 - Deep Indigo
  primary: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5', // 主按钮
    700: '#4338ca', // 悬停
    800: '#3730a3',
    900: '#312e81',
    950: '#1e1b4b',
  },

  // 成功色 - Emerald
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
  },

  // 警告色 - Amber
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
  },

  // 危险色 - Rose
  danger: {
    50: '#fff1f2',
    100: '#ffe4e6',
    200: '#fecdd3',
    500: '#f43f5e',
    600: '#e11d48',
    700: '#be123c',
  },

  // 信息色 - Sky
  info: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
  },

  // 中性灰 - Slate
  gray: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },

  // 圆角
  radius: {
    none: 0,
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 20,
    full: 9999,
  },

  // 组件尺寸
  size: {
    xs: 28,
    sm: 32,
    md: 36,
    lg: 40,
    xl: 44,
  },

  // 字体
  fontFamily: {
    display:
      '"Plus Jakarta Sans", "PingFang SC", "Microsoft YaHei", sans-serif',
    body: '"DM Sans", "PingFang SC", "Microsoft YaHei", sans-serif',
    mono: '"JetBrains Mono", "SF Mono", Monaco, monospace',
  },

  // 字号
  fontSize: {
    xs: 12,
    sm: 13,
    base: 14,
    md: 15,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
    '4xl': 30,
  },
} as const;

/**
 * Ant Design 主题配置
 * 与 Tailwind CSS 和 CSS Variables 保持一致
 */
export const antTheme: ThemeConfig = {
  token: {
    // ========================================
    // 品牌色
    // ========================================
    colorPrimary: designTokens.primary[600],
    colorLink: designTokens.primary[600],
    colorLinkHover: designTokens.primary[700],
    colorLinkActive: designTokens.primary[800],

    // ========================================
    // 功能色
    // ========================================
    colorSuccess: designTokens.success[500],
    colorWarning: designTokens.warning[500],
    colorError: designTokens.danger[500],
    colorInfo: designTokens.info[500],

    // ========================================
    // 中性色 - 使用 CSS Variables 实现深色模式自动切换
    // ========================================
    colorTextBase: 'var(--color-text-primary)',
    colorText: 'var(--color-text-primary)',
    colorTextSecondary: 'var(--color-text-secondary)',
    colorTextTertiary: 'var(--color-text-muted)',
    colorTextQuaternary: 'var(--color-text-muted)',

    colorBgBase: 'var(--color-bg-base)',
    colorBgContainer: 'var(--color-bg-elevated)',
    colorBgElevated: 'var(--color-bg-elevated)',
    colorBgLayout: 'var(--color-bg-base)',
    colorBgSpotlight: 'var(--color-bg-sunken)',

    colorBorder: 'var(--color-border)',
    colorBorderSecondary: 'var(--color-border)',

    colorFill: 'var(--color-fill)',
    colorFillSecondary: 'var(--color-fill-secondary)',
    colorFillTertiary: 'rgba(0, 0, 0, 0.04)',
    colorFillQuaternary: 'rgba(0, 0, 0, 0.02)',

    // ========================================
    // 圆角
    // ========================================
    borderRadius: designTokens.radius.md,
    borderRadiusLG: designTokens.radius.lg,
    borderRadiusSM: designTokens.radius.sm,
    borderRadiusXS: 4,

    // ========================================
    // 字体
    // ========================================
    fontFamily: designTokens.fontFamily.body,
    fontSize: designTokens.fontSize.base,
    fontSizeSM: designTokens.fontSize.sm,
    fontSizeLG: designTokens.fontSize.lg,
    fontSizeXL: designTokens.fontSize.xl,
    fontSizeHeading1: designTokens.fontSize['4xl'],
    fontSizeHeading2: designTokens.fontSize['3xl'],
    fontSizeHeading3: designTokens.fontSize['2xl'],
    fontSizeHeading4: designTokens.fontSize.xl,
    fontSizeHeading5: designTokens.fontSize.lg,

    // ========================================
    // 行高
    // ========================================
    lineHeight: 1.5,
    lineHeightLG: 1.5,
    lineHeightSM: 1.5,
    lineHeightHeading1: 1.2,
    lineHeightHeading2: 1.25,
    lineHeightHeading3: 1.3,
    lineHeightHeading4: 1.35,
    lineHeightHeading5: 1.4,

    // ========================================
    // 尺寸
    // ========================================
    controlHeight: designTokens.size.md,
    controlHeightLG: designTokens.size.lg,
    controlHeightSM: designTokens.size.sm,
    controlHeightXS: designTokens.size.xs,

    // ========================================
    // 间距
    // ========================================
    padding: 16,
    paddingLG: 24,
    paddingSM: 12,
    paddingXS: 8,
    paddingXXS: 4,

    margin: 16,
    marginLG: 24,
    marginSM: 12,
    marginXS: 8,
    marginXXS: 4,

    // ========================================
    // 阴影
    // ========================================
    boxShadow:
      '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.06)',
    boxShadowSecondary:
      '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
    boxShadowTertiary:
      '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',

    // ========================================
    // 动画
    // ========================================
    motionDurationFast: '150ms',
    motionDurationMid: '200ms',
    motionDurationSlow: '300ms',
    motionEaseInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    motionEaseOut: 'cubic-bezier(0, 0, 0.2, 1)',

    // ========================================
    // 其他
    // ========================================
    wireframe: false,
    opacityLoading: 0.65,
  },

  // ========================================
  // 组件级配置
  // ========================================
  components: {
    // 按钮
    Button: {
      controlHeight: designTokens.size.md,
      controlHeightLG: designTokens.size.lg,
      controlHeightSM: designTokens.size.sm,
      fontWeight: 500,
      primaryShadow: '0 2px 4px rgba(79, 70, 229, 0.15)',
      defaultBorderColor: 'var(--color-border)',
      defaultColor: 'var(--color-text-primary)',
      defaultBg: 'var(--color-bg-elevated)',
      defaultHoverBg: 'var(--color-bg-sunken)',
      defaultHoverColor: designTokens.primary[600],
      defaultHoverBorderColor: designTokens.primary[300],
      paddingInline: 16,
      paddingInlineLG: 20,
      paddingInlineSM: 12,
    },

    // 输入框
    Input: {
      controlHeight: designTokens.size.md,
      controlHeightLG: designTokens.size.lg,
      controlHeightSM: designTokens.size.sm,
      activeBorderColor: designTokens.primary[500],
      hoverBorderColor: designTokens.primary[300],
      activeShadow: `0 0 0 3px ${designTokens.primary[100]}`,
      paddingInline: 12,
      colorBgContainer: 'var(--color-bg-elevated)',
    },

    // 选择器
    Select: {
      controlHeight: designTokens.size.md,
      controlHeightLG: designTokens.size.lg,
      controlHeightSM: designTokens.size.sm,
      optionSelectedBg: designTokens.primary[50],
      optionActiveBg: 'var(--color-bg-sunken)',
      colorBgContainer: 'var(--color-bg-elevated)',
    },

    // 表格 - 使用 CSS Variables 实现深色模式自动切换
    Table: {
      colorBgContainer: 'var(--color-bg-elevated)',
      headerBg: 'var(--color-bg-sunken)',
      headerColor: 'var(--color-text-primary)',
      headerSortActiveBg: 'var(--color-bg-sunken)',
      headerSortHoverBg: 'var(--color-bg-sunken)',
      rowHoverBg: 'var(--color-bg-sunken)',
      borderColor: 'var(--color-border)',
      headerBorderRadius: designTokens.radius.md,
      // 表格单元格 padding - 支持密度切换 (large/middle/small)
      // 注意：默认尺寸对应 large，但我们设置较紧凑的值
      cellPaddingBlock: 12, // large (宽松)
      cellPaddingInline: 12,
      cellPaddingBlockMD: 8, // middle (中等) - 推荐默认
      cellPaddingInlineMD: 8,
      cellPaddingBlockSM: 4, // small (紧凑)
      cellPaddingInlineSM: 4,
      headerSplitColor: 'transparent',
    },

    // 卡片
    Card: {
      paddingLG: 24,
      borderRadiusLG: designTokens.radius.lg,
      boxShadowTertiary:
        '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.06)',
      headerBg: 'transparent',
      headerFontSize: designTokens.fontSize.lg,
      headerFontSizeSM: designTokens.fontSize.base,
      colorBgContainer: 'var(--color-bg-elevated)',
    },

    // 标签页
    Tabs: {
      inkBarColor: designTokens.primary[600],
      itemActiveColor: designTokens.primary[600],
      itemSelectedColor: designTokens.primary[600],
      itemHoverColor: designTokens.primary[500],
      cardBg: 'var(--color-bg-sunken)',
      horizontalItemPadding: '12px 16px',
    },

    // 模态框
    Modal: {
      borderRadiusLG: designTokens.radius.xl,
      headerBg: 'var(--color-bg-elevated)',
      contentBg: 'var(--color-bg-elevated)',
      titleFontSize: designTokens.fontSize.xl,
      paddingLG: 24,
    },

    // 抽屉
    Drawer: {
      paddingLG: 24,
      colorBgElevated: 'var(--color-bg-elevated)',
    },

    // 标签
    Tag: {
      borderRadiusSM: designTokens.radius.sm,
      defaultBg: 'var(--color-bg-sunken)',
      defaultColor: 'var(--color-text-secondary)',
    },

    // 徽标
    Badge: {
      dotSize: 8,
      statusSize: 8,
    },

    // 下拉菜单
    Dropdown: {
      borderRadiusLG: designTokens.radius.lg,
      paddingBlock: 6,
      controlItemBgHover: 'var(--color-bg-sunken)',
      controlItemBgActive: designTokens.primary[50],
    },

    // 消息提示
    Message: {
      contentBg: 'var(--color-bg-elevated)',
      contentPadding: '10px 16px',
    },

    // 通知
    Notification: {
      width: 384,
    },

    // 进度条
    Progress: {
      defaultColor: designTokens.primary[600],
      remainingColor: designTokens.gray[100],
    },

    // 开关
    Switch: {
      trackHeight: 22,
      trackMinWidth: 44,
      handleSize: 18,
      // 深色模式支持：使用 CSS Variables
      colorPrimaryHover: designTokens.primary[500],
      colorTextQuaternary: 'var(--color-switch-off)', // 关闭状态背景色
      colorTextTertiary: 'var(--color-switch-off-hover)', // 关闭状态悬停背景色
    },

    // 日期选择器
    DatePicker: {
      controlHeight: designTokens.size.md,
      cellActiveWithRangeBg: designTokens.primary[50],
    },

    // 分页
    Pagination: {
      itemActiveBg: designTokens.primary[600],
      itemBg: 'var(--color-bg-elevated)',
      itemInputBg: 'var(--color-bg-elevated)',
    },

    // 面包屑
    Breadcrumb: {
      itemColor: designTokens.gray[500],
      lastItemColor: designTokens.gray[800],
      linkColor: designTokens.gray[500],
      linkHoverColor: designTokens.primary[600],
      separatorColor: designTokens.gray[300],
    },

    // 菜单
    Menu: {
      itemBg: 'transparent',
      subMenuItemBg: 'transparent',
      itemSelectedBg: designTokens.primary[50],
      itemSelectedColor: designTokens.primary[600],
      itemHoverBg: 'var(--color-bg-sunken)',
      itemHoverColor: 'var(--color-text-primary)',
      itemActiveBg: designTokens.primary[100],
      horizontalItemSelectedColor: designTokens.primary[600],
    },

    // 表单
    Form: {
      labelColor: 'var(--color-text-primary)',
      labelFontSize: designTokens.fontSize.sm,
      verticalLabelPadding: '0 0 8px',
    },

    // 警告提示
    Alert: {
      defaultPadding: '12px 16px',
      withDescriptionPadding: '16px 20px',
    },

    // 空状态
    Empty: {
      colorText: designTokens.gray[400],
      colorTextDisabled: designTokens.gray[300],
    },

    // 骨架屏
    Skeleton: {
      gradientFromColor: designTokens.gray[100],
      gradientToColor: designTokens.gray[200],
    },

    // 工具提示
    Tooltip: {
      colorBgSpotlight: designTokens.gray[800],
      colorTextLightSolid: '#ffffff',
      borderRadius: designTokens.radius.sm,
    },

    // 气泡确认框
    Popconfirm: {
      zIndexPopup: 1060,
    },

    // 步骤条
    Steps: {
      colorPrimary: designTokens.primary[600],
      navArrowColor: designTokens.gray[300],
    },

    // 统计数值
    Statistic: {
      titleFontSize: designTokens.fontSize.sm,
      contentFontSize: designTokens.fontSize['2xl'],
    },

    // 描述列表
    Descriptions: {
      labelBg: 'var(--color-bg-sunken)',
      titleColor: 'var(--color-text-primary)',
      contentColor: 'var(--color-text-secondary)',
    },

    // 时间轴
    Timeline: {
      dotBg: 'var(--color-bg-elevated)',
      dotBorderWidth: 2,
      itemPaddingBottom: 20,
    },

    // 树形控件
    Tree: {
      nodeHoverBg: 'var(--color-bg-sunken)',
      nodeSelectedBg: designTokens.primary[50],
    },

    // 上传
    Upload: {
      colorFillAlter: 'var(--color-bg-sunken)',
    },

    // 评分
    Rate: {
      starColor: '#facc15',
      starSize: 20,
    },
  },
};

/**
 * 导出设计令牌供其他组件使用
 *
 * 注意：深色模式不再需要单独的 darkAntTheme
 * CSS Variables 会自动处理颜色切换
 */
export default antTheme;
