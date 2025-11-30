/**
 * 请求取消 Hook
 * 用于在组件中管理 API 请求的生命周期
 */

import { useRef, useEffect, useCallback } from 'react';

/**
 * useAbortController - 单个请求取消
 *
 * 自动在组件卸载时取消未完成的请求，防止内存泄漏和状态更新警告
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const getSignal = useAbortController();
 *   const [data, setData] = useState(null);
 *
 *   useEffect(() => {
 *     const fetchData = async () => {
 *       try {
 *         const result = await get('/api/data', {}, { signal: getSignal() });
 *         setData(result);
 *       } catch (err) {
 *         if (err.message !== '请求已取消') {
 *           console.error(err);
 *         }
 *       }
 *     };
 *     fetchData();
 *   }, [getSignal]);
 *
 *   return <div>{data}</div>;
 * }
 * ```
 */
export function useAbortController(): () => AbortSignal {
  const controllerRef = useRef<AbortController | null>(null);

  // 组件卸载时取消请求
  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort('组件已卸载');
      }
    };
  }, []);

  // 获取新的 signal，同时取消之前的请求
  const getSignal = useCallback((): AbortSignal => {
    // 取消之前的请求
    if (controllerRef.current) {
      controllerRef.current.abort('被新请求替代');
    }

    // 创建新的 controller
    controllerRef.current = new AbortController();
    return controllerRef.current.signal;
  }, []);

  return getSignal;
}

/**
 * useRequestManager - 多请求取消管理
 *
 * 用于管理组件内多个并发请求的取消
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { getSignal, cancelAll } = useRequestManager();
 *
 *   const loadData = async () => {
 *     // 同时发起多个请求
 *     const [users, posts] = await Promise.all([
 *       get('/api/users', {}, { signal: getSignal('users') }),
 *       get('/api/posts', {}, { signal: getSignal('posts') }),
 *     ]);
 *     // ...
 *   };
 *
 *   // 手动取消所有请求
 *   const handleCancel = () => cancelAll();
 *
 *   return <button onClick={handleCancel}>取消</button>;
 * }
 * ```
 */
export function useRequestManager(): {
  getSignal: (key: string) => AbortSignal;
  cancel: (key: string) => void;
  cancelAll: () => void;
} {
  const controllersRef = useRef<Map<string, AbortController>>(new Map());

  // 组件卸载时取消所有请求
  useEffect(() => {
    const controllers = controllersRef.current;
    return () => {
      controllers.forEach(controller => {
        controller.abort('组件已卸载');
      });
      controllers.clear();
    };
  }, []);

  const getSignal = useCallback((key: string): AbortSignal => {
    const controllers = controllersRef.current;

    // 取消该 key 之前的请求
    const existing = controllers.get(key);
    if (existing) {
      existing.abort('被新请求替代');
    }

    // 创建新的 controller
    const controller = new AbortController();
    controllers.set(key, controller);

    return controller.signal;
  }, []);

  const cancel = useCallback((key: string): void => {
    const controllers = controllersRef.current;
    const controller = controllers.get(key);
    if (controller) {
      controller.abort('请求已取消');
      controllers.delete(key);
    }
  }, []);

  const cancelAll = useCallback((): void => {
    const controllers = controllersRef.current;
    controllers.forEach(controller => {
      controller.abort('所有请求已取消');
    });
    controllers.clear();
  }, []);

  return { getSignal, cancel, cancelAll };
}

/**
 * 判断错误是否为请求取消错误
 * 用于在 catch 中过滤取消错误
 *
 * @example
 * ```ts
 * try {
 *   await fetchData({ signal });
 * } catch (err) {
 *   if (!isAbortError(err)) {
 *     message.error('加载失败');
 *   }
 * }
 * ```
 */
export function isAbortError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.name === 'AbortError' ||
      error.message === '请求已取消' ||
      error.message === '组件已卸载' ||
      error.message === '被新请求替代' ||
      error.message === '所有请求已取消' ||
      error.message === '请求超时'
    );
  }
  return false;
}
