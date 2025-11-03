/**
 * Session Repository Implementation
 *
 * 職責:
 * - 實作 ISessionRepository 介面
 * - 管理整個會話的生命週期(創建、恢復、清除)
 * - 透過 BrowserStorage 確保跨多個 Entity 的操作具有原子性
 *
 * 實作 Domain Layer 的 ISessionRepository 介面
 */

import type { ISessionRepository } from '@/domain/repositories/ISessionRepository';
import { BrowserStorage } from '../storage/BrowserStorage';
import { SessionCleanupError } from '@/application/errors/SessionCleanupError';

/**
 * Session Repository 實作
 *
 * 設計原則:
 * - 所有 IndexedDB 操作透過 BrowserStorage 進行
 * - 不直接操作 db，保持封裝性
 * - Transaction 的原子性由 BrowserStorage 保證
 */
export class SessionRepositoryImpl implements ISessionRepository {
  /**
   * 建構函式 - 注入依賴
   * @param browserStorage - BrowserStorage 實例(由 DI Container 注入)
   */
  constructor(private browserStorage: BrowserStorage) {}

  /**
   * 刪除所有會話資料(實作 ISessionRepository 介面)
   *
   * 包含:
   * - 所有 Video Entities
   * - 所有 Transcript Entities
   * - 所有 Highlight Entities
   *
   * 原子性保證:
   * - 透過 BrowserStorage.deleteAllSessionData() 使用 Transaction
   * - 如果任何刪除失敗，整個 Transaction 回滾
   *
   * @throws SessionCleanupError 當刪除失敗時
   */
  async deleteAllSessionData(): Promise<void> {
    try {
      await this.browserStorage.deleteAllSessionData();
    } catch (error) {
      throw new SessionCleanupError('Failed to delete session data from IndexedDB', {
        cause: error
      });
    }
  }

  /**
   * 檢查是否存在會話資料(實作 ISessionRepository 介面)
   *
   * 檢查邏輯:
   * - 透過 BrowserStorage.hasSessionData() 檢查 videos Object Store
   * - 如果有 video，必然有對應的 transcript 和 highlight
   *
   * 錯誤處理:
   * - 檢查失敗時返回 false(安全選擇)
   * - 不拋出錯誤，僅記錄警告
   *
   * @returns true 如果存在任何會話資料
   */
  async hasSessionData(): Promise<boolean> {
    return await this.browserStorage.hasSessionData();
  }
}
