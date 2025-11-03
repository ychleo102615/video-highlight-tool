/**
 * ISessionRepository Contract Definition
 *
 * 此檔案定義 ISessionRepository 的完整型別合約，
 * 用於確保 Domain Layer 和 Infrastructure Layer 的介面一致性。
 *
 * Version: 1.0.0
 * Feature: 006-session-cleanup
 */

/**
 * ISessionRepository - 會話生命週期管理介面
 *
 * 職責：
 * - 管理整個會話的生命週期（創建、恢復、清除）
 * - 確保跨多個 Entity 的操作具有原子性
 *
 * 實作要求：
 * - 必須透過 IndexedDB Transaction 確保原子性
 * - 必須處理所有可能的錯誤情境
 * - 必須確保資料完整性（無殘留資料）
 */
export interface ISessionRepository {
  /**
   * 刪除所有會話資料
   *
   * 包含：
   * - 所有 Video Entities (videos Object Store)
   * - 所有 Transcript Entities (transcripts Object Store)
   * - 所有 Highlight Entities (highlights Object Store)
   *
   * 原子性保證：
   * - 透過 IndexedDB Transaction 包裝所有刪除操作
   * - 如果任何刪除失敗，整個 Transaction 回滾
   * - Transaction 模式：readwrite
   *
   * 錯誤處理：
   * - IndexedDB 連線失敗 → 拋出 SessionCleanupError
   * - Transaction 失敗 → 拋出 SessionCleanupError
   * - Object Store clear() 失敗 → Transaction 自動回滾，拋出 SessionCleanupError
   *
   * 效能：
   * - 預期執行時間：< 1s（規格要求）
   * - 並行執行三個 clear() 操作
   *
   * @throws {SessionCleanupError} 當任何刪除操作失敗時
   *
   * @example
   * ```typescript
   * try {
   *   await sessionRepo.deleteAllSessionData();
   *   console.log('Session data deleted successfully');
   * } catch (error) {
   *   if (error instanceof SessionCleanupError) {
   *     console.error('Failed to cleanup:', error.message);
   *     // 保留 pendingCleanup 標記，下次重試
   *   }
   * }
   * ```
   */
  deleteAllSessionData(): Promise<void>;

  /**
   * 檢查是否存在會話資料
   *
   * 用途：
   * 1. App.vue 啟動時判斷是否需要恢復會話
   * 2. 編輯畫面判斷資料是否已被刪除（防止「上一頁」錯誤）
   *
   * 檢查邏輯：
   * - 只檢查 videos Object Store 的 count
   * - 如果有 video，必然有對應的 transcript 和 highlight（資料完整性約束）
   *
   * 錯誤處理：
   * - IndexedDB 連線失敗 → 返回 false（安全選擇）
   * - count() 失敗 → 返回 false（安全選擇）
   * - 不拋出錯誤，僅記錄警告
   *
   * @returns {Promise<boolean>} true 如果存在任何會話資料
   *
   * @example
   * ```typescript
   * const hasData = await sessionRepo.hasSessionData();
   * if (hasData) {
   *   // 恢復會話
   *   const session = await restoreSessionUseCase.execute();
   * } else {
   *   // 顯示上傳畫面
   *   router.push('/upload');
   * }
   * ```
   */
  hasSessionData(): Promise<boolean>;
}

/**
 * SessionCleanupError - 會話清除失敗錯誤
 *
 * 繼承自 ApplicationError，用於標識會話清除相關的錯誤。
 *
 * 觸發情境：
 * - IndexedDB 連線失敗
 * - Transaction 建立失敗
 * - Object Store clear() 失敗
 *
 * 錯誤資訊：
 * - message: 使用者友好的錯誤訊息
 * - cause: 原始錯誤物件（用於除錯）
 */
export class SessionCleanupError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SessionCleanupError';
  }
}

/**
 * Implementation Guidelines (實作指南)
 *
 * 1. Transaction 管理：
 *    - 必須在 Transaction 完成前等待 tx.done
 *    - 使用 Promise.all 並行執行三個 clear()
 *    - 不手動 commit，讓 Transaction 自動完成
 *
 * 2. 錯誤處理：
 *    - 捕獲所有 IndexedDB 錯誤並轉換為 SessionCleanupError
 *    - 保留原始錯誤作為 cause（方便除錯）
 *    - hasSessionData() 失敗時返回 false（不拋出錯誤）
 *
 * 3. 資料完整性：
 *    - 確保三個 Object Store 同時清除
 *    - 不允許部分清除（原子性）
 *    - 清除後驗證 count 為 0（可選，用於測試）
 *
 * 4. 效能優化：
 *    - 使用 Promise.all 並行執行 clear()
 *    - 避免逐個等待（串行執行）
 *    - 目標：< 1s 完成
 *
 * 5. 測試要點：
 *    - ✅ 成功刪除所有資料
 *    - ✅ Transaction 失敗時回滾
 *    - ✅ 連線失敗時拋出錯誤
 *    - ✅ hasSessionData() 正確判斷
 *    - ✅ 部分刪除失敗時回滾（原子性測試）
 */

/**
 * Usage Example in Use Case
 *
 * ```typescript
 * // application/use-cases/CleanupSessionUseCase.ts
 * export class CleanupSessionUseCase {
 *   constructor(private sessionRepo: ISessionRepository) {}
 *
 *   async execute(): Promise<void> {
 *     try {
 *       // 1. 刪除 IndexedDB 資料
 *       await this.sessionRepo.deleteAllSessionData();
 *
 *       // 2. 清除 SessionStorage
 *       sessionStorage.removeItem('sessionId');
 *       sessionStorage.removeItem('pendingCleanup');
 *
 *     } catch (error) {
 *       if (error instanceof SessionCleanupError) {
 *         // 處理清除失敗
 *         throw error;
 *       }
 *       throw new SessionCleanupError('Unexpected error during cleanup', { cause: error });
 *     }
 *   }
 * }
 * ```
 */

/**
 * Usage Example in Infrastructure Layer
 *
 * ```typescript
 * // infrastructure/repositories/SessionRepositoryImpl.ts
 * export class SessionRepositoryImpl implements ISessionRepository {
 *   constructor(private storage: BrowserStorage) {}
 *
 *   async deleteAllSessionData(): Promise<void> {
 *     try {
 *       const db = await this.storage.getDatabase();
 *       const tx = db.transaction(['videos', 'transcripts', 'highlights'], 'readwrite');
 *
 *       await Promise.all([
 *         tx.objectStore('videos').clear(),
 *         tx.objectStore('transcripts').clear(),
 *         tx.objectStore('highlights').clear(),
 *         tx.done
 *       ]);
 *     } catch (error) {
 *       throw new SessionCleanupError('Failed to delete session data', { cause: error });
 *     }
 *   }
 *
 *   async hasSessionData(): Promise<boolean> {
 *     try {
 *       const db = await this.storage.getDatabase();
 *       const count = await db.count('videos');
 *       return count > 0;
 *     } catch (error) {
 *       console.warn('Failed to check session data:', error);
 *       return false;
 *     }
 *   }
 * }
 * ```
 */
