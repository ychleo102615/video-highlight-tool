/**
 * useNotification Composable
 *
 * 統一管理全局通知（成功、錯誤、警告、資訊）
 * 封裝 Naive UI 的 useNotification API
 */

import { useNotification as useNaiveNotification } from 'naive-ui';

export interface UseNotificationReturn {
  /**
   * 顯示成功通知
   * @param title 標題
   * @param content 內容（可選）
   * @param duration 持續時間（毫秒，預設 3000）
   */
  success: (title: string, content?: string, duration?: number) => void;

  /**
   * 顯示錯誤通知
   * @param title 標題
   * @param content 內容（可選）
   * @param duration 持續時間（毫秒，預設 4500）
   */
  error: (title: string, content?: string, duration?: number) => void;

  /**
   * 顯示警告通知
   * @param title 標題
   * @param content 內容（可選）
   * @param duration 持續時間（毫秒，預設 3000）
   */
  warning: (title: string, content?: string, duration?: number) => void;

  /**
   * 顯示資訊通知
   * @param title 標題
   * @param content 內容（可選）
   * @param duration 持續時間（毫秒，預設 3000）
   */
  info: (title: string, content?: string, duration?: number) => void;
}

export function useNotification(): UseNotificationReturn {
  const notification = useNaiveNotification();

  function success(title: string, content?: string, duration = 3000) {
    notification.success({
      title,
      content,
      duration,
      keepAliveOnHover: true
    });
  }

  function error(title: string, content?: string, duration = 4500) {
    notification.error({
      title,
      content,
      duration,
      keepAliveOnHover: true
    });
  }

  function warning(title: string, content?: string, duration = 3000) {
    notification.warning({
      title,
      content,
      duration,
      keepAliveOnHover: true
    });
  }

  function info(title: string, content?: string, duration = 3000) {
    notification.info({
      title,
      content,
      duration,
      keepAliveOnHover: true
    });
  }

  return {
    success,
    error,
    warning,
    info
  };
}
