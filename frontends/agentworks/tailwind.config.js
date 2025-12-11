/**
 * AgentWorks Tailwind CSS Configuration
 *
 * 设计系统集成:
 * - 所有颜色、间距、圆角、阴影引用 CSS Variables
 * - 确保与设计令牌系统保持同步
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // 使用 class 策略控制深色模式（通过 JS 添加 .dark 类）
  darkMode: 'class',
  theme: {
    extend: {
      /* ========================================
         颜色系统 - 引用 CSS Variables
         ======================================== */
      colors: {
        // 主色调 - Deep Indigo
        primary: {
          50:  'var(--aw-primary-50)',
          100: 'var(--aw-primary-100)',
          200: 'var(--aw-primary-200)',
          300: 'var(--aw-primary-300)',
          400: 'var(--aw-primary-400)',
          500: 'var(--aw-primary-500)',
          600: 'var(--aw-primary-600)',
          700: 'var(--aw-primary-700)',
          800: 'var(--aw-primary-800)',
          900: 'var(--aw-primary-900)',
          950: 'var(--aw-primary-950)',
        },

        // 成功色
        success: {
          50:  'var(--aw-success-50)',
          100: 'var(--aw-success-100)',
          200: 'var(--aw-success-200)',
          500: 'var(--aw-success-500)',
          600: 'var(--aw-success-600)',
          700: 'var(--aw-success-700)',
        },

        // 警告色
        warning: {
          50:  'var(--aw-warning-50)',
          100: 'var(--aw-warning-100)',
          200: 'var(--aw-warning-200)',
          500: 'var(--aw-warning-500)',
          600: 'var(--aw-warning-600)',
          700: 'var(--aw-warning-700)',
        },

        // 危险色
        danger: {
          50:  'var(--aw-danger-50)',
          100: 'var(--aw-danger-100)',
          200: 'var(--aw-danger-200)',
          500: 'var(--aw-danger-500)',
          600: 'var(--aw-danger-600)',
          700: 'var(--aw-danger-700)',
        },

        // 信息色
        info: {
          50:  'var(--aw-info-50)',
          100: 'var(--aw-info-100)',
          200: 'var(--aw-info-200)',
          500: 'var(--aw-info-500)',
          600: 'var(--aw-info-600)',
          700: 'var(--aw-info-700)',
        },

        // 中性灰
        gray: {
          50:  'var(--aw-gray-50)',
          100: 'var(--aw-gray-100)',
          200: 'var(--aw-gray-200)',
          300: 'var(--aw-gray-300)',
          400: 'var(--aw-gray-400)',
          500: 'var(--aw-gray-500)',
          600: 'var(--aw-gray-600)',
          700: 'var(--aw-gray-700)',
          800: 'var(--aw-gray-800)',
          900: 'var(--aw-gray-900)',
          950: 'var(--aw-gray-950)',
        },

        // 指标专用色
        metric: {
          blue:   'var(--aw-metric-blue)',
          green:  'var(--aw-metric-green)',
          red:    'var(--aw-metric-red)',
          orange: 'var(--aw-metric-orange)',
          purple: 'var(--aw-metric-purple)',
          cyan:   'var(--aw-metric-cyan)',
          pink:   'var(--aw-metric-pink)',
        },
      },

      /* ========================================
         字体系统
         ======================================== */
      fontFamily: {
        display: 'var(--aw-font-display)',
        body:    'var(--aw-font-body)',
        sans:    'var(--aw-font-body)',
        mono:    'var(--aw-font-mono)',
      },

      fontSize: {
        xs:   ['var(--aw-text-xs)',   { lineHeight: 'var(--aw-leading-normal)' }],
        sm:   ['var(--aw-text-sm)',   { lineHeight: 'var(--aw-leading-normal)' }],
        base: ['var(--aw-text-base)', { lineHeight: 'var(--aw-leading-normal)' }],
        md:   ['var(--aw-text-md)',   { lineHeight: 'var(--aw-leading-normal)' }],
        lg:   ['var(--aw-text-lg)',   { lineHeight: 'var(--aw-leading-snug)' }],
        xl:   ['var(--aw-text-xl)',   { lineHeight: 'var(--aw-leading-snug)' }],
        '2xl': ['var(--aw-text-2xl)', { lineHeight: 'var(--aw-leading-tight)' }],
        '3xl': ['var(--aw-text-3xl)', { lineHeight: 'var(--aw-leading-tight)' }],
        '4xl': ['var(--aw-text-4xl)', { lineHeight: 'var(--aw-leading-none)' }],
        '5xl': ['var(--aw-text-5xl)', { lineHeight: 'var(--aw-leading-none)' }],
      },

      /* ========================================
         间距系统
         ======================================== */
      spacing: {
        'px':  'var(--aw-space-px)',
        '0.5': 'var(--aw-space-0-5)',
        '1':   'var(--aw-space-1)',
        '1.5': 'var(--aw-space-1-5)',
        '2':   'var(--aw-space-2)',
        '2.5': 'var(--aw-space-2-5)',
        '3':   'var(--aw-space-3)',
        '3.5': 'var(--aw-space-3-5)',
        '4':   'var(--aw-space-4)',
        '5':   'var(--aw-space-5)',
        '6':   'var(--aw-space-6)',
        '7':   'var(--aw-space-7)',
        '8':   'var(--aw-space-8)',
        '9':   'var(--aw-space-9)',
        '10':  'var(--aw-space-10)',
        '11':  'var(--aw-space-11)',
        '12':  'var(--aw-space-12)',
        '14':  'var(--aw-space-14)',
        '16':  'var(--aw-space-16)',
        '20':  'var(--aw-space-20)',
        '24':  'var(--aw-space-24)',
        '28':  'var(--aw-space-28)',
        '32':  'var(--aw-space-32)',
      },

      /* ========================================
         圆角系统
         ======================================== */
      borderRadius: {
        'none': 'var(--aw-radius-none)',
        'sm':   'var(--aw-radius-sm)',
        DEFAULT: 'var(--aw-radius-md)',
        'md':   'var(--aw-radius-md)',
        'lg':   'var(--aw-radius-lg)',
        'xl':   'var(--aw-radius-xl)',
        '2xl':  'var(--aw-radius-2xl)',
        '3xl':  'var(--aw-radius-3xl)',
        'full': 'var(--aw-radius-full)',
      },

      /* ========================================
         阴影系统
         ======================================== */
      boxShadow: {
        'none':      'var(--aw-shadow-none)',
        'xs':        'var(--aw-shadow-xs)',
        'sm':        'var(--aw-shadow-sm)',
        DEFAULT:     'var(--aw-shadow-md)',
        'md':        'var(--aw-shadow-md)',
        'lg':        'var(--aw-shadow-lg)',
        'xl':        'var(--aw-shadow-xl)',
        '2xl':       'var(--aw-shadow-2xl)',
        'card':      'var(--aw-shadow-card)',
        'card-hover': 'var(--aw-shadow-card-hover)',
        'soft':      'var(--aw-shadow-soft)',
        'dropdown':  'var(--aw-shadow-dropdown)',
        'modal':     'var(--aw-shadow-modal)',
        'focus':     'var(--aw-shadow-focus)',
        'glow':      'var(--aw-shadow-glow)',
        'inset':     'var(--aw-shadow-inset)',
        'primary':   'var(--aw-shadow-primary)',
        'success':   'var(--aw-shadow-success)',
        'danger':    'var(--aw-shadow-danger)',
      },

      /* ========================================
         过渡系统
         ======================================== */
      transitionTimingFunction: {
        'default': 'var(--aw-ease-default)',
        'in':      'var(--aw-ease-in)',
        'out':     'var(--aw-ease-out)',
        'in-out':  'var(--aw-ease-in-out)',
        'bounce':  'var(--aw-ease-bounce)',
        'spring':  'var(--aw-ease-spring)',
      },

      transitionDuration: {
        'instant': 'var(--aw-duration-instant)',
        'fast':    'var(--aw-duration-fast)',
        'normal':  'var(--aw-duration-normal)',
        'medium':  'var(--aw-duration-medium)',
        'slow':    'var(--aw-duration-slow)',
        'slower':  'var(--aw-duration-slower)',
      },

      /* ========================================
         最大宽度
         ======================================== */
      maxWidth: {
        'xs':    'var(--aw-max-width-xs)',
        'sm':    'var(--aw-max-width-sm)',
        'md':    'var(--aw-max-width-md)',
        'lg':    'var(--aw-max-width-lg)',
        'xl':    'var(--aw-max-width-xl)',
        '2xl':   'var(--aw-max-width-2xl)',
        '3xl':   'var(--aw-max-width-3xl)',
        '4xl':   'var(--aw-max-width-4xl)',
        '5xl':   'var(--aw-max-width-5xl)',
        '6xl':   'var(--aw-max-width-6xl)',
        '7xl':   'var(--aw-max-width-7xl)',
        'full':  'var(--aw-max-width-full)',
        'prose': 'var(--aw-max-width-prose)',
      },

      /* ========================================
         组件高度
         ======================================== */
      height: {
        'btn-xs': 'var(--aw-size-xs)',
        'btn-sm': 'var(--aw-size-sm)',
        'btn':    'var(--aw-size-md)',
        'btn-lg': 'var(--aw-size-lg)',
        'btn-xl': 'var(--aw-size-xl)',
      },

      /* ========================================
         动画
         ======================================== */
      animation: {
        'fade-in':       'aw-fade-in var(--aw-duration-normal) var(--aw-ease-out)',
        'fade-out':      'aw-fade-out var(--aw-duration-normal) var(--aw-ease-in)',
        'slide-in-top':  'aw-slide-in-top var(--aw-duration-medium) var(--aw-ease-out)',
        'slide-in-bottom': 'aw-slide-in-bottom var(--aw-duration-medium) var(--aw-ease-out)',
        'slide-in-left': 'aw-slide-in-left var(--aw-duration-medium) var(--aw-ease-out)',
        'slide-in-right': 'aw-slide-in-right var(--aw-duration-medium) var(--aw-ease-out)',
        'scale-in':      'aw-scale-in var(--aw-duration-normal) var(--aw-ease-out)',
        'bounce-in':     'aw-bounce-in var(--aw-duration-slow) var(--aw-ease-bounce)',
        'pulse':         'aw-pulse 2s var(--aw-ease-in-out) infinite',
        'spin':          'aw-spin 1s linear infinite',
        'shake':         'aw-shake var(--aw-duration-slow) var(--aw-ease-default)',
        'bounce':        'aw-bounce 1s var(--aw-ease-bounce) infinite',
      },
    },
  },
  plugins: [],
};
