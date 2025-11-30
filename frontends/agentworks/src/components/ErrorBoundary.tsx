/**
 * 全局错误边界组件
 * 捕获组件树中的 JavaScript 错误，防止整个应用崩溃
 */

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { logger } from '../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 记录错误信息
    logger.error('Error caught by ErrorBoundary:', error, errorInfo);

    // 保存错误信息到状态
    this.setState({
      errorInfo,
    });

    // 生产环境可以上报到监控服务
    // if (import.meta.env.PROD) {
    //   reportErrorToService(error, errorInfo);
    // }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
    });
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误页面
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
            {/* 错误图标 */}
            <div className="mb-4">
              <svg
                className="mx-auto h-16 w-16 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* 错误标题 */}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              页面出现错误
            </h1>

            {/* 错误描述 */}
            <p className="text-gray-600 mb-6">
              抱歉，页面遇到了一些问题。请尝试刷新页面，如果问题仍然存在，请联系技术支持。
            </p>

            {/* 开发环境显示错误详情 */}
            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-left">
                <div className="text-sm font-mono text-red-800 mb-2">
                  <strong>错误信息:</strong> {this.state.error.message}
                </div>
                {this.state.error.stack && (
                  <div className="text-xs font-mono text-red-700 overflow-x-auto">
                    <pre>{this.state.error.stack}</pre>
                  </div>
                )}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                重试
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                刷新页面
              </button>
            </div>

            {/* 返回首页 */}
            <div className="mt-4">
              <a
                href="/"
                className="text-sm text-primary-600 hover:text-primary-800 hover:underline"
              >
                返回首页
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
