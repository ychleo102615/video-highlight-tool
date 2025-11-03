/**
 * Session Cleanup Error
 *
 * 會話清除失敗錯誤
 */

import { ApplicationError } from './ApplicationError';

/**
 * SessionCleanupError - 會話清除失敗錯誤
 *
 * 觸發情境:
 * - IndexedDB 刪除操作失敗(如 Transaction 失敗)
 * - 資料庫連線異常
 *
 * 處理建議:
 * - 顯示錯誤訊息給使用者
 * - 保留 `pendingCleanup` 標記，下次啟動時重試
 */
export class SessionCleanupError extends ApplicationError {
  /**
   * 原始錯誤(用於除錯)
   */
  public readonly cause?: Error;

  /**
   * 建立 SessionCleanupError
   *
   * @param message - 錯誤訊息
   * @param options - 錯誤選項，可包含原始錯誤(cause)
   */
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, 'SESSION_CLEANUP_ERROR');
    this.name = 'SessionCleanupError';

    // 保留原始錯誤作為 cause
    if (options?.cause instanceof Error) {
      this.cause = options.cause;
    }

    // 確保原型鏈正確
    Object.setPrototypeOf(this, SessionCleanupError.prototype);
  }
}
