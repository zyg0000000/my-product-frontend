/**
 * 统一日志工具
 * 开发环境输出到控制台，生产环境可选择上报到监控服务
 */

// 预留类型定义，用于未来集成监控服务
// type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private isDev = import.meta.env.DEV;

  /**
   * 普通日志
   */
  log(...args: any[]) {
    if (this.isDev) {
      console.log(...args);
    }
  }

  /**
   * 信息日志
   */
  info(...args: any[]) {
    if (this.isDev) {
      console.info(...args);
    }
  }

  /**
   * 警告日志
   */
  warn(...args: any[]) {
    if (this.isDev) {
      console.warn(...args);
    }
    // 生产环境可以上报警告到监控服务
    // TODO: 集成监控服务后取消注释
    // this.reportToMonitoring('warn', args);
  }

  /**
   * 错误日志
   */
  error(...args: any[]) {
    if (this.isDev) {
      console.error(...args);
    }
    // 生产环境上报错误到监控服务
    // TODO: 集成监控服务后取消注释
    // this.reportToMonitoring('error', args);
  }

  /**
   * 调试日志
   */
  debug(...args: any[]) {
    if (this.isDev) {
      console.debug(...args);
    }
  }

  /**
   * 上报到监控服务（预留）
   * 未来集成错误监控服务（Sentry、阿里云日志等）时使用
   * @private
   */
  /*
  private reportToMonitoring(level: LogLevel, args: any[]) {
    if (import.meta.env.PROD) {
      // Sentry.captureMessage(JSON.stringify(args), level);
    }
  }
  */
}

export const logger = new Logger();
