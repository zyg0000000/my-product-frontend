/**
 * AgentWorks - Ant Design 主题配置
 *
 * 与设计系统令牌保持同步
 * 引用 CSS Variables 需要在 JS 中使用具体值
 *
 * 设计令牌来源：src/design-system/tokens/
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
    // 中性色
    // ========================================
    colorTextBase: designTokens.gray[800],
    colorText: designTokens.gray[700],
    colorTextSecondary: designTokens.gray[500],
    colorTextTertiary: designTokens.gray[400],
    colorTextQuaternary: designTokens.gray[300],

    colorBgBase: '#ffffff',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgLayout: designTokens.gray[50],
    colorBgSpotlight: designTokens.gray[100],

    colorBorder: designTokens.gray[200],
    colorBorderSecondary: designTokens.gray[100],

    colorFill: designTokens.gray[100],
    colorFillSecondary: designTokens.gray[50],
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
      defaultBorderColor: designTokens.gray[200],
      defaultColor: designTokens.gray[700],
      defaultBg: '#ffffff',
      defaultHoverBg: designTokens.gray[50],
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
    },

    // 选择器
    Select: {
      controlHeight: designTokens.size.md,
      controlHeightLG: designTokens.size.lg,
      controlHeightSM: designTokens.size.sm,
      optionSelectedBg: designTokens.primary[50],
      optionActiveBg: designTokens.gray[50],
    },

    // 表格
    Table: {
      headerBg: designTokens.gray[50],
      headerColor: designTokens.gray[700],
      headerSortActiveBg: designTokens.gray[100],
      headerSortHoverBg: designTokens.gray[100],
      rowHoverBg: designTokens.gray[50],
      borderColor: designTokens.gray[200],
      headerBorderRadius: designTokens.radius.md,
      cellPaddingBlock: 12,
      cellPaddingInline: 16,
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
    },

    // 标签页
    Tabs: {
      inkBarColor: designTokens.primary[600],
      itemActiveColor: designTokens.primary[600],
      itemSelectedColor: designTokens.primary[600],
      itemHoverColor: designTokens.primary[500],
      cardBg: designTokens.gray[50],
      horizontalItemPadding: '12px 16px',
    },

    // 模态框
    Modal: {
      borderRadiusLG: designTokens.radius.xl,
      headerBg: 'transparent',
      contentBg: '#ffffff',
      titleFontSize: designTokens.fontSize.xl,
      paddingLG: 24,
    },

    // 抽屉
    Drawer: {
      paddingLG: 24,
    },

    // 标签
    Tag: {
      borderRadiusSM: designTokens.radius.sm,
      defaultBg: designTokens.gray[50],
      defaultColor: designTokens.gray[600],
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
      controlItemBgHover: designTokens.gray[50],
      controlItemBgActive: designTokens.primary[50],
    },

    // 消息提示
    Message: {
      contentBg: '#ffffff',
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
    },

    // 日期选择器
    DatePicker: {
      controlHeight: designTokens.size.md,
      cellActiveWithRangeBg: designTokens.primary[50],
    },

    // 分页
    Pagination: {
      itemActiveBg: designTokens.primary[600],
      itemBg: '#ffffff',
      itemInputBg: '#ffffff',
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
      itemHoverBg: designTokens.gray[50],
      itemHoverColor: designTokens.gray[800],
      itemActiveBg: designTokens.primary[100],
      horizontalItemSelectedColor: designTokens.primary[600],
    },

    // 表单
    Form: {
      labelColor: designTokens.gray[700],
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
      labelBg: designTokens.gray[50],
      titleColor: designTokens.gray[800],
      contentColor: designTokens.gray[600],
    },

    // 时间轴
    Timeline: {
      dotBg: '#ffffff',
      dotBorderWidth: 2,
      itemPaddingBottom: 20,
    },

    // 树形控件
    Tree: {
      nodeHoverBg: designTokens.gray[50],
      nodeSelectedBg: designTokens.primary[50],
    },

    // 上传
    Upload: {
      colorFillAlter: designTokens.gray[50],
    },

    // 评分
    Rate: {
      starColor: '#facc15',
      starSize: 20,
    },
  },
};

/**
 * 深色模式设计令牌
 */
export const darkDesignTokens = {
  gray: {
    50: '#0f172a',
    100: '#1e293b',
    200: '#334155',
    300: '#475569',
    400: '#64748b',
    500: '#94a3b8',
    600: '#cbd5e1',
    700: '#e2e8f0',
    800: '#f1f5f9',
    900: '#f8fafc',
    950: '#ffffff',
  },
  primary: {
    ...designTokens.primary,
    500: '#818cf8',
    600: '#6366f1',
  },
} as const;

/**
 * Ant Design 深色主题配置
 */
export const darkAntTheme: ThemeConfig = {
  token: {
    // 品牌色（深色模式稍微提亮）
    colorPrimary: darkDesignTokens.primary[600],
    colorLink: darkDesignTokens.primary[500],
    colorLinkHover: darkDesignTokens.primary[600],
    colorLinkActive: darkDesignTokens.primary[700],

    // 功能色
    colorSuccess: designTokens.success[500],
    colorWarning: designTokens.warning[500],
    colorError: designTokens.danger[500],
    colorInfo: designTokens.info[500],

    // 文字色（反转）
    colorTextBase: darkDesignTokens.gray[900],
    colorText: darkDesignTokens.gray[800],
    colorTextSecondary: darkDesignTokens.gray[600],
    colorTextTertiary: darkDesignTokens.gray[500],
    colorTextQuaternary: darkDesignTokens.gray[400],

    // 背景色（深色）
    colorBgBase: darkDesignTokens.gray[50],
    colorBgContainer: darkDesignTokens.gray[100],
    colorBgElevated: darkDesignTokens.gray[200],
    colorBgLayout: darkDesignTokens.gray[50],
    colorBgSpotlight: darkDesignTokens.gray[200],

    // 边框色
    colorBorder: darkDesignTokens.gray[300],
    colorBorderSecondary: darkDesignTokens.gray[200],

    // 填充色
    colorFill: darkDesignTokens.gray[200],
    colorFillSecondary: darkDesignTokens.gray[100],
    colorFillTertiary: 'rgba(255, 255, 255, 0.08)',
    colorFillQuaternary: 'rgba(255, 255, 255, 0.04)',

    // 圆角（保持一致）
    borderRadius: designTokens.radius.md,
    borderRadiusLG: designTokens.radius.lg,
    borderRadiusSM: designTokens.radius.sm,
    borderRadiusXS: 4,

    // 字体（保持一致）
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

    // 行高
    lineHeight: 1.6,
    lineHeightLG: 1.5,
    lineHeightSM: 1.5,

    // 控件尺寸
    controlHeight: designTokens.size.md,
    controlHeightLG: designTokens.size.lg,
    controlHeightSM: designTokens.size.sm,

    // 间距
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

    // 阴影（深色模式使用更深的阴影）
    boxShadow:
      '0 1px 2px 0 rgba(0, 0, 0, 0.3), 0 1px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px 0 rgba(0, 0, 0, 0.3)',
    boxShadowSecondary:
      '0 6px 16px 0 rgba(0, 0, 0, 0.4), 0 3px 6px -4px rgba(0, 0, 0, 0.4), 0 9px 28px 8px rgba(0, 0, 0, 0.25)',

    // 动效
    motionDurationFast: '0.1s',
    motionDurationMid: '0.2s',
    motionDurationSlow: '0.3s',
    motionEaseInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    motionEaseOut: 'cubic-bezier(0, 0, 0.2, 1)',
  },

  // 组件级别配置
  components: {
    Button: {
      primaryShadow: '0 2px 8px rgba(99, 102, 241, 0.4)',
      defaultBg: darkDesignTokens.gray[200],
      defaultBorderColor: darkDesignTokens.gray[300],
    },

    Input: {
      activeBorderColor: darkDesignTokens.primary[500],
      hoverBorderColor: darkDesignTokens.primary[400],
      colorBgContainer: darkDesignTokens.gray[100],
    },

    Select: {
      optionSelectedBg: 'rgba(99, 102, 241, 0.2)',
      colorBgContainer: darkDesignTokens.gray[100],
    },

    Table: {
      headerBg: darkDesignTokens.gray[200],
      rowHoverBg: darkDesignTokens.gray[200],
      borderColor: darkDesignTokens.gray[300],
    },

    Card: {
      colorBgContainer: darkDesignTokens.gray[100],
    },

    Modal: {
      contentBg: darkDesignTokens.gray[100],
      headerBg: darkDesignTokens.gray[100],
    },

    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: 'rgba(99, 102, 241, 0.15)',
      itemHoverBg: darkDesignTokens.gray[200],
      darkItemBg: darkDesignTokens.gray[50],
      darkItemSelectedBg: 'rgba(99, 102, 241, 0.2)',
    },

    Tabs: {
      itemSelectedColor: darkDesignTokens.primary[500],
      inkBarColor: darkDesignTokens.primary[500],
    },

    Tag: {
      defaultBg: darkDesignTokens.gray[200],
      defaultColor: darkDesignTokens.gray[700],
    },

    Tooltip: {
      colorBgSpotlight: darkDesignTokens.gray[200],
      colorTextLightSolid: darkDesignTokens.gray[900],
    },
  },
};

/**
 * 导出设计令牌供其他组件使用
 */
export default antTheme;
