/**
 * 主题上下文
 * 提供深色/浅色模式切换功能
 *
 * @version 1.0.0
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  /** 当前主题 */
  theme: ThemeMode;
  /** 是否为深色模式 */
  isDark: boolean;
  /** 切换主题 */
  toggleTheme: () => void;
  /** 设置指定主题 */
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'agentworks_theme';

/**
 * 主题提供者组件
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // 从 localStorage 读取保存的主题，默认浅色
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved as ThemeMode) || 'light';
  });

  // 应用主题到 DOM
  useEffect(() => {
    const root = document.documentElement;

    // 设置 data-theme 属性（用于 CSS Variables）
    root.setAttribute('data-theme', theme);

    // 设置 class（用于 Tailwind dark: 前缀）
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // 保存到 localStorage
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  // 切换主题
  const toggleTheme = useCallback(() => {
    setThemeState(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // 设置指定主题
  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      toggleTheme,
      setTheme,
    }),
    [theme, toggleTheme, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/**
 * 使用主题的 Hook
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
