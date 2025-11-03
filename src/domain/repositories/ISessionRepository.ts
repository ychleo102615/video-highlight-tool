/**
 * ISessionRepository - 會話生命週期管理介面
 *
 * 職責:
 * - 管理整個會話的生命週期(創建、恢復、清除)
 * - 確保跨多個 Entity 的操作具有原子性
 *
 * 設計理由:
 * - 原有的 IVideoRepository、ITranscriptRepository、IHighlightRepository
 *   各自負責單一 Entity，不適合處理跨 Entity 的原子性操作
 * - ISessionRepository 作為高層次抽象，協調多個 Repository
 */
export interface ISessionRepository {
  /**
   * 刪除所有會話資料
   *
   * 包含:
   * - 所有 Video Entities (videos Object Store)
   * - 所有 Transcript Entities (transcripts Object Store)
   * - 所有 Highlight Entities (highlights Object Store)
   *
   * 原子性保證:
   * - 透過 IndexedDB Transaction 包裝所有刪除操作
   * - 如果任何刪除失敗，整個 Transaction 回滾
   * - Transaction 模式: readwrite
   *
   * 錯誤處理:
   * - IndexedDB 連線失敗 → 拋出 SessionCleanupError
   * - Transaction 失敗 → 拋出 SessionCleanupError
   * - Object Store clear() 失敗 → Transaction 自動回滾，拋出 SessionCleanupError
   *
   * 效能:
   * - 預期執行時間: < 1s
   * - 並行執行三個 clear() 操作
   *
   * @throws SessionCleanupError 當任何刪除操作失敗時
   */
  deleteAllSessionData(): Promise<void>;

  /**
   * 檢查是否存在會話資料
   *
   * 用途:
   * 1. App.vue 啟動時判斷是否需要恢復會話
   * 2. 編輯畫面判斷資料是否已被刪除(防止「上一頁」錯誤)
   *
   * 檢查邏輯:
   * - 只檢查 videos Object Store 的 count
   * - 如果有 video，必然有對應的 transcript 和 highlight(資料完整性約束)
   *
   * 錯誤處理:
   * - IndexedDB 連線失敗 → 返回 false(安全選擇)
   * - count() 失敗 → 返回 false(安全選擇)
   * - 不拋出錯誤，僅記錄警告
   *
   * @returns true 如果存在任何會話資料
   */
  hasSessionData(): Promise<boolean>;
}
