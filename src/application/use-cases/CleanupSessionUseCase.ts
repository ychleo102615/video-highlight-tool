/**
 * CleanupSessionUseCase - 會話清除 Use Case
 *
 * 職責:
 * - 協調 ISessionRepository 執行會話清除
 * - 清除 SessionStorage 中的標記
 * - 提供統一的錯誤處理
 *
 * 呼叫時機:
 * 1. 使用者手動點擊「刪除此會話」按鈕(立即執行)
 * 2. 應用啟動時檢測到 `pendingCleanup` 標記(延遲執行)
 *
 * 注意事項:
 * - Use Case 不知道 Store 的存在(單向依賴)
 * - Store 在 Use Case 執行後自行清除狀態
 * - Use Case 執行時間 < 1s(規格要求)
 */

import type { ISessionRepository } from '@/domain/repositories/ISessionRepository';
import { SessionCleanupError } from '@/application/errors/SessionCleanupError';

export class CleanupSessionUseCase {
  constructor(private sessionRepo: ISessionRepository) {}

  /**
   * 執行會話清除
   *
   * 清除內容:
   * 1. IndexedDB: videos, transcripts, highlights Object Store
   * 2. SessionStorage: sessionId, pendingCleanup, isClosing
   *
   * 執行流程:
   * 1. 呼叫 sessionRepo.deleteAllSessionData()(原子性刪除)
   * 2. 清除 SessionStorage(即使失敗也不影響主流程)
   * 3. 返回成功或拋出錯誤
   *
   * 錯誤處理:
   * - IndexedDB 刪除失敗 → 拋出 SessionCleanupError
   * - SessionStorage 清除失敗 → 僅記錄警告(不拋出錯誤)
   *
   * 效能要求:
   * - 執行時間 < 1s(規格 SC-002)
   *
   * @throws SessionCleanupError 當 IndexedDB 刪除失敗時
   */
  async execute(): Promise<void> {
    try {
      // 1. 刪除 IndexedDB 資料(原子性操作)
      await this.sessionRepo.deleteAllSessionData();

      // 2. 清除 SessionStorage(即使失敗也不影響主流程)
      try {
        sessionStorage.removeItem('sessionId');
        sessionStorage.removeItem('pendingCleanup');
        sessionStorage.removeItem('isClosing');
      } catch (error) {
        // SessionStorage 清除失敗不影響主流程
        console.warn('Failed to clear SessionStorage:', error);
      }
    } catch (error) {
      // 如果已是 SessionCleanupError，直接拋出
      if (error instanceof SessionCleanupError) {
        throw error;
      }
      // 否則包裝為 SessionCleanupError
      throw new SessionCleanupError('Failed to cleanup session data', { cause: error });
    }
  }
}
